type CnbcFinancialQuoteJsonLd = {
	"@type"?: string;
	name?: string;
	tickerSymbol?: string;
	price?: string;
	priceChangePercent?: string;
};

export type CnbcQuote = {
	symbol: string;
	name: string | null;
	price: number | null;
	changePercent: number | null;
	marketCap: number | null;
	"52wh": number | null;
};

function parseNumber(value: string | undefined): number | null {
	if (value == null || value === "") {
		return null;
	}

	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : null;
}

const MARKET_CAP_SUFFIX_MULTIPLIERS: Record<string, number> = {
	K: 1_000,
	M: 1_000_000,
	B: 1_000_000_000,
	T: 1_000_000_000_000,
};

function parseCompactMarketCap(value: string | undefined): number | null {
	if (value == null || value === "" || value === "-") {
		return null;
	}

	const match = value.trim().match(/^([\d,.]+)\s*([KMBT])$/i);
	if (!match) {
		return parseNumber(value.replaceAll(",", ""));
	}

	const amount = Number.parseFloat(match[1].replaceAll(",", ""));
	const multiplier = MARKET_CAP_SUFFIX_MULTIPLIERS[match[2].toUpperCase()];

	if (!Number.isFinite(amount) || multiplier == null) {
		return null;
	}

	return amount * multiplier;
}

function parseLabeledStatFromHtml(html: string, label: string): string | undefined {
	const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const patterns = [
		new RegExp(
			`SplitStats-name">${escapedLabel}</span><span class="SplitStats-price">([^<]+)</span>`,
		),
		new RegExp(
			`Summary-label">${escapedLabel}</span><span class="Summary-value">([^<]+)</span>`,
		),
	];

	for (const pattern of patterns) {
		const match = html.match(pattern);
		if (match?.[1] != null && match[1] !== "") {
			return match[1];
		}
	}

	return undefined;
}

function parseMarketCapFromHtml(html: string): number | null {
	return parseCompactMarketCap(parseLabeledStatFromHtml(html, "Market Cap"));
}

function parsePlainPrice(value: string | undefined): number | null {
	if (value == null || value === "" || value === "-") {
		return null;
	}

	return parseNumber(value.replaceAll(",", ""));
}

function parseFiftyTwoWeekHighFromHtml(html: string): number | null {
	const fromStats = parsePlainPrice(
		parseLabeledStatFromHtml(html, "52 Week High"),
	);
	if (fromStats != null) {
		return fromStats;
	}

	const rangeMatch = html.match(
		/QuoteStrip-fiftyTwoWeekRange">([^<]+)<!-- --> - <!-- -->([^<]+)<\/div>/,
	);
	return parsePlainPrice(rangeMatch?.[2]);
}

function parseNameFromHtml(html: string): string | null {
	const match = html.match(/class="QuoteStrip-name">([^<]+)<\/span>/);
	const name = match?.[1]?.trim();
	return name ? name : null;
}

function parseFinancialQuoteJsonLd(
	html: string,
): Omit<CnbcQuote, "marketCap" | "52wh"> | null {
	for (const match of html.matchAll(
		/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi,
	)) {
		let data: CnbcFinancialQuoteJsonLd;
		try {
			data = JSON.parse(match[1]) as CnbcFinancialQuoteJsonLd;
		} catch {
			continue;
		}

		if (data["@type"] !== "Intangible/FinancialQuote") {
			continue;
		}

		const name = data.name?.trim();

		return {
			symbol: (data.tickerSymbol ?? "").toUpperCase(),
			name: name ? name : null,
			price: parseNumber(data.price),
			changePercent: parseNumber(data.priceChangePercent),
		};
	}

	return null;
}

function parseCloseQuoteStrip(
	html: string,
): Pick<CnbcQuote, "price" | "changePercent"> {
	const closeMatch = html.match(
		/QuoteStrip-lastTradeTime">Close<\/div><div class="QuoteStrip-lastPriceStripContainer"><span class="QuoteStrip-lastPrice">([^<]+)<\/span>[\s\S]*?\((?:<!--\s*-->)?(-?\d+(?:\.\d+)?)%(?:<!--\s*-->)?\)/,
	);

	return {
		price: parseNumber(closeMatch?.[1]),
		changePercent: parseNumber(closeMatch?.[2]),
	};
}

export function parseCnbcQuoteHtml(
	html: string,
	symbol: string,
): CnbcQuote {
	const normalizedSymbol = symbol.toUpperCase();
	const fromJsonLd = parseFinancialQuoteJsonLd(html);
	const marketCap = parseMarketCapFromHtml(html);
	const fiftyTwoWeekHigh = parseFiftyTwoWeekHighFromHtml(html);
	const name = fromJsonLd?.name ?? parseNameFromHtml(html);

	if (fromJsonLd?.price != null && fromJsonLd.changePercent != null) {
		return {
			symbol: fromJsonLd.symbol || normalizedSymbol,
			name,
			price: fromJsonLd.price,
			changePercent: fromJsonLd.changePercent,
			marketCap,
			"52wh": fiftyTwoWeekHigh,
		};
	}

	const fromQuoteStrip = parseCloseQuoteStrip(html);

	return {
		symbol: normalizedSymbol,
		name,
		price: fromJsonLd?.price ?? fromQuoteStrip.price,
		changePercent:
			fromJsonLd?.changePercent ?? fromQuoteStrip.changePercent,
		marketCap,
		"52wh": fiftyTwoWeekHigh,
	};
}

export async function fetchCnbcQuote(symbol: string): Promise<CnbcQuote> {
	const normalizedSymbol = symbol.toUpperCase();
	const cnbcUrl = `https://www.cnbc.com/quotes/${encodeURIComponent(normalizedSymbol)}`;

	const response = await fetch(cnbcUrl, {
		headers: {
			Accept: "text/html",
			"User-Agent": "Mozilla/5.0",
		},
		cache: "force-cache",
		next: { revalidate: 300 },
	});

	if (!response.ok) {
		let bodyText: string | undefined;
		try {
			bodyText = await response.text();
		} catch {
			// ignore: best-effort debug logging only
		}

		console.error("[CNBC] Upstream error", {
			symbol: normalizedSymbol,
			status: response.status,
			statusText: response.statusText,
			headers: {
				"retry-after": response.headers.get("retry-after"),
				"content-type": response.headers.get("content-type"),
			},
			body: bodyText ? bodyText.slice(0, 800) : undefined,
		});

		throw new Error(`Upstream error: ${response.status}`);
	}

	const html = await response.text();
	return parseCnbcQuoteHtml(html, normalizedSymbol);
}
