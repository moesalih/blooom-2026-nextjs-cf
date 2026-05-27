"use client";

import { useQuery } from "@tanstack/react-query";

const SYMBOLS = ["SPY", "NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "TSLA", "META"] as const;

type Symbol = (typeof SYMBOLS)[number];

type StockRowData = {
	symbol: Symbol;
	price: number | null;
	changePercent: number | null;
};

async function fetchStock(symbol: Symbol): Promise<StockRowData> {
	const response = await fetch(`/api/stocks/${encodeURIComponent(symbol)}`);

	if (!response.ok) {
		throw new Error("Failed to load stock price");
	}

	const json = (await response.json()) as {
		symbol?: string;
		price?: number | null;
		changePercent?: number | null;
	};

	return {
		symbol,
		price:
			typeof json.price === "number" && !Number.isNaN(json.price)
				? json.price
				: null,
		changePercent:
			typeof json.changePercent === "number" && !Number.isNaN(json.changePercent)
				? json.changePercent
				: null,
	};
}

function formatPrice(value: number | null): string {
	if (value == null || Number.isNaN(value)) {
		return "—";
	}
	return value.toFixed(2);
}

function formatChangePercent(value: number | null): string {
	if (value == null || Number.isNaN(value)) {
		return "—";
	}

	const sign = value > 0 ? "+" : value < 0 ? "−" : "";
	return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function StockRow({ symbol }: { symbol: Symbol }) {
	const { data, isPending, isError } = useQuery({
		queryKey: ["stock", symbol],
		queryFn: () => fetchStock(symbol),
	});

	const price = data?.price ?? null;
	const changePercent = data?.changePercent ?? null;

	const changeColor =
		changePercent == null
			? "text-muted-foreground"
			: changePercent > 0
				? "text-emerald-500"
				: changePercent < 0
					? "text-red-500"
					: "text-muted-foreground";

	if (isPending) {
		return (
			<div className="flex items-center justify-between py-1.5 text-sm text-muted-foreground">
				<span className="font-medium">{symbol}</span>
				<span className="inline-flex gap-3">
					<span className="inline-block h-4 w-10 animate-pulse rounded bg-black/10 dark:bg-white/10" />
					<span className="inline-block h-4 w-12 animate-pulse rounded bg-black/10 dark:bg-white/10" />
				</span>
			</div>
		);
	}

	if (isError) {
		return (
			<div className="flex items-center justify-between py-1.5 text-sm text-muted-foreground">
				<span className="font-medium">{symbol}</span>
				<span className="inline-flex gap-3">
					<span>—</span>
					<span>—</span>
				</span>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-between py-1.5 text-sm">
			<span className="font-medium">{symbol}</span>
			<span className="inline-flex items-baseline gap-3 tabular-nums">
				<span className="text-right">{formatPrice(price)}</span>
				<span className={changeColor}>{formatChangePercent(changePercent)}</span>
			</span>
		</div>
	);
}

export function StockPrices() {
	return (
		<section className="rounded-lg border border-black/10 bg-muted/40 px-4 py-3 text-sm shadow-sm dark:border-white/10">
			<h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
				Stocks
			</h2>
			<div>
				{SYMBOLS.map((symbol) => (
					<StockRow key={symbol} symbol={symbol} />
				))}
			</div>
		</section>
	);
}

