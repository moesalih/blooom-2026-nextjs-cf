import type { BasketAccount, BasketPosition } from "@/lib/basket-storage";
import { quoteKey } from "@/lib/basket-quotes";
import { sortByNumericDesc } from "@/lib/basket-format";

export type QuoteLookup = {
	price: number | null;
	changePercent: number | null;
	isPending: boolean;
	isError: boolean;
};

export type PositionRow = {
	position: BasketPosition;
	price: number | null;
	changePercent: number | null;
	/** USD market value */
	value: number | null;
	/** USD day change (from previous close via change %) */
	changeValue: number | null;
	isPending: boolean;
	isError: boolean;
};

export type AccountGroup = {
	account: BasketAccount;
	rows: PositionRow[];
	/** USD account total */
	total: number | null;
	/** USD day P&L for the account */
	changeValue: number | null;
	/** Weighted day change % for the account */
	changePercent: number | null;
};

/** Day P&L in the same units as value, derived from change %. */
export function changeValueFromPercent(
	value: number | null,
	changePercent: number | null,
): number | null {
	if (value == null || changePercent == null) {
		return null;
	}
	if (!Number.isFinite(value) || !Number.isFinite(changePercent)) {
		return null;
	}

	const ratio = changePercent / 100;
	const previousFactor = 1 + ratio;
	if (previousFactor === 0) {
		return null;
	}

	return (value * ratio) / previousFactor;
}

/** Day change % from current value and day P&L, both in the same units. */
export function changePercentFromValue(
	currentValue: number | null,
	changeValue: number | null,
): number | null {
	if (currentValue == null || changeValue == null) {
		return null;
	}
	if (!Number.isFinite(currentValue) || !Number.isFinite(changeValue)) {
		return null;
	}

	const previous = currentValue - changeValue;
	if (previous === 0) {
		return null;
	}

	return (changeValue / previous) * 100;
}

/** Weighted day P&L and % from rows that have both a value and a change. */
export function aggregateChange(rows: PositionRow[]): {
	changeValue: number | null;
	changePercent: number | null;
} {
	let current = 0;
	let change = 0;
	let hasChange = false;

	for (const row of rows) {
		if (row.value != null && row.changeValue != null) {
			current += row.value;
			change += row.changeValue;
			hasChange = true;
		}
	}

	if (!hasChange) {
		return { changeValue: null, changePercent: null };
	}

	return {
		changeValue: change,
		changePercent: changePercentFromValue(current, change),
	};
}

export function buildPositionRows(
	positions: BasketPosition[],
	priceByKey: Map<string, QuoteLookup>,
): PositionRow[] {
	return positions.map((position) => {
		const quote = priceByKey.get(quoteKey(position.type, position.symbol));
		const price = quote?.price ?? null;
		const changePercent = quote?.changePercent ?? null;
		const value =
			price != null && Number.isFinite(position.amount)
				? price * position.amount
				: null;

		return {
			position,
			price,
			changePercent,
			value,
			changeValue: changeValueFromPercent(value, changePercent),
			isPending: quote?.isPending ?? false,
			isError: quote?.isError ?? false,
		};
	});
}

function sumValues(rows: PositionRow[]): number | null {
	let sum = 0;
	let hasValue = false;
	for (const row of rows) {
		if (row.value != null) {
			sum += row.value;
			hasValue = true;
		}
	}
	return hasValue ? sum : null;
}

export function buildAccountGroups(
	accounts: BasketAccount[],
	positionRows: PositionRow[],
): AccountGroup[] {
	const accountById = new Map(accounts.map((account) => [account.id, account]));

	const groups = accounts
		.map((account) => {
			const rows = positionRows
				.filter((row) => row.position.accountId === account.id)
				.sort((a, b) => sortByNumericDesc(a.value, b.value));
			const change = aggregateChange(rows);

			return {
				account,
				rows,
				total: sumValues(rows),
				changeValue: change.changeValue,
				changePercent: change.changePercent,
			};
		})
		.filter((group) => group.rows.length > 0)
		.sort((a, b) => sortByNumericDesc(a.total, b.total));

	// Positions whose account is missing still render under a fallback group.
	const knownIds = new Set(groups.map((group) => group.account.id));
	const orphanRows = positionRows.filter(
		(row) => !knownIds.has(row.position.accountId),
	);

	if (orphanRows.length > 0) {
		const sortedOrphans = orphanRows.sort((a, b) =>
			sortByNumericDesc(a.value, b.value),
		);
		const change = aggregateChange(sortedOrphans);
		groups.push({
			account: {
				id: sortedOrphans[0].position.accountId,
				name:
					accountById.get(sortedOrphans[0].position.accountId)?.name ??
					"Account",
			},
			rows: sortedOrphans,
			total: sumValues(sortedOrphans),
			changeValue: change.changeValue,
			changePercent: change.changePercent,
		});
		groups.sort((a, b) => sortByNumericDesc(a.total, b.total));
	}

	return groups;
}

export function sumPortfolioTotal(positionRows: PositionRow[]): number | null {
	return sumValues(positionRows);
}

/** Merge positions that share type + symbol, summing amounts and values. */
export function buildCombinedRows(positionRows: PositionRow[]): PositionRow[] {
	const grouped = new Map<string, PositionRow[]>();

	for (const row of positionRows) {
		const key = quoteKey(row.position.type, row.position.symbol);
		const existing = grouped.get(key);
		if (existing) {
			existing.push(row);
		} else {
			grouped.set(key, [row]);
		}
	}

	const combined: PositionRow[] = [];

	for (const [key, rows] of grouped) {
		const first = rows[0];
		const amount = rows.reduce((sum, row) => sum + row.position.amount, 0);
		const price = first.price;
		const value =
			price != null && Number.isFinite(amount) ? price * amount : sumValues(rows);

		combined.push({
			position: {
				id: `combined:${key}`,
				accountId: first.position.accountId,
				type: first.position.type,
				symbol: first.position.symbol,
				amount,
			},
			price,
			changePercent: first.changePercent,
			value,
			changeValue: changeValueFromPercent(value, first.changePercent),
			isPending: rows.some((row) => row.isPending),
			isError: rows.every((row) => row.isError),
		});
	}

	return combined.sort((a, b) => sortByNumericDesc(a.value, b.value));
}
