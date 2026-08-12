"use client";

import { useState } from "react";
import { PlusIcon, SettingsIcon, ShoppingBasketIcon } from "lucide-react";

import { BasketPositionDialog } from "@/components/basket/position-dialog";
import {
	BasketPositionList,
	BasketPositionListSkeleton,
} from "@/components/basket/position-list";
import { BasketSettingsDialog } from "@/components/basket/settings-dialog";
import { useBasketState } from "@/components/basket/use-basket-state";
import { useBasketValuations } from "@/components/basket/use-basket-valuations";
import { Button } from "@/components/ui/button";
import {
	type BasketPosition,
	createId,
} from "@/lib/basket-storage";
import { formatPortfolioValue } from "@/lib/basket-format";

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
		total,
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

	return (
		<div className="min-h-screen bg-background text-foreground">
			<main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
				<div className="mb-8 flex items-center justify-between gap-4 px-1">
					<h1 className="text-xl font-semibold tracking-tight">
						<ShoppingBasketIcon className="size-8" aria-label="Basket" />
					</h1>
					<div className="text-right">
						{!hydrated || (positions.length > 0 && isAnyPending) ? (
							<div className="ml-auto h-10 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
						) : positions.length === 0 ? (
							<p className="text-4xl font-semibold tracking-tight tabular-nums text-muted-foreground">
								—
							</p>
						) : (
							<p className="text-4xl font-semibold tracking-tight tabular-nums">
								{formatPortfolioValue(total, displayRate, currencySymbol)}
							</p>
						)}
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
						displayRate={displayRate}
						currencySymbol={currencySymbol}
						isDisplayRatePending={isDisplayRatePending}
						isFxError={isFxError}
						onEditPosition={(position) =>
							setPositionDialog({ open: true, mode: "edit", position })
						}
					/>
				)}

				<div className="mt-10 flex items-center justify-between gap-4">
					<div className="flex items-center gap-2">
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
							size="sm"
							onClick={() => setSettingsOpen(true)}
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
