"use client";

import { useState } from "react";
import { PlusIcon, SettingsIcon, ShoppingBasketIcon } from "lucide-react";

import { BasketPositionDialog } from "@/components/basket/position-dialog";
import {
	BasketPositionList,
	BasketPositionListSkeleton,
	type BasketListView,
	type BasketMobileColumnView,
} from "@/components/basket/position-list";
import { BasketSettingsDialog } from "@/components/basket/settings-dialog";
import { useBasketState } from "@/components/basket/use-basket-state";
import { useBasketValuations } from "@/components/basket/use-basket-valuations";
import { formatChangePercent } from "@/components/price-list";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { changeColorClass, formatPortfolioValue } from "@/lib/basket-format";
import {
	type BasketPosition,
	createId,
} from "@/lib/basket-storage";

type PositionDialogState =
	| { open: false }
	| { open: true; mode: "add" }
	| { open: true; mode: "edit"; position: BasketPosition };

export function BasketPage() {
	const { accounts, positions, currency, updatedAt, hydrated, persist } =
		useBasketState();

	const {
		currencySymbol,
		displayRate,
		isDisplayRatePending,
		isFxError,
		accountGroups,
		combinedRows,
		total,
		totalChangeValue,
		totalChangePercent,
		isAnyPending,
	} = useBasketValuations({
		accounts,
		positions,
		currency,
		hydrated,
	});

	const [positionDialog, setPositionDialog] = useState<PositionDialogState>({
		open: false,
	});
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [listView, setListView] = useState<BasketListView>("accounts");
	const [mobileColumnView, setMobileColumnView] =
		useState<BasketMobileColumnView>("value");

	return (
		<div className="min-h-screen bg-background text-foreground">
			<main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
				<div
					className={`flex items-start justify-between gap-4 px-1 ${hydrated && positions.length > 0 ? "mb-0" : "mb-8"}`}
				>
					<h1 className="text-xl font-semibold tracking-tight">
						<ShoppingBasketIcon className="size-8" aria-label="Basket" />
					</h1>
					<div className="text-right">
						{!hydrated || (positions.length > 0 && isAnyPending) ? (
							<div className="flex flex-col items-end gap-2">
								<div className="h-10 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
								<div className="h-5 w-28 animate-pulse rounded bg-black/10 dark:bg-white/10" />
							</div>
						) : positions.length === 0 ? (
							<p className="text-4xl font-semibold tracking-tight tabular-nums text-muted-foreground">
								—
							</p>
						) : (
							<>
								<p className="text-4xl font-semibold tracking-tight tabular-nums">
									{formatPortfolioValue(
										total,
										displayRate,
										currencySymbol,
									)}
								</p>
								<p className="mt-1 flex items-baseline justify-end gap-3 text-lg font-semibold tabular-nums">
									<span
										className={changeColorClass(totalChangePercent)}
									>
										{formatChangePercent(totalChangePercent)}
									</span>
									<span
										className={
											isFxError
												? "text-muted-foreground"
												: changeColorClass(totalChangeValue)
										}
									>
										{formatPortfolioValue(
											totalChangeValue,
											displayRate,
											currencySymbol,
										)}
									</span>
								</p>
							</>
						)}
					</div>
				</div>

				<div className="mt-6 mb-10 flex items-center justify-between gap-2 px-1">
					<div className="flex items-center gap-2">
						{hydrated && positions.length > 0 ? (
							<>
								<ToggleGroup
									value={[listView]}
									onValueChange={(values) => {
										const next = values[0];
										if (next === "accounts" || next === "combined") {
											setListView(next);
										}
									}}
									variant="outline"
									size="sm"
									spacing={0}
									aria-label="Account view"
								>
									<ToggleGroupItem value="accounts">
										Accounts
									</ToggleGroupItem>
									<ToggleGroupItem value="combined">
										Combined
									</ToggleGroupItem>
								</ToggleGroup>
								<ToggleGroup
									value={[mobileColumnView]}
									onValueChange={(values) => {
										const next = values[0];
										if (next === "value" || next === "change") {
											setMobileColumnView(next);
										}
									}}
									variant="outline"
									size="sm"
									spacing={0}
									className="md:hidden"
									aria-label="Column view"
								>
									<ToggleGroupItem
										value="value"
										aria-label="Amount and value"
									>
										$
									</ToggleGroupItem>
									<ToggleGroupItem
										value="change"
										aria-label="Price, change, and gain"
									>
										+/-
									</ToggleGroupItem>
								</ToggleGroup>
							</>
						) : null}
					</div>
					<div className="flex items-center justify-end gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPositionDialog({ open: true, mode: "add" })}
						>
							<PlusIcon data-icon="inline-start" />
							Add
						</Button>
						<Button
							variant="outline"
							size="icon-sm"
							onClick={() => setSettingsOpen(true)}
							aria-label="Portfolio settings"
						>
							<SettingsIcon />
						</Button>
					</div>
				</div>

				{!hydrated ? (
					<BasketPositionListSkeleton />
				) : positions.length === 0 ? (
					<div className="rounded-xl border border-dashed border-black/10 px-4 py-12 text-center dark:border-white/10">
						<p className="text-sm text-muted-foreground">
							No positions yet. Add a stock or crypto to get started.
						</p>
					</div>
				) : (
					<BasketPositionList
						accountGroups={accountGroups}
						combinedRows={combinedRows}
						listView={listView}
						displayRate={displayRate}
						currencySymbol={currencySymbol}
						isDisplayRatePending={isDisplayRatePending}
						isFxError={isFxError}
						mobileColumnView={mobileColumnView}
						onEditPosition={(position) =>
							setPositionDialog({ open: true, mode: "edit", position })
						}
					/>
				)}

				{updatedAt != null ? (
					<p className="mt-10 text-center text-xs text-muted-foreground">
						Positions updated{" "}
						{new Date(updatedAt).toLocaleString("en-US", {
							month: "short",
							day: "numeric",
							hour: "numeric",
							minute: "2-digit",
						})}
					</p>
				) : null}
			</main>

			<BasketPositionDialog
				open={positionDialog.open}
				mode={positionDialog.open ? positionDialog.mode : "add"}
				position={
					positionDialog.open && positionDialog.mode === "edit"
						? positionDialog.position
						: null
				}
				accounts={accounts}
				onClose={() => setPositionDialog({ open: false })}
				onSave={(draft, nextAccounts) => {
					if (positionDialog.open && positionDialog.mode === "edit") {
						persist(
							nextAccounts,
							positions.map((item) =>
								item.id === positionDialog.position.id
									? { ...item, ...draft }
									: item,
							),
						);
					} else {
						persist(nextAccounts, [
							...positions,
							{ id: createId(), ...draft },
						]);
					}
					setPositionDialog({ open: false });
				}}
				onDelete={
					positionDialog.open && positionDialog.mode === "edit"
						? () => {
								persist(
									accounts,
									positions.filter(
										(item) => item.id !== positionDialog.position.id,
									),
								);
								setPositionDialog({ open: false });
							}
						: undefined
				}
			/>

			<BasketSettingsDialog
				open={settingsOpen}
				currency={currencySymbol}
				onClose={() => setSettingsOpen(false)}
				onSave={(nextCurrency) => {
					persist(accounts, positions, nextCurrency);
					setSettingsOpen(false);
				}}
			/>
		</div>
	);
}
