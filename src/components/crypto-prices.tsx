"use client";

import { useQuery } from "@tanstack/react-query";
import { PriceListSection, PriceRow } from "./price-list";

const SYMBOLS = ["BTC", "ETH", "SOL"] as const;

type Symbol = (typeof SYMBOLS)[number];

type CryptoRowData = {
	symbol: Symbol;
	price: number | null;
	changePercent: number | null;
};

type CryptoApiResponse = {
	prices?: Array<{
		symbol?: string;
		price?: number | null;
		changePercent?: number | null;
	}>;
};

async function fetchCryptoPrices(): Promise<CryptoRowData[]> {
	const response = await fetch("/api/crypto");

	if (!response.ok) {
		throw new Error("Failed to load crypto prices");
	}

	const json = (await response.json()) as CryptoApiResponse;
	const bySymbol = new Map(
		(json.prices ?? []).map((row) => [row.symbol, row] as const),
	);

	return SYMBOLS.map((symbol) => {
		const row = bySymbol.get(symbol);
		return {
			symbol,
			price:
				typeof row?.price === "number" && !Number.isNaN(row.price)
					? row.price
					: null,
			changePercent:
				typeof row?.changePercent === "number" &&
				!Number.isNaN(row.changePercent)
					? row.changePercent
					: null,
		};
	});
}

export function CryptoPrices() {
	const { data, isPending, isError } = useQuery({
		queryKey: ["crypto"],
		queryFn: fetchCryptoPrices,
	});

	return (
		<PriceListSection title="Crypto">
			{SYMBOLS.map((symbol) => {
				const row = data?.find((item) => item.symbol === symbol);
				return (
					<PriceRow
						key={symbol}
						label={symbol}
						price={row?.price ?? null}
						changePercent={row?.changePercent ?? null}
						isPending={isPending}
						isError={isError}
					/>
				);
			})}
		</PriceListSection>
	);
}
