"use client";

import { useQuery } from "@tanstack/react-query";
import { PriceRow } from "./price-list";

const SYMBOLS = ["BTC", "ETH", "SOL"] as const;

const COIN_IDS = {
	BTC: "bitcoin",
	ETH: "ethereum",
	SOL: "solana",
} as const;

type Symbol = (typeof SYMBOLS)[number];

type CryptoRowData = {
	symbol: Symbol;
	price: number | null;
	changePercent: number | null;
	marketCap: number | null;
};

type CoinGeckoPriceResponse = Record<
	string,
	{
		usd?: number;
		usd_24h_change?: number;
		usd_market_cap?: number;
	}
>;

async function fetchCryptoPrices(): Promise<CryptoRowData[]> {
	const ids = Object.values(COIN_IDS).join(",");
	const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error("Failed to load crypto prices");
	}

	const json = (await response.json()) as CoinGeckoPriceResponse;

	return SYMBOLS.map((symbol) => {
		const quote = json[COIN_IDS[symbol]];
		return {
			symbol,
			price: typeof quote?.usd === "number" && !Number.isNaN(quote.usd) ? quote.usd : null,
			changePercent:
				typeof quote?.usd_24h_change === "number" && !Number.isNaN(quote.usd_24h_change)
					? quote.usd_24h_change
					: null,
			marketCap: typeof quote?.usd_market_cap === "number" && !Number.isNaN(quote.usd_market_cap) ? quote.usd_market_cap : null,
		};
	});
}

export function CryptoPrices() {
	const { data, isPending, isError } = useQuery({
		queryKey: ["crypto"],
		queryFn: fetchCryptoPrices,
	});

	return (
		<div>
			{SYMBOLS.map((symbol) => {
				const row = data?.find((item) => item.symbol === symbol);
				return (
					<PriceRow
						key={symbol}
						label={symbol}
						price={row?.price ?? null}
						changePercent={row?.changePercent ?? null}
						marketCap={row?.marketCap ?? null}
						isPending={isPending}
						isError={isError}
					/>
				);
			})}
		</div>
	);
}
