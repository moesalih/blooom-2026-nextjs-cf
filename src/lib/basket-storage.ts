export type BasketPositionType = "stock" | "crypto";

export type BasketAccount = {
	id: string;
	name: string;
};

export type BasketPosition = {
	id: string;
	accountId: string;
	type: BasketPositionType;
	symbol: string;
	amount: number;
};

export type BasketData = {
	accounts: BasketAccount[];
	positions: BasketPosition[];
	updatedAt: number | null;
};

const STORAGE_KEY = "blooom-basket";
const DEFAULT_ACCOUNT_NAME = "Main";

const EMPTY_BASKET: BasketData = {
	accounts: [],
	positions: [],
	updatedAt: null,
};

function isValidType(value: unknown): value is BasketPositionType {
	return value === "stock" || value === "crypto";
}

function isValidAccount(value: unknown): value is BasketAccount {
	if (value == null || typeof value !== "object") {
		return false;
	}

	const account = value as Partial<BasketAccount>;
	return typeof account.id === "string" && typeof account.name === "string";
}

function isValidPosition(value: unknown): value is BasketPosition {
	if (value == null || typeof value !== "object") {
		return false;
	}

	const position = value as Partial<BasketPosition> & {
		type?: unknown;
		accountId?: unknown;
	};

	if (
		typeof position.id !== "string" ||
		typeof position.symbol !== "string" ||
		typeof position.amount !== "number" ||
		!Number.isFinite(position.amount)
	) {
		return false;
	}

	// accountId may be missing on legacy rows; normalize later.
	if (position.accountId != null && typeof position.accountId !== "string") {
		return false;
	}

	// Legacy positions without type default to stock.
	if (position.type == null) {
		return true;
	}

	return isValidType(position.type);
}

export function createId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** @deprecated Use createId */
export const createPositionId = createId;

/**
 * Drop accounts that no longer have positions.
 * Keeps storage tidy after deletes / moves.
 */
export function pruneAccounts(
	accounts: BasketAccount[],
	positions: BasketPosition[],
): BasketAccount[] {
	const used = new Set(positions.map((position) => position.accountId));
	return accounts.filter((account) => used.has(account.id));
}

function normalizeBasket(parsed: Partial<BasketData>): BasketData {
	const rawPositions = Array.isArray(parsed.positions)
		? parsed.positions.filter(isValidPosition)
		: [];

	let accounts = Array.isArray(parsed.accounts)
		? parsed.accounts.filter(isValidAccount).map((account) => ({
				id: account.id,
				name: account.name.trim() || DEFAULT_ACCOUNT_NAME,
			}))
		: [];

	// Legacy data: positions without accountId → attach to a default account.
	const needsDefaultAccount = rawPositions.some(
		(position) => typeof position.accountId !== "string" || !position.accountId,
	);

	if (needsDefaultAccount && accounts.length === 0) {
		accounts = [{ id: createId(), name: DEFAULT_ACCOUNT_NAME }];
	}

	const fallbackAccountId = accounts[0]?.id ?? createId();
	if (needsDefaultAccount && !accounts.some((a) => a.id === fallbackAccountId)) {
		accounts = [{ id: fallbackAccountId, name: DEFAULT_ACCOUNT_NAME }, ...accounts];
	}

	const accountIds = new Set(accounts.map((account) => account.id));

	const positions: BasketPosition[] = rawPositions.map((position) => {
		const accountId =
			typeof position.accountId === "string" && accountIds.has(position.accountId)
				? position.accountId
				: fallbackAccountId;

		return {
			id: position.id,
			accountId,
			type: isValidType(position.type) ? position.type : "stock",
			symbol: position.symbol,
			amount: position.amount,
		};
	});

	// If we still have positions pointing at missing accounts, create stubs.
	const missingAccountIds = new Set(
		positions
			.map((position) => position.accountId)
			.filter((id) => !accountIds.has(id)),
	);

	for (const id of missingAccountIds) {
		accounts.push({ id, name: DEFAULT_ACCOUNT_NAME });
		accountIds.add(id);
	}

	const updatedAt =
		typeof parsed.updatedAt === "number" && Number.isFinite(parsed.updatedAt)
			? parsed.updatedAt
			: null;

	return {
		accounts: pruneAccounts(accounts, positions),
		positions,
		updatedAt,
	};
}

export function loadBasket(): BasketData {
	if (typeof window === "undefined") {
		return EMPTY_BASKET;
	}

	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return EMPTY_BASKET;
		}

		const parsed = JSON.parse(raw) as Partial<BasketData>;
		return normalizeBasket(parsed);
	} catch {
		return EMPTY_BASKET;
	}
}

export function saveBasket(data: BasketData): void {
	if (typeof window === "undefined") {
		return;
	}

	const accounts = pruneAccounts(data.accounts, data.positions);
	window.localStorage.setItem(
		STORAGE_KEY,
		JSON.stringify({
			accounts,
			positions: data.positions,
			updatedAt: data.updatedAt,
		} satisfies BasketData),
	);
}

export function findAccountByName(
	accounts: BasketAccount[],
	name: string,
): BasketAccount | undefined {
	const normalized = name.trim().toLowerCase();
	return accounts.find((account) => account.name.trim().toLowerCase() === normalized);
}
