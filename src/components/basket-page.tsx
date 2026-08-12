"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { PlusIcon, SettingsIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	type BasketAccount,
	type BasketPosition,
	type BasketPositionType,
	createId,
	DEFAULT_CURRENCY,
	findAccountByName,
	loadBasket,
	pruneAccounts,
	saveBasket,
} from "@/lib/basket-storage";
import { fetchCryptoQuote } from "@/lib/coingecko";
import {
	formatChangePercent,
	formatPrice,
} from "@/components/price-list";

const NEW_ACCOUNT_VALUE = "__new__";

type AssetQuote = {
	symbol: string;
	price: number | null;
	changePercent: number | null;
};

type PositionRow = {
	position: BasketPosition;
	price: number | null;
	changePercent: number | null;
	value: number | null;
	isPending: boolean;
	isError: boolean;
};

async function fetchStockPrice(symbol: string): Promise<AssetQuote> {
	const response = await fetch(`/api/stocks/${encodeURIComponent(symbol)}`);

	if (!response.ok) {
		throw new Error("Failed to load stock price");
	}

	const json = (await response.json()) as {
		symbol?: string;
		price?: number | null;
		changePercent?: number | null;
	};

	return {
		symbol,
		price:
			typeof json.price === "number" && !Number.isNaN(json.price)
				? json.price
				: null,
		changePercent:
			typeof json.changePercent === "number" &&
			!Number.isNaN(json.changePercent)
				? json.changePercent
				: null,
	};
}

function quoteKey(type: BasketPositionType, symbol: string): string {
	return `${type}:${symbol.toUpperCase()}`;
}

function changeColorClass(changePercent: number | null): string {
	if (changePercent == null) {
		return "text-muted-foreground";
	}
	if (changePercent > 0) {
		return "text-emerald-500";
	}
	if (changePercent < 0) {
		return "text-red-500";
	}
	return "text-muted-foreground";
}

async function fetchCurrencyRate(symbol: string): Promise<number> {
	const upper = symbol.trim().toUpperCase();
	if (upper === "USD") {
		return 1;
	}

	const response = await fetch(`/api/currency/${encodeURIComponent(upper)}`);

	if (!response.ok) {
		throw new Error("Failed to load currency rate");
	}

	const json = (await response.json()) as { price?: number | null };
	if (typeof json.price !== "number" || Number.isNaN(json.price)) {
		throw new Error("Invalid currency rate");
	}

	// API returns units of currency per 1 USD.
	return json.price;
}

/** Convert a USD value into portfolio currency for display. */
function formatPortfolioValue(
	usdValue: number | null,
	rate: number | null,
	currencySymbol: string,
): string {
	if (usdValue == null || rate == null || Number.isNaN(usdValue) || Number.isNaN(rate)) {
		return "—";
	}

	const converted = usdValue * rate;
	const code = currencySymbol.trim().toUpperCase() || "USD";

	try {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: code,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(converted);
	} catch {
		return `${code} ${converted.toLocaleString("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})}`;
	}
}

function sortByNumericDesc(a: number | null, b: number | null) {
	if (a == null && b == null) return 0;
	if (a == null) return 1;
	if (b == null) return -1;
	return b - a;
}

type PositionDialogMode =
	| { type: "closed" }
	| { type: "add" }
	| { type: "edit"; position: BasketPosition };

export function BasketPage() {
	const [accounts, setAccounts] = useState<BasketAccount[]>([]);
	const [positions, setPositions] = useState<BasketPosition[]>([]);
	const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
	const [updatedAt, setUpdatedAt] = useState<number | null>(null);
	const [hydrated, setHydrated] = useState(false);
	const [dialog, setDialog] = useState<PositionDialogMode>({ type: "closed" });
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [typeInput, setTypeInput] = useState<BasketPositionType>("stock");
	const [symbolInput, setSymbolInput] = useState("");
	const [amountInput, setAmountInput] = useState("");
	const [accountSelect, setAccountSelect] = useState<string>(NEW_ACCOUNT_VALUE);
	const [newAccountName, setNewAccountName] = useState("");
	const [currencyInput, setCurrencyInput] = useState(DEFAULT_CURRENCY);
	const [formError, setFormError] = useState<string | null>(null);
	const [settingsError, setSettingsError] = useState<string | null>(null);

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

	// Rate used for display; null while loading / on error (non-USD).
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
			queryFn: () =>
				asset.type === "crypto"
					? fetchCryptoQuote(asset.symbol)
					: fetchStockPrice(asset.symbol),
			enabled: hydrated && uniqueAssets.length > 0,
		})),
	});

	const priceByKey = useMemo(() => {
		const map = new Map<
			string,
			{
				price: number | null;
				changePercent: number | null;
				isPending: boolean;
				isError: boolean;
			}
		>();

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

	const positionRows = useMemo((): PositionRow[] => {
		return positions.map((position) => {
			const quote = priceByKey.get(quoteKey(position.type, position.symbol));
			const price = quote?.price ?? null;
			const changePercent = quote?.changePercent ?? null;
			const value =
				price != null && Number.isFinite(position.amount)
					? price * position.amount
					: null;

			return {
				position,
				price,
				changePercent,
				value,
				isPending: quote?.isPending ?? false,
				isError: quote?.isError ?? false,
			};
		});
	}, [positions, priceByKey]);

	const accountGroups = useMemo(() => {
		const accountById = new Map(accounts.map((account) => [account.id, account]));

		const groups = accounts
			.map((account) => {
				const rows = positionRows
					.filter((row) => row.position.accountId === account.id)
					.sort((a, b) => sortByNumericDesc(a.value, b.value));

				let total = 0;
				let hasValue = false;
				for (const row of rows) {
					if (row.value != null) {
						total += row.value;
						hasValue = true;
					}
				}

				return {
					account,
					rows,
					total: hasValue ? total : null,
				};
			})
			.filter((group) => group.rows.length > 0)
			.sort((a, b) => sortByNumericDesc(a.total, b.total));

		// Safety: positions whose account is missing still render.
		const knownIds = new Set(groups.map((group) => group.account.id));
		const orphanRows = positionRows.filter(
			(row) => !knownIds.has(row.position.accountId),
		);

		if (orphanRows.length > 0) {
			let total = 0;
			let hasValue = false;
			for (const row of orphanRows) {
				if (row.value != null) {
					total += row.value;
					hasValue = true;
				}
			}

			groups.push({
				account: {
					id: orphanRows[0].position.accountId,
					name:
						accountById.get(orphanRows[0].position.accountId)?.name ?? "Account",
				},
				rows: orphanRows.sort((a, b) => sortByNumericDesc(a.value, b.value)),
				total: hasValue ? total : null,
			});
			groups.sort((a, b) => sortByNumericDesc(a.total, b.total));
		}

		return groups;
	}, [accounts, positionRows]);

	const total = useMemo(() => {
		let sum = 0;
		let hasValue = false;

		for (const row of positionRows) {
			if (row.value != null) {
				sum += row.value;
				hasValue = true;
			}
		}

		return hasValue ? sum : null;
	}, [positionRows]);

	const isAnyPending =
		positionRows.some((row) => row.isPending) || isDisplayRatePending;
	const showNewAccountInput =
		accounts.length === 0 || accountSelect === NEW_ACCOUNT_VALUE;

	function openSettings() {
		setCurrencyInput(currencySymbol);
		setSettingsError(null);
		setSettingsOpen(true);
	}

	function handleSaveSettings() {
		const symbol = currencyInput.trim().toUpperCase();
		if (!symbol || !/^[A-Z]{3}$/.test(symbol)) {
			setSettingsError("Enter a 3-letter currency code (e.g. USD, CAD, EUR).");
			return;
		}

		persist(accounts, positions, symbol);
		setSettingsOpen(false);
	}

	function openAddDialog() {
		setTypeInput("stock");
		setSymbolInput("");
		setAmountInput("");
		setAccountSelect(accounts[0]?.id ?? NEW_ACCOUNT_VALUE);
		setNewAccountName("");
		setFormError(null);
		setDialog({ type: "add" });
	}

	function openEditDialog(position: BasketPosition) {
		setTypeInput(position.type);
		setSymbolInput(position.symbol);
		setAmountInput(String(position.amount));
		setAccountSelect(position.accountId);
		setNewAccountName("");
		setFormError(null);
		setDialog({ type: "edit", position });
	}

	function closeDialog() {
		setDialog({ type: "closed" });
		setFormError(null);
	}

	function resolveAccount(
		nextAccounts: BasketAccount[],
	): { accounts: BasketAccount[]; accountId: string } | { error: string } {
		if (showNewAccountInput) {
			const name = newAccountName.trim();
			if (!name) {
				return { error: "Enter an account name." };
			}

			const existing = findAccountByName(nextAccounts, name);
			if (existing) {
				return { accounts: nextAccounts, accountId: existing.id };
			}

			const account: BasketAccount = { id: createId(), name };
			return { accounts: [...nextAccounts, account], accountId: account.id };
		}

		if (!accountSelect || accountSelect === NEW_ACCOUNT_VALUE) {
			return { error: "Select an account." };
		}

		if (!nextAccounts.some((account) => account.id === accountSelect)) {
			return { error: "Select an account." };
		}

		return { accounts: nextAccounts, accountId: accountSelect };
	}

	function handleSave() {
		const symbol = symbolInput.trim().toUpperCase();
		const amount = Number(amountInput);

		if (!symbol) {
			setFormError(
				typeInput === "crypto"
					? "Enter a crypto symbol."
					: "Enter a stock symbol.",
			);
			return;
		}

		if (!Number.isFinite(amount) || amount <= 0) {
			setFormError("Enter a valid amount greater than zero.");
			return;
		}

		const accountResult = resolveAccount(accounts);
		if ("error" in accountResult) {
			setFormError(accountResult.error);
			return;
		}

		const { accounts: nextAccounts, accountId } = accountResult;

		if (dialog.type === "edit") {
			persist(
				nextAccounts,
				positions.map((position) =>
					position.id === dialog.position.id
						? {
								...position,
								accountId,
								type: typeInput,
								symbol,
								amount,
							}
						: position,
				),
			);
		} else {
			persist(nextAccounts, [
				...positions,
				{
					id: createId(),
					accountId,
					type: typeInput,
					symbol,
					amount,
				},
			]);
		}

		closeDialog();
	}

	function handleDelete() {
		if (dialog.type !== "edit") {
			return;
		}

		persist(
			accounts,
			positions.filter((position) => position.id !== dialog.position.id),
		);
		closeDialog();
	}

	const dialogOpen = dialog.type !== "closed";
	const isEditing = dialog.type === "edit";

	return (
		<div className="min-h-screen bg-background text-foreground">
			<main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
				<div className="mb-8 flex items-baseline justify-between gap-4 px-1">
					<h1 className="text-xl font-semibold tracking-tight">Basket</h1>
					<div className="text-right">
						{!hydrated || (positions.length > 0 && isAnyPending) ? (
							<div className="ml-auto h-8 w-28 animate-pulse rounded bg-black/10 dark:bg-white/10" />
						) : positions.length === 0 ? (
							<p className="text-2xl font-semibold tracking-tight tabular-nums text-muted-foreground">
								—
							</p>
						) : (
							<p className="text-2xl font-semibold tracking-tight tabular-nums">
								{formatPortfolioValue(total, displayRate, currencySymbol)}
							</p>
						)}
					</div>
				</div>

				{!hydrated ? (
					<div>
						{Array.from({ length: 3 }, (_, index) => (
							<div
								key={index}
								className="flex items-center gap-4 border-b border-black/5 px-1 py-3 dark:border-white/5"
							>
								<span className="inline-block h-4 w-16 flex-1 animate-pulse rounded bg-black/10 dark:bg-white/10" />
								<span className="inline-block h-4 w-12 shrink-0 animate-pulse rounded bg-black/10 dark:bg-white/10 sm:w-16" />
								<span className="inline-block h-4 w-14 shrink-0 animate-pulse rounded bg-black/10 dark:bg-white/10 sm:w-20" />
								<span className="inline-block h-4 w-12 shrink-0 animate-pulse rounded bg-black/10 dark:bg-white/10 sm:w-16" />
								<span className="inline-block h-4 w-16 shrink-0 animate-pulse rounded bg-black/10 dark:bg-white/10 sm:w-20" />
							</div>
						))}
					</div>
				) : positions.length === 0 ? (
					<div className="rounded-xl border border-dashed border-black/10 px-4 py-12 text-center dark:border-white/10">
						<p className="text-sm text-muted-foreground">
							No positions yet. Add a stock or crypto to get started.
						</p>
					</div>
				) : (
					<div>
						<div className="mb-4 flex items-center gap-4 px-1 text-xs text-muted-foreground">
							<div className="min-w-0 flex-1">Symbol</div>
							<div className="w-16 shrink-0 text-right sm:w-20">Change</div>
							<div className="w-20 shrink-0 text-right sm:w-24">Price</div>
							<div className="w-20 shrink-0 text-right sm:w-24">Amount</div>
							<div className="w-24 shrink-0 text-right sm:w-28">Value</div>
						</div>

						<div className="divide-y divide-black/10 dark:divide-white/10">
						{accountGroups.map((group) => (
							<section key={group.account.id} className="py-5 first:pt-2 last:pb-0">
								<div className="flex items-baseline justify-between gap-4 px-1 pb-1">
									<h2 className="text-lg font-semibold tracking-tight">
										{group.account.name}
									</h2>
									<p className="text-lg font-semibold tabular-nums">
										{group.rows.some((row) => row.isPending) ||
										isDisplayRatePending ? (
											<span className="inline-block h-5 w-24 animate-pulse rounded bg-black/10 dark:bg-white/10" />
										) : (
											formatPortfolioValue(
												group.total,
												displayRate,
												currencySymbol,
											)
										)}
									</p>
								</div>

								{group.rows.map(
									({
										position,
										price,
										changePercent,
										value,
										isPending,
										isError,
									}) => (
										<button
											key={position.id}
											type="button"
											onClick={() => openEditDialog(position)}
											className="flex w-full items-center gap-4 px-1 py-2.5 text-left transition-colors hover:bg-muted/40"
										>
											<div className="min-w-0 flex-1 font-medium tracking-wide">
												{position.symbol}
											</div>

											<div
												className={`w-16 shrink-0 text-right tabular-nums sm:w-20 ${
													isPending || isError
														? "text-muted-foreground"
														: changeColorClass(changePercent)
												}`}
											>
												{isPending ? (
													<span className="inline-block h-4 w-12 animate-pulse rounded bg-black/10 dark:bg-white/10" />
												) : isError ? (
													"—"
												) : (
													formatChangePercent(changePercent)
												)}
											</div>

											<div
												className={`w-20 shrink-0 text-right tabular-nums sm:w-24 ${
													isPending || isError
														? "text-muted-foreground"
														: ""
												}`}
											>
												{isPending ? (
													<span className="inline-block h-4 w-14 animate-pulse rounded bg-black/10 dark:bg-white/10" />
												) : isError ? (
													"—"
												) : (
													formatPrice(price)
												)}
											</div>

											<div className="w-20 shrink-0 text-right tabular-nums sm:w-24">
												{position.amount.toLocaleString("en-US", {
													maximumFractionDigits: 8,
												})}
											</div>

											<div
												className={`w-24 shrink-0 text-right tabular-nums sm:w-28 ${
													isPending || isError || isFxError || isDisplayRatePending
														? "text-muted-foreground"
														: "font-medium"
												}`}
											>
												{isPending || isDisplayRatePending ? (
													<span className="inline-block h-4 w-16 animate-pulse rounded bg-black/10 dark:bg-white/10" />
												) : (
													formatPortfolioValue(
														value,
														displayRate,
														currencySymbol,
													)
												)}
											</div>
										</button>
									),
								)}
							</section>
						))}
						</div>
					</div>
				)}

				<div className="mt-6 flex items-center justify-between gap-4">
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={openAddDialog}>
							<PlusIcon data-icon="inline-start" />
							Add
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={openSettings}
							aria-label="Portfolio settings"
						>
							<SettingsIcon data-icon="inline-start" />
							Settings
						</Button>
					</div>
					{updatedAt != null ? (
						<p className="text-xs text-muted-foreground">
							Positions updated{" "}
							{new Date(updatedAt).toLocaleString("en-US", {
								month: "short",
								day: "numeric",
								hour: "numeric",
								minute: "2-digit",
							})}
						</p>
					) : null}
				</div>
			</main>

			<Dialog
				open={dialogOpen}
				onOpenChange={(open) => {
					if (!open) {
						closeDialog();
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{isEditing ? "Edit position" : "Add position"}
						</DialogTitle>
						<DialogDescription>
							{isEditing
								? "Update this holding’s account, type, symbol, or amount."
								: "Add a stock or crypto and how much you hold."}
						</DialogDescription>
					</DialogHeader>

					<form
						onSubmit={(event) => {
							event.preventDefault();
							handleSave();
						}}
					>
						<FieldGroup className="gap-4 py-2">
							<Field>
								<FieldLabel>Account</FieldLabel>
								{accounts.length > 0 ? (
									<Select
										value={accountSelect}
										onValueChange={(value) => {
											if (typeof value === "string") {
												setAccountSelect(value);
												setFormError(null);
											}
										}}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Select account">
												{(value: string | null) => {
													if (value === NEW_ACCOUNT_VALUE) {
														return "New account…";
													}
													return (
														accounts.find((account) => account.id === value)
															?.name ?? "Select account"
													);
												}}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											{accounts.map((account) => (
												<SelectItem key={account.id} value={account.id}>
													{account.name}
												</SelectItem>
											))}
											<SelectItem value={NEW_ACCOUNT_VALUE}>
												New account…
											</SelectItem>
										</SelectContent>
									</Select>
								) : null}
								{showNewAccountInput ? (
									<Input
										id="basket-account-name"
										value={newAccountName}
										onChange={(event) => {
											setNewAccountName(event.target.value);
											setFormError(null);
										}}
										placeholder="e.g. Fidelity"
										autoComplete="off"
										className={accounts.length > 0 ? "mt-2" : undefined}
									/>
								) : null}
							</Field>
							<Field>
								<FieldLabel>Type</FieldLabel>
								<ToggleGroup
									value={[typeInput]}
									onValueChange={(values) => {
										const next = values[0];
										if (next === "stock" || next === "crypto") {
											setTypeInput(next);
											setFormError(null);
										}
									}}
									variant="outline"
									spacing={0}
									className="w-full"
								>
									<ToggleGroupItem value="stock" className="flex-1">
										Stock
									</ToggleGroupItem>
									<ToggleGroupItem value="crypto" className="flex-1">
										Crypto
									</ToggleGroupItem>
								</ToggleGroup>
							</Field>
							<Field>
								<FieldLabel htmlFor="basket-symbol">Symbol</FieldLabel>
								<Input
									id="basket-symbol"
									value={symbolInput}
									onChange={(event) => {
										setSymbolInput(event.target.value.toUpperCase());
										setFormError(null);
									}}
									placeholder={typeInput === "crypto" ? "BTC" : "AAPL"}
									autoComplete="off"
									autoCapitalize="characters"
									spellCheck={false}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="basket-amount">Amount</FieldLabel>
								<Input
									id="basket-amount"
									type="number"
									inputMode="decimal"
									min="0"
									step="any"
									value={amountInput}
									onChange={(event) => {
										setAmountInput(event.target.value);
										setFormError(null);
									}}
									placeholder={typeInput === "crypto" ? "0.5" : "10"}
								/>
							</Field>
							{formError ? (
								<p className="text-sm text-destructive">{formError}</p>
							) : null}
						</FieldGroup>

						<DialogFooter className="mt-2">
							{isEditing ? (
								<Button
									type="button"
									variant="destructive"
									onClick={handleDelete}
									className="sm:mr-auto"
								>
									Delete
								</Button>
							) : null}
							<Button type="button" variant="outline" onClick={closeDialog}>
								Cancel
							</Button>
							<Button type="submit">{isEditing ? "Save" : "Add"}</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog
				open={settingsOpen}
				onOpenChange={(open) => {
					if (!open) {
						setSettingsOpen(false);
						setSettingsError(null);
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Portfolio settings</DialogTitle>
						<DialogDescription>
							Choose the currency used to display portfolio values. Positions are
							still priced in USD, then converted.
						</DialogDescription>
					</DialogHeader>

					<form
						onSubmit={(event) => {
							event.preventDefault();
							handleSaveSettings();
						}}
					>
						<FieldGroup className="gap-4 py-2">
							<Field>
								<FieldLabel htmlFor="basket-currency">Currency</FieldLabel>
								<Input
									id="basket-currency"
									value={currencyInput}
									onChange={(event) => {
										setCurrencyInput(event.target.value.toUpperCase());
										setSettingsError(null);
									}}
									placeholder="USD"
									autoComplete="off"
									autoCapitalize="characters"
									spellCheck={false}
									maxLength={3}
								/>
								<p className="text-xs text-muted-foreground">
									3-letter code, e.g. USD, CAD, EUR, GBP. Rate is units per 1
									USD.
								</p>
							</Field>
							{settingsError ? (
								<p className="text-sm text-destructive">{settingsError}</p>
							) : null}
						</FieldGroup>

						<DialogFooter className="mt-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setSettingsOpen(false);
									setSettingsError(null);
								}}
							>
								Cancel
							</Button>
							<Button type="submit">Save</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
