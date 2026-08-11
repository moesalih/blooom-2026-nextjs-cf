import { fetchCnbcQuote } from "@/lib/cnbc"
import { NextResponse } from "next/server"

export async function GET(
	_request: Request,
	context: { params: Promise<{ symbol?: string }> },
) {
	const symbol = (await context.params).symbol

	if (!symbol) {
		return NextResponse.json(
			{ error: "Missing symbol parameter" },
			{ status: 400 },
		)
	}

	// CNBC currency pairs use a trailing "=" (e.g. CAD=).
	const cnbcSymbol = `${symbol}=`

	try {
		const quote = await fetchCnbcQuote(cnbcSymbol)

		return NextResponse.json(quote, {
			headers: {
				"Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
			},
		})
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: "Failed to fetch currency data"
		console.error("[CNBC] Currency fetch threw", {
			symbol: cnbcSymbol,
			message,
		})
		return NextResponse.json({ error: message }, { status: 502 })
	}
}
