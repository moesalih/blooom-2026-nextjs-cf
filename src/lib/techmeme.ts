const TECHMEME_ORIGIN = "https://www.techmeme.com";

export type TechmemeNewsItem = {
	title: string;
	preview: string;
	linkUrl: string;
	imageUrl: string | null;
	source: string;
};

/** HTML named character references (Latin-1 + common punctuation). */
const HTML_NAMED_ENTITIES: Readonly<Record<string, string>> = {
	nbsp: "\u00a0",
	iexcl: "\u00a1",
	cent: "\u00a2",
	pound: "\u00a3",
	curren: "\u00a4",
	yen: "\u00a5",
	brvbar: "\u00a6",
	sect: "\u00a7",
	uml: "\u00a8",
	copy: "\u00a9",
	ordf: "\u00aa",
	laquo: "\u00ab",
	not: "\u00ac",
	shy: "\u00ad",
	reg: "\u00ae",
	macr: "\u00af",
	deg: "\u00b0",
	plusmn: "\u00b1",
	sup2: "\u00b2",
	sup3: "\u00b3",
	acute: "\u00b4",
	micro: "\u00b5",
	para: "\u00b6",
	middot: "\u00b7",
	cedil: "\u00b8",
	sup1: "\u00b9",
	ordm: "\u00ba",
	raquo: "\u00bb",
	frac14: "\u00bc",
	frac12: "\u00bd",
	frac34: "\u00be",
	iquest: "\u00bf",
	Agrave: "\u00c0",
	agrave: "\u00e0",
	Aacute: "\u00c1",
	aacute: "\u00e1",
	Acirc: "\u00c2",
	acirc: "\u00e2",
	Atilde: "\u00c3",
	atilde: "\u00e3",
	Auml: "\u00c4",
	auml: "\u00e4",
	Aring: "\u00c5",
	aring: "\u00e5",
	AElig: "\u00c6",
	aelig: "\u00e6",
	Ccedil: "\u00c7",
	ccedil: "\u00e7",
	Egrave: "\u00c8",
	egrave: "\u00e8",
	Eacute: "\u00c9",
	eacute: "\u00e9",
	Ecirc: "\u00ca",
	ecirc: "\u00ea",
	Euml: "\u00cb",
	euml: "\u00eb",
	Igrave: "\u00cc",
	igrave: "\u00ec",
	Iacute: "\u00cd",
	iacute: "\u00ed",
	Icirc: "\u00ce",
	icirc: "\u00ee",
	Iuml: "\u00cf",
	iuml: "\u00ef",
	ETH: "\u00d0",
	eth: "\u00f0",
	Ntilde: "\u00d1",
	ntilde: "\u00f1",
	Ograve: "\u00d2",
	ograve: "\u00f2",
	Oacute: "\u00d3",
	oacute: "\u00f3",
	Ocirc: "\u00d4",
	ocirc: "\u00f4",
	Otilde: "\u00d5",
	otilde: "\u00f5",
	Ouml: "\u00d6",
	ouml: "\u00f6",
	Oslash: "\u00d8",
	oslash: "\u00f8",
	Ugrave: "\u00d9",
	ugrave: "\u00f9",
	Uacute: "\u00da",
	uacute: "\u00fa",
	Ucirc: "\u00db",
	ucirc: "\u00fb",
	Uuml: "\u00dc",
	uuml: "\u00fc",
	Yacute: "\u00dd",
	yacute: "\u00fd",
	THORN: "\u00de",
	thorn: "\u00fe",
	szlig: "\u00df",
	yuml: "\u00ff",
	euro: "\u20ac",
	mdash: "\u2014",
	ndash: "\u2013",
	hellip: "\u2026",
	lsquo: "\u2018",
	rsquo: "\u2019",
	ldquo: "\u201c",
	rdquo: "\u201d",
	quot: '"',
	amp: "&",
	lt: "<",
	gt: ">",
};

function decodeHtmlEntities(text: string): string {
	let decoded = text
		.replace(/&#(\d+);/g, (_, code) =>
			String.fromCodePoint(Number.parseInt(code, 10)),
		)
		.replace(/&#x([0-9a-f]+);/gi, (_, code) =>
			String.fromCodePoint(Number.parseInt(code, 16)),
		);

	// Repeat until stable so e.g. &amp;ouml; becomes ö.
	for (let i = 0; i < 3; i++) {
		const next = decoded.replace(
			/&([a-zA-Z][a-zA-Z0-9]+);/g,
			(match, name: string) => HTML_NAMED_ENTITIES[name] ?? match,
		);
		if (next === decoded) {
			break;
		}
		decoded = next;
	}

	return decoded.replace(/\s+/g, " ").trim();
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
