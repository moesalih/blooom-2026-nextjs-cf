import type { BasketPositionType } from "@/lib/basket-storage";

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

/** Share of the portfolio as a percentage, or null when it cannot be computed. */
export function portfolioShare(
	part: number | null,
	total: number | null,
): number | null {
	if (part == null || total == null || total === 0) {
		return null;
	}
	if (!Number.isFinite(part) || !Number.isFinite(total)) {
		return null;
	}
	return (part / total) * 100;
}

/** Tooltip text for 52-week high (stocks) or all-time high (crypto). */
export function formatHighPriceTooltip(
	type: BasketPositionType,
	highPrice: number | null,
	currentPrice: number | null,
): string | null {
	if (
		highPrice == null ||
		currentPrice == null ||
		!Number.isFinite(highPrice) ||
		!Number.isFinite(currentPrice) ||
		highPrice <= 0
	) {
		return null;
	}

	const label = type === "crypto" ? "ath" : "52wh";
	const highFormatted = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(highPrice);
	const downPercent = Math.max(
		0,
		((highPrice - currentPrice) / highPrice) * 100,
	);

	return `${label}: ${highFormatted} (down ${downPercent.toFixed(1)}%)`;
}

export function formatPortfolioPercent(value: number | null): string {
	if (value == null || Number.isNaN(value) || !Number.isFinite(value)) {
		return "—";
	}
	return `${value.toFixed(1)}%`;
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
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(converted);
	} catch {
		return `${code} ${converted.toLocaleString("en-US", {
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		})}`;
	}
}
