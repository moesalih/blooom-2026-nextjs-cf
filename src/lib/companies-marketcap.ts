const COMPANIES_MARKETCAP_URL = "https://companiesmarketcap.com/";

export type ParsedTopCompany = {
	name: string;
	symbol: string;
	marketCap: number;
	price: number | null;
	changePercent: number | null;
};

function symbolStartsWithDigit(symbol: string): boolean {
	return /^\d/.test(symbol);
}

export function parseTopCompanies(
	html: string,
	limit = 10,
): ParsedTopCompany[] {
	const companies: ParsedTopCompany[] = [];

	for (const rowMatch of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
		if (companies.length >= limit) {
			break;
		}

		const fullRow = rowMatch[0];
		const rowHtml = rowMatch[1];

		if (fullRow.includes("ad-tr")) {
			continue;
		}

		const nameMatch = rowHtml.match(
			/<div class="company-name">([^<]*)<\/div>/,
		);
		const symbolMatch = rowHtml.match(
			/<div class="company-code">[\s\S]*?<\/span>([^<]+)<\/div>/,
		);
		const marketCapMatch = rowHtml.match(
			/<td class="td-right" data-sort="(\d+)"><span class="currency-symbol-left">/,
		);
		const priceMatch = rowHtml.match(
			/<td class="td-right" data-sort="([\d.]+)">\$[^<]*<\/td>/,
		);
		const changeMatch = rowHtml.match(
			/<td data-sort="(-?[\d.]+)" class="rh-sm">/,
		);

		if (!nameMatch || !symbolMatch || !marketCapMatch) {
			continue;
		}

		const marketCap = Number(marketCapMatch[1]);
		if (!Number.isFinite(marketCap)) {
			continue;
		}

		const symbol = symbolMatch[1].trim();
		if (symbolStartsWithDigit(symbol)) {
			continue;
		}

		const priceRaw = priceMatch ? Number(priceMatch[1]) : NaN;
		const price = Number.isFinite(priceRaw) ? priceRaw / 100 : null;

		const changeRaw = changeMatch ? Number(changeMatch[1]) : NaN;
		const changePercent = Number.isFinite(changeRaw)
			? changeRaw / 100
			: null;

		companies.push({
			name: nameMatch[1].trim(),
			symbol: symbol.toUpperCase(),
			marketCap,
			price,
			changePercent,
		});
	}

	return companies;
}

export async function fetchTopCompaniesFromSite(
	limit = 10,
): Promise<ParsedTopCompany[]> {
	const response = await fetch(COMPANIES_MARKETCAP_URL, {
		headers: {
			"User-Agent": "Mozilla/5.0 (compatible; blooom/1.0)",
			Accept: "text/html",
		},
		next: { revalidate: 3600 },
	});

	if (!response.ok) {
		throw new Error(
			`CompaniesMarketCap upstream error: ${response.status}`,
		);
	}

	const html = await response.text();
	const companies = parseTopCompanies(html, limit);

	if (companies.length === 0) {
		throw new Error("No companies found in CompaniesMarketCap HTML");
	}

	return companies;
}
