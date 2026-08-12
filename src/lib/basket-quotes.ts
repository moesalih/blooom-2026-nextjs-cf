import type { BasketPositionType } from "@/lib/basket-storage";
import { fetchCryptoQuote } from "@/lib/coingecko";

export type AssetQuote = {
	symbol: string;
	price: number | null;
	changePercent: number | null;
};

export function quoteKey(type: BasketPositionType, symbol: string): string {
	return `${type}:${symbol.toUpperCase()}`;
}

export async function fetchStockPrice(symbol: string): Promise<AssetQuote> {
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
			typeof json.changePercent === "number" &&
			!Number.isNaN(json.changePercent)
				? json.changePercent
				: null,
	};
}

export async function fetchAssetQuote(
	type: BasketPositionType,
	symbol: string,
): Promise<AssetQuote> {
	return type === "crypto"
		? fetchCryptoQuote(symbol)
		: fetchStockPrice(symbol);
}

/** API returns units of currency per 1 USD. USD is always 1. */
export async function fetchCurrencyRate(symbol: string): Promise<number> {
	const upper = symbol.trim().toUpperCase();
	if (upper === "USD") {
		return 1;
	}

	const response = await fetch(`/api/currency/${encodeURIComponent(upper)}`);

	if (!response.ok) {
		throw new Error("Failed to load currency rate");
	}

	const json = (await response.json()) as { price?: number | null };
	if (typeof json.price !== "number" || Number.isNaN(json.price)) {
		throw new Error("Invalid currency rate");
	}

	return json.price;
}
