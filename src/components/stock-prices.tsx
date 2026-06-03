"use client";

import { useQuery } from "@tanstack/react-query";
import { PriceRow } from "./price-list";

const SYMBOLS = ["SPY", "NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "TSLA", "META", "SOXL"] as const;

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

function StockRow({ symbol }: { symbol: Symbol }) {
	const { data, isPending, isError } = useQuery({
		queryKey: ["stock", symbol],
		queryFn: () => fetchStock(symbol),
	});

	return (
		<PriceRow
			label={symbol}
			price={data?.price ?? null}
			changePercent={data?.changePercent ?? null}
			isPending={isPending}
			isError={isError}
		/>
	);
}

export function StockPrices() {
	return (
		<div>
			{SYMBOLS.map((symbol) => (
				<StockRow key={symbol} symbol={symbol} />
			))}
		</div>
	);
}
