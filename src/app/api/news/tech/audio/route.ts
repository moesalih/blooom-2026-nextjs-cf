import { fetchTechmemeNews } from "@/lib/techmeme";
import { NextResponse } from "next/server";

const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const MODEL_ID = "eleven_flash_v2_5";

export async function GET() {
	const apiKey = process.env.ELEVENLABS_API_KEY;
	if (!apiKey) {
		return NextResponse.json(
			{ error: "Missing ELEVENLABS_API_KEY" },
			{ status: 500 },
		);
	}

	try {
		const items = await fetchTechmemeNews();
		const text = items
			.slice(0, 10)
			.map((item) => item.title.trim())
			.filter(Boolean)
			.join("\n\n");

		if (!text) {
			return NextResponse.json(
				{ error: "No tech news to read" },
				{ status: 502 },
			);
		}

		const voiceId = process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID;
		const tts = await fetch(
			`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
			{
				method: "POST",
				headers: {
					"xi-api-key": apiKey,
					Accept: "audio/mpeg",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					text,
					model_id: MODEL_ID,
				}),
			},
		);

		if (!tts.ok || !tts.body) {
			const raw = await tts.text().catch(() => "");
			let message = raw || "ElevenLabs request failed";
			try {
				const parsed = JSON.parse(raw) as {
					detail?: { message?: string } | string;
				};
				if (typeof parsed.detail === "string") {
					message = parsed.detail;
				} else if (parsed.detail?.message) {
					message = parsed.detail.message;
				}
			} catch {
				// keep raw body
			}
			return NextResponse.json({ error: message }, { status: 502 });
		}

		return new Response(tts.body, {
			headers: {
				"Content-Type": "audio/mpeg",
				"Cache-Control": "no-store",
			},
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to read tech news";
		return NextResponse.json({ error: message }, { status: 502 });
	}
}
