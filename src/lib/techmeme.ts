const TECHMEME_ORIGIN = "https://www.techmeme.com";

export type TechmemeNewsItem = {
	title: string;
	preview: string;
	linkUrl: string;
	imageUrl: string | null;
	source: string;
};

function decodeHtmlEntities(text: string): string {
	return text
		.replace(/&nbsp;/gi, " ")
		.replace(/&mdash;/gi, "—")
		.replace(/&ndash;/gi, "–")
		.replace(/&hellip;/gi, "…")
		.replace(/&lsquo;/gi, "'")
		.replace(/&rsquo;/gi, "'")
		.replace(/&ldquo;/gi, '"')
		.replace(/&rdquo;/gi, '"')
		.replace(/&quot;/gi, '"')
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&#(\d+);/g, (_, code) =>
			String.fromCodePoint(Number.parseInt(code, 10)),
		)
		.replace(/&#x([0-9a-f]+);/gi, (_, code) =>
			String.fromCodePoint(Number.parseInt(code, 16)),
		)
		.replace(/\s+/g, " ")
		.trim();
}

function stripTags(html: string): string {
	return decodeHtmlEntities(html.replace(/<[^>]+>/g, " "));
}

function resolveUrl(url: string): string {
	if (url.startsWith("http://") || url.startsWith("https://")) {
		return url;
	}
	return `${TECHMEME_ORIGIN}${url.startsWith("/") ? url : `/${url}`}`;
}

function extractTopcol1(html: string): string | null {
	const start = html.search(/<DIV\s+ID="topcol1">/i);
	if (start === -1) {
		return null;
	}

	const end = html.search(/<DIV\s+ID="topcol23">/i);
	if (end === -1 || end <= start) {
		return null;
	}

	return html.slice(start, end);
}

function removeSponsorBlocks(section: string): string {
	return section.replace(/<DIV\s+CLASS="ifsp">[\s\S]*?<\/DIV>\s*<\/div>/gi, "");
}

/** Top-level feed entries use overitem(cluster, true, 1); sub-items use 2, 3, … */
const TOP_LEVEL_ITC1_REGEX =
	/<DIV\s+CLASS="itc1"\s+ONMOUSEOVER="overitem\(\d+,true,1\)"[^>]*>([\s\S]*?)(?=<DIV\s+CLASS="itc1"\s+ONMOUSEOVER="overitem\(\d+,true,1\)"|<DIV\s+ID="topcol23")/gi;

function extractSource(itemHtml: string): string {
	const citeMatch = itemHtml.match(
		/<table\s+class="shrtbl"[\s\S]*?<CITE>([\s\S]*?)<\/CITE>/i,
	);
	if (!citeMatch) {
		return "";
	}

	const citeHtml = citeMatch[1];
	const linkMatches = [...citeHtml.matchAll(/<A[^>]*>([^<]*)<\/A>/gi)];
	if (linkMatches.length > 0) {
		return decodeHtmlEntities(linkMatches[linkMatches.length - 1][1]);
	}

	return stripTags(citeHtml).replace(/:$/, "").trim();
}

function extractPreview(iiHtml: string): string {
	const parts = iiHtml.split(/&mdash;|—/i);
	if (parts.length < 2) {
		return "";
	}

	return stripTags(parts.slice(1).join(" "));
}

function parseItem(itemHtml: string): TechmemeNewsItem | null {
	const headlineMatch = itemHtml.match(
		/<A\s+CLASS="ourh"\s+HREF="([^"]+)"[^>]*>([\s\S]*?)<\/A>/i,
	);
	if (!headlineMatch) {
		return null;
	}

	const iiMatch = itemHtml.match(/<DIV\s+CLASS="ii">([\s\S]*?)<\/DIV>/i);
	const iiHtml = iiMatch?.[1] ?? "";

	const imageMatch = iiHtml.match(
		/<IMG\s+CLASS="ill"[^>]*\sSRC="([^"]+)"/i,
	);

	return {
		title: stripTags(headlineMatch[2]),
		preview: extractPreview(iiHtml),
		linkUrl: resolveUrl(headlineMatch[1]),
		imageUrl: imageMatch ? resolveUrl(imageMatch[1]) : null,
		source: extractSource(itemHtml),
	};
}

export function parseTechmemeFeed(html: string): TechmemeNewsItem[] {
	const topcol1 = extractTopcol1(html);
	if (!topcol1) {
		return [];
	}

	const mainFeed = removeSponsorBlocks(topcol1);
	const items: TechmemeNewsItem[] = [];

	for (const match of mainFeed.matchAll(TOP_LEVEL_ITC1_REGEX)) {
		const parsed = parseItem(match[1]);
		if (parsed) {
			items.push(parsed);
		}
	}

	return items;
}

export async function fetchTechmemeNews(): Promise<TechmemeNewsItem[]> {
	const response = await fetch(TECHMEME_ORIGIN, {
		headers: {
			"User-Agent": "Mozilla/5.0 (compatible; TechmemeScraper/1.0)",
			Accept: "text/html",
		},
		next: { revalidate: 300 },
	});

	if (!response.ok) {
		throw new Error(`Techmeme fetch failed: ${response.status}`);
	}

	const html = await response.text();
	return parseTechmemeFeed(html);
}
