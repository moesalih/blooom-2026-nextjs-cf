import { type CnbcQuote, fetchCnbcQuote } from "@/lib/cnbc";
import { NextResponse } from "next/server";

/**
 * CNBC sometimes quotes currencies as XXX/USD instead of USD/XXX.
 * Normalize to USD/XXX so price is always units of that currency per 1 USD.
 */
function normalizeUsdBaseQuote(quote: CnbcQuote): CnbcQuote {
	const name = quote.name?.trim();
	if (!name || /^USD\b/i.test(name)) {
		return quote;
	}

	const pairMatch = name.match(/^([A-Z]{3})\s*\/\s*([A-Z]{3})$/i);
	const normalizedName = pairMatch
		? `${pairMatch[2].toUpperCase()}/${pairMatch[1].toUpperCase()}`
		: name;

	const price =
		quote.price != null && quote.price !== 0 ? 1 / quote.price : quote.price;

	// Reciprocal of a (1+r) move: new r' = -r / (1 + r)
	let changePercent = quote.changePercent;
	if (changePercent != null) {
		const r = changePercent / 100;
		const denom = 1 + r;
		changePercent =
			denom !== 0 ? (-r / denom) * 100 : changePercent;
	}

	return {
		...quote,
		name: normalizedName,
		price,
		changePercent,
	};
}

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

	// CNBC currency pairs use a trailing "=" (e.g. CAD=).
	const cnbcSymbol = `${symbol}=`;

	try {
		const quote = normalizeUsdBaseQuote(await fetchCnbcQuote(cnbcSymbol));

		return NextResponse.json(quote, {
			headers: {
				"Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
			},
		});
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: "Failed to fetch currency data";
		console.error("[CNBC] Currency fetch threw", {
			symbol: cnbcSymbol,
			message,
		});
		return NextResponse.json({ error: message }, { status: 502 });
	}
}
