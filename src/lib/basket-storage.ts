export type BasketPositionType = "stock" | "crypto";

export type BasketPosition = {
	id: string;
	type: BasketPositionType;
	symbol: string;
	amount: number;
};

export type BasketData = {
	positions: BasketPosition[];
	updatedAt: number | null;
};

const STORAGE_KEY = "blooom-basket";

const EMPTY_BASKET: BasketData = {
	positions: [],
	updatedAt: null,
};

function isValidType(value: unknown): value is BasketPositionType {
	return value === "stock" || value === "crypto";
}

function isValidPosition(value: unknown): value is BasketPosition {
	if (value == null || typeof value !== "object") {
		return false;
	}

	const position = value as Partial<BasketPosition> & { type?: unknown };

	if (
		typeof position.id !== "string" ||
		typeof position.symbol !== "string" ||
		typeof position.amount !== "number" ||
		!Number.isFinite(position.amount)
	) {
		return false;
	}

	// Legacy positions without type default to stock.
	if (position.type == null) {
		return true;
	}

	return isValidType(position.type);
}

function normalizePosition(value: BasketPosition): BasketPosition {
	return {
		id: value.id,
		type: isValidType(value.type) ? value.type : "stock",
		symbol: value.symbol,
		amount: value.amount,
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
		const positions = Array.isArray(parsed.positions)
			? parsed.positions.filter(isValidPosition).map(normalizePosition)
			: [];
		const updatedAt =
			typeof parsed.updatedAt === "number" && Number.isFinite(parsed.updatedAt)
				? parsed.updatedAt
				: null;

		return { positions, updatedAt };
	} catch {
		return EMPTY_BASKET;
	}
}

export function saveBasket(data: BasketData): void {
	if (typeof window === "undefined") {
		return;
	}

	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function createPositionId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
