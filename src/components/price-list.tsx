import type { ReactNode } from "react";

export function ColumnHeader({
	children,
	bordered = true,
}: {
	children: ReactNode;
	bordered?: boolean;
}) {
	return (
		<h2
			className={`mb-3 text-base font-semibold tracking-tight text-foreground/50 ${bordered ? "border-b border-black/10 pb-2 dark:border-white/10" : ""}`}
		>
			{children}
		</h2>
	);
}

export function formatPrice(value: number | null): string {
	if (value == null || Number.isNaN(value)) {
		return "—";
	}
	return new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}

export function formatChangePercent(value: number | null): string {
	if (value == null || Number.isNaN(value)) {
		return "—";
	}

	const sign = value > 0 ? "+" : value < 0 ? "−" : "";
	return `${sign}${Math.abs(value).toFixed(2)}%`;
}

const changeColumnClass =
	"w-[3.5rem] shrink-0 text-right tabular-nums";

function changeColorClass(changePercent: number | null): string {
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

type PriceRowProps = {
	label: string;
	price: number | null;
	changePercent: number | null;
	isPending?: boolean;
	isError?: boolean;
};

export function PriceRow({
	label,
	price,
	changePercent,
	isPending = false,
	isError = false,
}: PriceRowProps) {
	const muted = isPending || isError;
	const changeColor = muted ? "" : changeColorClass(changePercent);

	return (
		<div
			className={`flex items-center justify-between py-1.5 ${muted ? "text-muted-foreground" : ""}`}
		>
			<span className="font-medium">{label}</span>
			<span
				className={`inline-flex gap-3 ${isPending ? "" : "items-baseline tabular-nums"}`}
			>
				{isPending ? (
					<>
						<span className="inline-block h-4 w-10 animate-pulse rounded bg-black/10 dark:bg-white/10" />
						<span
							className={`inline-block h-4 animate-pulse rounded bg-black/10 dark:bg-white/10 ${changeColumnClass}`}
						/>
					</>
				) : (
					<>
						<span className="text-right">
							{isError ? "—" : formatPrice(price)}
						</span>
						<span className={`${changeColumnClass} ${changeColor}`}>
							{isError ? "—" : formatChangePercent(changePercent)}
						</span>
					</>
				)}
			</span>
		</div>
	);
}
