import { NextResponse } from "next/server";

const COIN_IDS = {
	BTC: "bitcoin",
	ETH: "ethereum",
	SOL: "solana",
} as const;

type Symbol = keyof typeof COIN_IDS;

type CoinGeckoPriceResponse = Record<
	string,
	{
		usd?: number;
		usd_24h_change?: number;
	}
>;

export async function GET() {
	const ids = Object.values(COIN_IDS).join(",");
	const coingeckoUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

	try {
		const response = await fetch(coingeckoUrl, {
			headers: {
				Accept: "application/json",
			},
			cache: "force-cache",
			next: { revalidate: 300 },
		});

		if (!response.ok) {
			let bodyText: string | undefined;
			try {
				bodyText = await response.text();
			} catch {
				// ignore: best-effort debug logging only
			}

			console.error("[CoinGecko] Upstream error", {
				status: response.status,
				statusText: response.statusText,
				headers: {
					"retry-after": response.headers.get("retry-after"),
					"content-type": response.headers.get("content-type"),
				},
				body: bodyText ? bodyText.slice(0, 800) : undefined,
			});

			return NextResponse.json(
				{ error: `Upstream error: ${response.status}` },
				{ status: 502 },
			);
		}

		const json = (await response.json()) as CoinGeckoPriceResponse;

		const prices = (Object.keys(COIN_IDS) as Symbol[]).map((symbol) => {
			const coinId = COIN_IDS[symbol];
			const quote = json[coinId];
			const price = typeof quote?.usd === "number" ? quote.usd : null;
			const changePercent =
				typeof quote?.usd_24h_change === "number" ? quote.usd_24h_change : null;

			return { symbol, price, changePercent };
		});

		return NextResponse.json(
			{ prices },
			{
				headers: {
					"Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
				},
			},
		);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to fetch crypto data";
		console.error("[CoinGecko] Fetch threw", { message });
		return NextResponse.json({ error: message }, { status: 502 });
	}
}
