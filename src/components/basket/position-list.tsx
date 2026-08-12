"use client";

import type { BasketPosition } from "@/lib/basket-storage";
import type { AccountGroup } from "@/lib/basket-valuations";
import {
	changeColorClass,
	formatPortfolioValue,
} from "@/lib/basket-format";
import {
	formatChangePercent,
	formatPrice,
} from "@/components/price-list";
import { cn } from "@/lib/utils";

export type BasketMobileColumnView = "value" | "change";

type BasketPositionListProps = {
	accountGroups: AccountGroup[];
	displayRate: number | null;
	currencySymbol: string;
	isDisplayRatePending: boolean;
	isFxError: boolean;
	mobileColumnView: BasketMobileColumnView;
	onEditPosition: (position: BasketPosition) => void;
};

export function BasketPositionList({
	accountGroups,
	displayRate,
	currencySymbol,
	isDisplayRatePending,
	isFxError,
	mobileColumnView,
	onEditPosition,
}: BasketPositionListProps) {
	const hideUnlessValue =
		mobileColumnView !== "value" ? "max-md:hidden" : undefined;
	const hideUnlessChange =
		mobileColumnView !== "change" ? "max-md:hidden" : undefined;

	return (
		<div>
			<div className="mb-4 flex items-center gap-4 px-1 text-xs text-muted-foreground">
				<div className="min-w-0 flex-1">Symbol</div>
				<div
					className={cn(
						"w-20 shrink-0 text-right sm:w-24",
						hideUnlessValue,
					)}
				>
					Amount
				</div>
				<div
					className={cn(
						"w-20 shrink-0 text-right sm:w-24",
						hideUnlessChange,
					)}
				>
					Price
				</div>
				<div
					className={cn(
						"w-16 shrink-0 text-right sm:w-20",
						hideUnlessChange,
					)}
				>
					Change
				</div>
				<div
					className={cn(
						"w-20 shrink-0 text-right sm:w-28",
						hideUnlessChange,
					)}
				>
					Gain
				</div>
				<div
					className={cn(
						"w-28 shrink-0 text-right sm:w-36",
						hideUnlessValue,
					)}
				>
					Value
				</div>
			</div>

			<div>
				{accountGroups.map((group) => (
					<section
						key={group.account.id}
						className="border-t border-black/10 py-5 last:pb-0 dark:border-white/10"
					>
						<div className="mb-2 flex items-baseline justify-between gap-4 px-1 pb-1">
							<h2 className="text-2xl font-semibold tracking-tight">
								{group.account.name}
							</h2>
							<p className="text-2xl font-semibold tabular-nums">
								{group.rows.some((row) => row.isPending) ||
									isDisplayRatePending ? (
									<span className="inline-block h-7 w-32 animate-pulse rounded bg-black/10 dark:bg-white/10" />
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
								changeValue,
								value,
								isPending,
								isError,
							}) => (
								<button
									key={position.id}
									type="button"
									onClick={() => onEditPosition(position)}
									className="flex w-full items-center gap-4 px-1 py-2 text-left transition-colors hover:bg-muted/40"
								>
									<div className="min-w-0 flex-1 font-medium tracking-wide">
										{position.symbol}
									</div>

									<div
										className={cn(
											"w-20 shrink-0 text-right tabular-nums text-muted-foreground sm:w-24",
											hideUnlessValue,
										)}
									>
										{position.amount.toLocaleString("en-US", {
											maximumFractionDigits: 8,
										})}
									</div>

									<div
										className={cn(
											"w-20 shrink-0 text-right tabular-nums text-muted-foreground sm:w-24",
											hideUnlessChange,
										)}
									>
										{isPending ? (
											<span className="inline-block h-4 w-14 animate-pulse rounded bg-black/10 dark:bg-white/10" />
										) : isError ? (
											"—"
										) : (
											formatPrice(price)
										)}
									</div>

									<div
										className={cn(
											"w-16 shrink-0 text-right tabular-nums sm:w-20",
											isPending || isError
												? "text-muted-foreground"
												: changeColorClass(changePercent),
											hideUnlessChange,
										)}
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
										className={cn(
											"w-20 shrink-0 text-right tabular-nums sm:w-28",
											isPending ||
												isError ||
												isFxError ||
												isDisplayRatePending
												? "text-muted-foreground"
												: changeColorClass(changeValue),
											hideUnlessChange,
										)}
									>
										{isPending || isDisplayRatePending ? (
											<span className="inline-block h-4 w-16 animate-pulse rounded bg-black/10 dark:bg-white/10" />
										) : isError ? (
											"—"
										) : (
											formatPortfolioValue(
												changeValue,
												displayRate,
												currencySymbol,
											)
										)}
									</div>

									<div
										className={cn(
											"w-28 shrink-0 text-right tabular-nums sm:w-36",
											isPending ||
												isError ||
												isFxError ||
												isDisplayRatePending
												? "text-muted-foreground"
												: "font-medium",
											hideUnlessValue,
										)}
									>
										{isPending || isDisplayRatePending ? (
											<span className="inline-block h-4 w-20 animate-pulse rounded bg-black/10 dark:bg-white/10" />
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
	);
}

export function BasketPositionListSkeleton() {
	return (
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
					<span className="inline-block h-4 w-14 shrink-0 animate-pulse rounded bg-black/10 dark:bg-white/10 sm:w-20" />
					<span className="inline-block h-4 w-16 shrink-0 animate-pulse rounded bg-black/10 dark:bg-white/10 sm:w-20" />
				</div>
			))}
		</div>
	);
}
