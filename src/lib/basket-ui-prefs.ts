export type BasketListView = "accounts" | "combined";
export type BasketMobileColumnView = "value" | "change" | "percent";

export type BasketUiPrefs = {
	listView: BasketListView;
	mobileColumnView: BasketMobileColumnView;
};

/** Separate from `blooom-basket` so UI prefs are not export/imported with portfolio data. */
const STORAGE_KEY = "blooom-basket-ui";

export const DEFAULT_BASKET_UI_PREFS: BasketUiPrefs = {
	listView: "accounts",
	mobileColumnView: "value",
};

function isListView(value: unknown): value is BasketListView {
	return value === "accounts" || value === "combined";
}

function isMobileColumnView(value: unknown): value is BasketMobileColumnView {
	return value === "value" || value === "change" || value === "percent";
}

export function loadBasketUiPrefs(): BasketUiPrefs {
	if (typeof window === "undefined") {
		return DEFAULT_BASKET_UI_PREFS;
	}

	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return DEFAULT_BASKET_UI_PREFS;
		}

		const parsed = JSON.parse(raw) as Partial<BasketUiPrefs>;
		return {
			listView: isListView(parsed.listView)
				? parsed.listView
				: DEFAULT_BASKET_UI_PREFS.listView,
			mobileColumnView: isMobileColumnView(parsed.mobileColumnView)
				? parsed.mobileColumnView
				: DEFAULT_BASKET_UI_PREFS.mobileColumnView,
		};
	} catch {
		return DEFAULT_BASKET_UI_PREFS;
	}
}

export function saveBasketUiPrefs(prefs: BasketUiPrefs): void {
	if (typeof window === "undefined") {
		return;
	}

	window.localStorage.setItem(
		STORAGE_KEY,
		JSON.stringify({
			listView: prefs.listView,
			mobileColumnView: prefs.mobileColumnView,
		}),
	);
}
