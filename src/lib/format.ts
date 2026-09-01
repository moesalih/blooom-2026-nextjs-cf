export function formatPrice(value: number | null): string {
	if (value == null || Number.isNaN(value)) {
		return "—";
	}
	return new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}
