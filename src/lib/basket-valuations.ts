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

			return {
				account,
				rows,
				total: sumValues(rows),
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
		groups.push({
			account: {
				id: sortedOrphans[0].position.accountId,
				name:
					accountById.get(sortedOrphans[0].position.accountId)?.name ??
					"Account",
			},
			rows: sortedOrphans,
			total: sumValues(sortedOrphans),
		});
		groups.sort((a, b) => sortByNumericDesc(a.total, b.total));
	}

	return groups;
}

export function sumPortfolioTotal(positionRows: PositionRow[]): number | null {
	return sumValues(positionRows);
}
