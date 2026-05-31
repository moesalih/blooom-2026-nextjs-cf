import { fetchBbcWorldNews } from "@/lib/bbc-world";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		const items = await fetchBbcWorldNews();
		return NextResponse.json({ items });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to scrape BBC World news";
		return NextResponse.json({ error: message }, { status: 502 });
	}
}
