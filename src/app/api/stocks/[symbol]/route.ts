import { fetchCnbcQuote } from "@/lib/cnbc";
import { NextResponse } from "next/server";

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

	try {
		const quote = await fetchCnbcQuote(symbol);

		return NextResponse.json(quote, {
			headers: {
				"Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
			},
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to fetch stock data";
		console.error("[CNBC] Fetch threw", { symbol, message });
		return NextResponse.json({ error: message }, { status: 502 });
	}
}
