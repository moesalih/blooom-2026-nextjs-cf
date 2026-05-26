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
			// Cache briefly to avoid hammering Yahoo when refreshing
			next: { revalidate: 30 },
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

		return NextResponse.json({
			symbol: symbol.toUpperCase(),
			price,
			changePercent,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to fetch stock data";
		return NextResponse.json({ error: message }, { status: 502 });
	}
}

