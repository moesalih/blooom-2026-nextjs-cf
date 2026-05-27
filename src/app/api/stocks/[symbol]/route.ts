import { NextResponse } from "next/server";

type StooqQuoteResponse = {
	symbols?: Array<{
		symbol?: string;
		previous?: number;
		close?: number;
	}>;
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

	const normalizedSymbol = symbol.includes(".")
		? symbol.toLowerCase()
		: `${symbol.toLowerCase()}.us`;
	const stooqUrl = `https://stooq.com/q/l/?s=${encodeURIComponent(normalizedSymbol)}&f=sd2t2pohlcv&e=json`;

	try {
		const response = await fetch(stooqUrl, {
			headers: {
				Accept: "application/json",
			},
			// Cache to reduce upstream 429s after deploy.
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

			// Helps debug upstream rate limits / payload shapes.
			console.error("[Stooq] Upstream error", {
				symbol,
				status: response.status,
				statusText: response.statusText,
				headers: {
					// Keep logs small; only include likely-relevant headers.
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

		const json = (await response.json()) as StooqQuoteResponse;
		const quote = json.symbols?.[0];
		const price = typeof quote?.close === "number" ? quote.close : null;
		const previousClose =
			typeof quote?.previous === "number" ? quote.previous : null;

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
		console.error("[Stooq] Fetch threw", { symbol, message });
		return NextResponse.json({ error: message }, { status: 502 });
	}
}

