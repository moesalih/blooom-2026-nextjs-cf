"use client";

import { useCallback, useEffect, useState } from "react";

import {
	type BasketAccount,
	type BasketPosition,
	DEFAULT_CURRENCY,
	loadBasket,
	pruneAccounts,
	saveBasket,
} from "@/lib/basket-storage";
import {
	type BasketListView,
	type BasketMobileColumnView,
	type BasketUiPrefs,
	DEFAULT_BASKET_UI_PREFS,
	loadBasketUiPrefs,
	saveBasketUiPrefs,
} from "@/lib/basket-ui-prefs";

export function useBasketState() {
	const [accounts, setAccounts] = useState<BasketAccount[]>([]);
	const [positions, setPositions] = useState<BasketPosition[]>([]);
	const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
	const [updatedAt, setUpdatedAt] = useState<number | null>(null);
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		const data = loadBasket();
		setAccounts(data.accounts);
		setPositions(data.positions);
		setCurrency(data.currency);
		setUpdatedAt(data.updatedAt);
		setHydrated(true);
	}, []);

	const persist = useCallback(
		(
			nextAccounts: BasketAccount[],
			nextPositions: BasketPosition[],
			nextCurrency: string = currency,
		) => {
			const prunedAccounts = pruneAccounts(nextAccounts, nextPositions);
			const nextUpdatedAt = Date.now();
			const normalizedCurrency =
				nextCurrency.trim().toUpperCase() || DEFAULT_CURRENCY;

			setAccounts(prunedAccounts);
			setPositions(nextPositions);
			setCurrency(normalizedCurrency);
			setUpdatedAt(nextUpdatedAt);

			saveBasket({
				accounts: prunedAccounts,
				positions: nextPositions,
				currency: normalizedCurrency,
				updatedAt: nextUpdatedAt,
			});
		},
		[currency],
	);

	return {
		accounts,
		positions,
		currency,
		updatedAt,
		hydrated,
		persist,
	};
}

export function useBasketUiPrefs() {
	const [listView, setListView] = useState<BasketListView>(
		DEFAULT_BASKET_UI_PREFS.listView,
	);
	const [mobileColumnView, setMobileColumnView] =
		useState<BasketMobileColumnView>(DEFAULT_BASKET_UI_PREFS.mobileColumnView);

	useEffect(() => {
		const prefs = loadBasketUiPrefs();
		setListView(prefs.listView);
		setMobileColumnView(prefs.mobileColumnView);
	}, []);

	const persistPrefs = useCallback((prefs: BasketUiPrefs) => {
		setListView(prefs.listView);
		setMobileColumnView(prefs.mobileColumnView);
		saveBasketUiPrefs(prefs);
	}, []);

	return {
		listView,
		mobileColumnView,
		setListView: (next: BasketListView) =>
			persistPrefs({ listView: next, mobileColumnView }),
		setMobileColumnView: (next: BasketMobileColumnView) =>
			persistPrefs({ listView, mobileColumnView: next }),
	};
}
