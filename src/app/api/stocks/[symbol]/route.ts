import { NextResponse } from "next/server";

type YahooChartResponse = {
	chart?: {
		result?: Array<{
			meta?: {
				symbol?: string;
				regularMarketPrice?: number;
				previousClose?: number;
			};
		}>;
		error?: unknown;
	};
};

export async function GET(
	_request: Request,
	context: { params: Promise<{ symbol?: string }> },
) {
	const symbol = (await context.params).symbol;

	if (!symbol) {
		return NextResponse.json(
			{ error: "Missing symbol parameter" },
			{ status: 400 },
		);
	}

	const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;

	try {
		const response = await fetch(yahooUrl, {
			headers: {
				Accept: "application/json",
			},
			// Cache to reduce upstream 429s after deploy.
			cache: "force-cache",
			next: { revalidate: 300 },
		});

		if (!response.ok) {
			return NextResponse.json(
				{ error: `Upstream error: ${response.status}` },
				{ status: 502 },
			);
		}

		const json = (await response.json()) as YahooChartResponse;
		const meta = json.chart?.result?.[0]?.meta;

		const price =
			typeof meta?.regularMarketPrice === "number"
				? meta.regularMarketPrice
				: null;
		const previousClose =
			typeof meta?.previousClose === "number" ? meta.previousClose : null;

		let changePercent: number | null = null;
		if (price != null && previousClose != null && previousClose !== 0) {
			changePercent = ((price - previousClose) / previousClose) * 100;
		}

		return NextResponse.json(
			{
				symbol: symbol.toUpperCase(),
				price,
				changePercent,
			},
			{
				headers: {
					// Let edge/CDN cache this too (if supported by runtime).
					"Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
				},
			},
		);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to fetch stock data";
		return NextResponse.json({ error: message }, { status: 502 });
	}
}

