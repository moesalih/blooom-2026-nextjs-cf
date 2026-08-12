"use client";

import { useEffect, useState } from "react";

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
	findAccountByName,
} from "@/lib/basket-storage";

const NEW_ACCOUNT_VALUE = "__new__";

export type PositionDraft = {
	accountId: string;
	type: BasketPositionType;
	symbol: string;
	amount: number;
};

type PositionDialogProps = {
	open: boolean;
	mode: "add" | "edit";
	position?: BasketPosition | null;
	accounts: BasketAccount[];
	onClose: () => void;
	onSave: (draft: PositionDraft, nextAccounts: BasketAccount[]) => void;
	onDelete?: () => void;
};

export function BasketPositionDialog({
	open,
	mode,
	position,
	accounts,
	onClose,
	onSave,
	onDelete,
}: PositionDialogProps) {
	const [typeInput, setTypeInput] = useState<BasketPositionType>("stock");
	const [symbolInput, setSymbolInput] = useState("");
	const [amountInput, setAmountInput] = useState("");
	const [accountSelect, setAccountSelect] = useState(NEW_ACCOUNT_VALUE);
	const [newAccountName, setNewAccountName] = useState("");
	const [formError, setFormError] = useState<string | null>(null);

	const isEditing = mode === "edit";
	const showNewAccountInput =
		accounts.length === 0 || accountSelect === NEW_ACCOUNT_VALUE;

	// Reset form only when the dialog opens or the edited position changes.
	useEffect(() => {
		if (!open) return;

		if (mode === "edit" && position) {
			setTypeInput(position.type);
			setSymbolInput(position.symbol);
			setAmountInput(String(position.amount));
			setAccountSelect(position.accountId);
			setNewAccountName("");
		} else {
			setTypeInput("stock");
			setSymbolInput("");
			setAmountInput("");
			setAccountSelect(accounts[0]?.id ?? NEW_ACCOUNT_VALUE);
			setNewAccountName("");
		}
		setFormError(null);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only re-init on open/position
	}, [open, mode, position?.id]);

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

	function handleSubmit() {
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

		onSave(
			{
				accountId: accountResult.accountId,
				type: typeInput,
				symbol,
				amount,
			},
			accountResult.accounts,
		);
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) onClose();
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
						handleSubmit();
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
						{isEditing && onDelete ? (
							<Button
								type="button"
								variant="destructive"
								onClick={onDelete}
								className="sm:mr-auto"
							>
								Delete
							</Button>
						) : null}
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit">{isEditing ? "Save" : "Add"}</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
