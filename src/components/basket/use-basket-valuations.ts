"use client";

import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";

import type { BasketAccount, BasketPosition, BasketPositionType } from "@/lib/basket-storage";
import {
	fetchAssetQuote,
	fetchCurrencyRate,
	quoteKey,
} from "@/lib/basket-quotes";
import {
	buildAccountGroups,
	buildPositionRows,
	sumPortfolioTotal,
	type QuoteLookup,
} from "@/lib/basket-valuations";

export function useBasketValuations({
	accounts,
	positions,
	currency,
	hydrated,
}: {
	accounts: BasketAccount[];
	positions: BasketPosition[];
	currency: string;
	hydrated: boolean;
}) {
	const currencySymbol = currency.trim().toUpperCase() || "USD";

	const {
		data: fxRate = currencySymbol === "USD" ? 1 : undefined,
		isPending: isFxPending,
		isError: isFxError,
	} = useQuery({
		queryKey: ["currency", currencySymbol] as const,
		queryFn: () => fetchCurrencyRate(currencySymbol),
		enabled: hydrated && currencySymbol.length > 0,
	});

	const displayRate: number | null =
		currencySymbol === "USD"
			? 1
			: typeof fxRate === "number"
				? fxRate
				: null;

	const isDisplayRatePending =
		currencySymbol !== "USD" && isFxPending && displayRate == null;

	const uniqueAssets = useMemo(() => {
		const seen = new Set<string>();
		const assets: { type: BasketPositionType; symbol: string }[] = [];

		for (const position of positions) {
			const symbol = position.symbol.trim().toUpperCase();
			if (!symbol) continue;

			const key = quoteKey(position.type, symbol);
			if (seen.has(key)) continue;

			seen.add(key);
			assets.push({ type: position.type, symbol });
		}

		return assets;
	}, [positions]);

	const priceQueries = useQueries({
		queries: uniqueAssets.map((asset) => ({
			queryKey: [asset.type, asset.symbol] as const,
			queryFn: () => fetchAssetQuote(asset.type, asset.symbol),
			enabled: hydrated && uniqueAssets.length > 0,
		})),
	});

	const priceByKey = useMemo(() => {
		const map = new Map<string, QuoteLookup>();

		uniqueAssets.forEach((asset, index) => {
			const query = priceQueries[index];
			map.set(quoteKey(asset.type, asset.symbol), {
				price: query?.data?.price ?? null,
				changePercent: query?.data?.changePercent ?? null,
				isPending: query?.isPending ?? false,
				isError: query?.isError ?? false,
			});
		});

		return map;
	}, [priceQueries, uniqueAssets]);

	const positionRows = useMemo(
		() => buildPositionRows(positions, priceByKey),
		[positions, priceByKey],
	);

	const accountGroups = useMemo(
		() => buildAccountGroups(accounts, positionRows),
		[accounts, positionRows],
	);

	const total = useMemo(
		() => sumPortfolioTotal(positionRows),
		[positionRows],
	);

	const isAnyPending =
		positionRows.some((row) => row.isPending) || isDisplayRatePending;

	return {
		currencySymbol,
		displayRate,
		isDisplayRatePending,
		isFxError,
		accountGroups,
		total,
		isAnyPending,
	};
}
