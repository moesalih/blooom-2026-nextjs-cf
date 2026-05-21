import { fetchTechmemeNews } from "@/lib/techmeme";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		const items = await fetchTechmemeNews();
		console.log(items);
		return NextResponse.json({ items });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to scrape Techmeme";
		return NextResponse.json({ error: message }, { status: 502 });
	}
}
