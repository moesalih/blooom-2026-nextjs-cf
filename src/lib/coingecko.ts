export type CryptoQuote = {
	symbol: string;
	price: number | null;
	changePercent: number | null;
};

/** Common ticker → CoinGecko id map for reliable lookups without search. */
const COMMON_COIN_IDS: Record<string, string> = {
	BTC: "bitcoin",
	ETH: "ethereum",
	SOL: "solana",
	BNB: "binancecoin",
	XRP: "ripple",
	ADA: "cardano",
	DOGE: "dogecoin",
	DOT: "polkadot",
	AVAX: "avalanche-2",
	MATIC: "matic-network",
	POL: "polygon-ecosystem-token",
	LINK: "chainlink",
	UNI: "uniswap",
	ATOM: "cosmos",
	LTC: "litecoin",
	BCH: "bitcoin-cash",
	NEAR: "near",
	APT: "aptos",
	ARB: "arbitrum",
	OP: "optimism",
	SUI: "sui",
	PEPE: "pepe",
	SHIB: "shiba-inu",
	TRX: "tron",
	TON: "the-open-network",
	XLM: "stellar",
	HBAR: "hedera-hashgraph",
	ICP: "internet-computer",
	FIL: "filecoin",
	AAVE: "aave",
	MKR: "maker",
	CRV: "curve-dao-token",
	INJ: "injective-protocol",
	SEI: "sei-network",
	TIA: "celestia",
	WIF: "dogwifcoin",
	BONK: "bonk",
	RENDER: "render-token",
	FET: "fetch-ai",
	TAO: "bittensor",
};

type CoinGeckoSearchCoin = {
	id?: string;
	symbol?: string;
	market_cap_rank?: number | null;
};

type CoinGeckoSearchResponse = {
	coins?: CoinGeckoSearchCoin[];
};

type CoinGeckoPriceResponse = Record<
	string,
	{
		usd?: number;
		usd_24h_change?: number;
	}
>;

async function resolveCoinId(symbol: string): Promise<string | null> {
	const upper = symbol.trim().toUpperCase();
	if (!upper) {
		return null;
	}

	const known = COMMON_COIN_IDS[upper];
	if (known) {
		return known;
	}

	const searchUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(upper)}`;
	const response = await fetch(searchUrl, {
		headers: { Accept: "application/json" },
	});

	if (!response.ok) {
		throw new Error("Failed to search crypto symbol");
	}

	const json = (await response.json()) as CoinGeckoSearchResponse;
	const matches = (json.coins ?? []).filter(
		(coin) => coin.symbol?.toUpperCase() === upper && typeof coin.id === "string",
	);

	if (matches.length === 0) {
		return null;
	}

	matches.sort((a, b) => {
		const rankA = a.market_cap_rank ?? Number.POSITIVE_INFINITY;
		const rankB = b.market_cap_rank ?? Number.POSITIVE_INFINITY;
		return rankA - rankB;
	});

	return matches[0]?.id ?? null;
}

export async function fetchCryptoQuote(symbol: string): Promise<CryptoQuote> {
	const upper = symbol.trim().toUpperCase();
	const coinId = await resolveCoinId(upper);

	if (!coinId) {
		throw new Error(`Unknown crypto symbol: ${upper}`);
	}

	const priceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=usd&include_24hr_change=true`;
	const response = await fetch(priceUrl, {
		headers: { Accept: "application/json" },
	});

	if (!response.ok) {
		throw new Error("Failed to load crypto price");
	}

	const json = (await response.json()) as CoinGeckoPriceResponse;
	const quote = json[coinId];

	return {
		symbol: upper,
		price:
			typeof quote?.usd === "number" && !Number.isNaN(quote.usd)
				? quote.usd
				: null,
		changePercent:
			typeof quote?.usd_24h_change === "number" &&
			!Number.isNaN(quote.usd_24h_change)
				? quote.usd_24h_change
				: null,
	};
}
