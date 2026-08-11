"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";

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
	type BasketPosition,
	createPositionId,
	loadBasket,
	saveBasket,
} from "@/lib/basket-storage";
import {
	formatChangePercent,
	formatPrice,
} from "@/components/price-list";

type StockQuote = {
	symbol: string;
	price: number | null;
	changePercent: number | null;
};

async function fetchStockPrice(symbol: string): Promise<StockQuote> {
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

function formatCurrency(value: number | null): string {
	if (value == null || Number.isNaN(value)) {
		return "—";
	}
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}

type PositionDialogMode =
	| { type: "closed" }
	| { type: "add" }
	| { type: "edit"; position: BasketPosition };

export function BasketPage() {
	const [positions, setPositions] = useState<BasketPosition[]>([]);
	const [updatedAt, setUpdatedAt] = useState<number | null>(null);
	const [hydrated, setHydrated] = useState(false);
	const [dialog, setDialog] = useState<PositionDialogMode>({ type: "closed" });
	const [symbolInput, setSymbolInput] = useState("");
	const [amountInput, setAmountInput] = useState("");
	const [formError, setFormError] = useState<string | null>(null);

	useEffect(() => {
		const data = loadBasket();
		setPositions(data.positions);
		setUpdatedAt(data.updatedAt);
		setHydrated(true);
	}, []);

	const persist = useCallback((nextPositions: BasketPosition[]) => {
		const nextUpdatedAt = Date.now();
		setPositions(nextPositions);
		setUpdatedAt(nextUpdatedAt);
		saveBasket({ positions: nextPositions, updatedAt: nextUpdatedAt });
	}, []);

	const uniqueSymbols = useMemo(
		() =>
			[
				...new Set(
					positions
						.map((position) => position.symbol.trim().toUpperCase())
						.filter(Boolean),
				),
			],
		[positions],
	);

	const priceQueries = useQueries({
		queries: uniqueSymbols.map((symbol) => ({
			queryKey: ["stock", symbol] as const,
			queryFn: () => fetchStockPrice(symbol),
			enabled: hydrated && uniqueSymbols.length > 0,
		})),
	});

	const priceBySymbol = useMemo(() => {
		const map = new Map<
			string,
			{
				price: number | null;
				changePercent: number | null;
				isPending: boolean;
				isError: boolean;
			}
		>();

		uniqueSymbols.forEach((symbol, index) => {
			const query = priceQueries[index];
			map.set(symbol, {
				price: query?.data?.price ?? null,
				changePercent: query?.data?.changePercent ?? null,
				isPending: query?.isPending ?? false,
				isError: query?.isError ?? false,
			});
		});

		return map;
	}, [priceQueries, uniqueSymbols]);

	const positionValues = useMemo(() => {
		return positions
			.map((position) => {
				const quote = priceBySymbol.get(position.symbol.toUpperCase());
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
			})
			.sort((a, b) => {
				// Highest value first; unknown/pending values sink to the bottom.
				if (a.value == null && b.value == null) return 0;
				if (a.value == null) return 1;
				if (b.value == null) return -1;
				return b.value - a.value;
			});
	}, [positions, priceBySymbol]);

	const total = useMemo(() => {
		let sum = 0;
		let hasValue = false;

		for (const row of positionValues) {
			if (row.value != null) {
				sum += row.value;
				hasValue = true;
			}
		}

		return hasValue ? sum : null;
	}, [positionValues]);

	const isAnyPending = positionValues.some((row) => row.isPending);

	function openAddDialog() {
		setSymbolInput("");
		setAmountInput("");
		setFormError(null);
		setDialog({ type: "add" });
	}

	function openEditDialog(position: BasketPosition) {
		setSymbolInput(position.symbol);
		setAmountInput(String(position.amount));
		setFormError(null);
		setDialog({ type: "edit", position });
	}

	function closeDialog() {
		setDialog({ type: "closed" });
		setFormError(null);
	}

	function handleSave() {
		const symbol = symbolInput.trim().toUpperCase();
		const amount = Number(amountInput);

		if (!symbol) {
			setFormError("Enter a stock symbol.");
			return;
		}

		if (!Number.isFinite(amount) || amount <= 0) {
			setFormError("Enter a valid amount greater than zero.");
			return;
		}

		if (dialog.type === "edit") {
			persist(
				positions.map((position) =>
					position.id === dialog.position.id
						? { ...position, symbol, amount }
						: position,
				),
			);
		} else {
			persist([
				...positions,
				{
					id: createPositionId(),
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

		persist(positions.filter((position) => position.id !== dialog.position.id));
		closeDialog();
	}

	const dialogOpen = dialog.type !== "closed";
	const isEditing = dialog.type === "edit";

	return (
		<div className="min-h-screen bg-background text-foreground">
			<main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
				<div className="mb-2 flex items-center justify-between gap-4">
					<h1 className="text-xl font-semibold tracking-tight">Basket</h1>
					<Button size="sm" onClick={openAddDialog}>
						<PlusIcon data-icon="inline-start" />
						Add
					</Button>
				</div>

				<div className="mb-8">
					{!hydrated || (positions.length > 0 && isAnyPending) ? (
						<div className="h-9 w-36 animate-pulse rounded bg-black/10 dark:bg-white/10" />
					) : positions.length === 0 ? (
						<p className="text-3xl font-semibold tracking-tight tabular-nums text-muted-foreground">
							—
						</p>
					) : (
						<p className="text-3xl font-semibold tracking-tight tabular-nums">
							{formatCurrency(total)}
						</p>
					)}
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
							No positions yet. Add a stock to get started.
						</p>
						<Button className="mt-4" size="sm" onClick={openAddDialog}>
							<PlusIcon data-icon="inline-start" />
							Add position
						</Button>
					</div>
				) : (
					<div>
						<div className="mb-1 flex items-center gap-4 px-1 text-xs text-muted-foreground">
							<div className="min-w-0 flex-1">Symbol</div>
							<div className="w-16 shrink-0 text-right sm:w-20">Change</div>
							<div className="w-20 shrink-0 text-right sm:w-24">Price</div>
							<div className="w-20 shrink-0 text-right sm:w-24">Shares</div>
							<div className="w-24 shrink-0 text-right sm:w-28">Value</div>
						</div>

						{positionValues.map(
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
									className="flex w-full items-center gap-4 border-b border-black/5 px-1 py-3 text-left transition-colors hover:bg-muted/40 dark:border-white/5"
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
											maximumFractionDigits: 6,
										})}
									</div>

									<div
										className={`w-24 shrink-0 text-right tabular-nums sm:w-28 ${
											isPending || isError
												? "text-muted-foreground"
												: "font-medium"
										}`}
									>
										{isPending ? (
											<span className="inline-block h-4 w-16 animate-pulse rounded bg-black/10 dark:bg-white/10" />
										) : (
											formatCurrency(value)
										)}
									</div>
								</button>
							),
						)}

						{updatedAt != null ? (
							<p className="mt-4 text-xs text-muted-foreground">
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
				)}
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
								? "Update the symbol or amount for this holding."
								: "Add a stock symbol and how many shares you hold."}
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
								<FieldLabel htmlFor="basket-symbol">Symbol</FieldLabel>
								<Input
									id="basket-symbol"
									value={symbolInput}
									onChange={(event) => {
										setSymbolInput(event.target.value.toUpperCase());
										setFormError(null);
									}}
									placeholder="AAPL"
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
									placeholder="10"
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
		</div>
	);
}
