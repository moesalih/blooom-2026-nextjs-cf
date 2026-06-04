"use client";

import { useQuery } from "@tanstack/react-query";
import { PriceRow } from "./price-list";

export const INDEX_SYMBOLS = ["SPY", "QQQ", "SOXL"] as const;

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

type TopStockRowData = {
	symbol: string;
	name: string;
	price: number | null;
	changePercent: number | null;
	marketCap: number | null;
};

async function fetchTopStocks(): Promise<TopStockRowData[]> {
	const response = await fetch("/api/stocks/top-10");

	if (!response.ok) {
		throw new Error("Failed to load top stocks");
	}

	const json = (await response.json()) as Array<{
		symbol?: string;
		name?: string;
		price?: number | null;
		changePercent?: number | null;
		marketCap?: number | null;
	}>;

	if (!Array.isArray(json)) {
		throw new Error("Invalid top stocks response");
	}

	return json.map((item) => ({
		symbol: typeof item.symbol === "string" ? item.symbol : "",
		name: typeof item.name === "string" ? item.name : "",
		price:
			typeof item.price === "number" && !Number.isNaN(item.price)
				? item.price
				: null,
		changePercent:
			typeof item.changePercent === "number" &&
			!Number.isNaN(item.changePercent)
				? item.changePercent
				: null,
		marketCap:
			typeof item.marketCap === "number" && !Number.isNaN(item.marketCap)
				? item.marketCap
				: null,
	}));
}

const TOP_STOCK_SKELETON_COUNT = 10;

export function TopStockPrices() {
	const { data, isPending, isError } = useQuery({
		queryKey: ["stocks", "top-10"],
		queryFn: fetchTopStocks,
	});

	if (isPending && !data) {
		return (
			<div>
				{Array.from({ length: TOP_STOCK_SKELETON_COUNT }, (_, index) => (
					<PriceRow
						key={index}
						label=" "
						price={null}
						changePercent={null}
						marketCap={null}
						isPending
					/>
				))}
			</div>
		);
	}

	return (
		<div>
			{(data ?? []).map((row) => (
				<PriceRow
					key={row.symbol}
					label={row.symbol}
					price={row.price}
					changePercent={row.changePercent}
					marketCap={row.marketCap}
					isError={isError}
				/>
			))}
		</div>
	);
}
