import { fetchTopCompaniesFromSite } from "@/lib/companies-marketcap";
import { fetchStooqQuote } from "@/lib/stooq";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		const parsed = await fetchTopCompaniesFromSite(10);

		const companies = await Promise.all(
			parsed.map(async ({ name, symbol, marketCap }) => {
				try {
					const quote = await fetchStooqQuote(symbol);
					return {
						...quote,
						name,
						marketCap,
					};
				} catch (error) {
					console.error("[Stooq] Failed quote for top company", {
						symbol,
						message:
							error instanceof Error ? error.message : "Unknown error",
					});
					return {
						symbol: symbol.toUpperCase(),
						price: null,
						changePercent: null,
						name,
						marketCap,
					};
				}
			}),
		);

		return NextResponse.json(companies, {
			headers: {
				"Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
			},
		});
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: "Failed to fetch top companies";
		console.error("[Top-10] Request failed", { message });
		return NextResponse.json({ error: message }, { status: 502 });
	}
}
