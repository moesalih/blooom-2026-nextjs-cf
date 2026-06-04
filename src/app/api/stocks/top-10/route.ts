import { fetchTopCompaniesFromSite } from "@/lib/companies-marketcap";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		const companies = await fetchTopCompaniesFromSite(10);

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
