import { resolveUrl, stripTags, type NewsItem } from "@/lib/news-item";

const BBC_WORLD_URL = "https://www.bbc.com/news/world";
const BBC_ORIGIN = "https://www.bbc.com";
const TOP_SECTION_ITEM_COUNT = 12;

function extractTopSection(html: string): string | null {
	const mainStart = html.search(/id="bbc-main"/i);
	if (mainStart === -1) {
		return null;
	}

	const featuresStart = html.indexOf(">Features<", mainStart);
	if (featuresStart === -1 || featuresStart <= mainStart) {
		return null;
	}

	return html.slice(mainStart, featuresStart);
}

function extractImageUrl(cardHtml: string): string | null {
	const imageUrls = [...cardHtml.matchAll(/<img[^>]*\sSRC="([^"]+)"/gi)].map(
		(match) => match[1],
	);

	const articleImage = imageUrls.find(
		(url) => !url.includes("grey-placeholder.png"),
	);

	return articleImage ? resolveUrl(articleImage, BBC_ORIGIN) : null;
}

function parseCard(cardHtml: string): NewsItem | null {
	const linkMatch = cardHtml.match(/href="(\/news\/[^"]+)"/i);
	const headlineMatch = cardHtml.match(
		/data-testid="card-headline"[^>]*>([\s\S]*?)<\/h2>/i,
	);
	if (!linkMatch || !headlineMatch) {
		return null;
	}

	const descriptionMatch =
		cardHtml.match(
			/data-testid="card-description"[^>]*>([\s\S]*?)<\/p>/i,
		) ??
		cardHtml.match(/<p class="sc-ed3b7d3e-5[^"]*"[^>]*>([\s\S]*?)<\/p>/i);

	return {
		title: stripTags(headlineMatch[1]),
		preview: descriptionMatch ? stripTags(descriptionMatch[1]) : "",
		linkUrl: resolveUrl(linkMatch[1], BBC_ORIGIN),
		imageUrl: extractImageUrl(cardHtml),
		source: "BBC",
	};
}

export function parseBbcWorldFeed(html: string): NewsItem[] {
	const topSection = extractTopSection(html);
	if (!topSection) {
		return [];
	}

	const cardChunks = topSection
		.split(/data-indexcard="true"/i)
		.slice(1, TOP_SECTION_ITEM_COUNT + 1);

	const items: NewsItem[] = [];

	for (const cardHtml of cardChunks) {
		const parsed = parseCard(cardHtml);
		if (parsed) {
			items.push(parsed);
		}
	}

	return items;
}

export async function fetchBbcWorldNews(): Promise<NewsItem[]> {
	const response = await fetch(BBC_WORLD_URL, {
		headers: {
			"User-Agent": "Mozilla/5.0 (compatible; NewsScraper/1.0)",
			Accept: "text/html",
		},
		next: { revalidate: 300 },
	});

	if (!response.ok) {
		throw new Error(`BBC World fetch failed: ${response.status}`);
	}

	const html = await response.text();
	return parseBbcWorldFeed(html);
}
