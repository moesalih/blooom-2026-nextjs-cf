export function changeColorClass(changePercent: number | null): string {
	if (changePercent == null) {
		return "text-muted-foreground";
	}
	if (changePercent > 0) {
		return "text-emerald-500";
	}
	if (changePercent < 0) {
		return "text-red-500";
	}
	return "text-muted-foreground";
}

export function sortByNumericDesc(a: number | null, b: number | null) {
	if (a == null && b == null) return 0;
	if (a == null) return 1;
	if (b == null) return -1;
	return b - a;
}

/** Convert a USD value into portfolio currency for display. */
export function formatPortfolioValue(
	usdValue: number | null,
	rate: number | null,
	currencySymbol: string,
): string {
	if (
		usdValue == null ||
		rate == null ||
		Number.isNaN(usdValue) ||
		Number.isNaN(rate)
	) {
		return "—";
	}

	const converted = usdValue * rate;
	const code = currencySymbol.trim().toUpperCase() || "USD";

	try {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: code,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(converted);
	} catch {
		return `${code} ${converted.toLocaleString("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})}`;
	}
}
