"use client";

import { useQuery } from "@tanstack/react-query";
import { PriceRow } from "./price-list";

export const INDEX_SYMBOLS = ["SPY", "QQQ", "SOXL"] as const;
export const STOCK_SYMBOLS = [
	"NVDA",
	"AAPL",
	"MSFT",
	"AMZN",
	"GOOGL",
	"TSLA",
	"META",
] as const;

type StockRowData = {
	symbol: string;
	price: number | null;
	changePercent: number | null;
};

async function fetchStock(symbol: string): Promise<StockRowData> {
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

function StockRow({ symbol }: { symbol: string }) {
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

export function StockPrices({ symbols }: { symbols: readonly string[] }) {
	return (
		<div>
			{symbols.map((symbol) => (
				<StockRow key={symbol} symbol={symbol} />
			))}
		</div>
	);
}
