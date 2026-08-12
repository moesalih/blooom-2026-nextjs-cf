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

type BasketSettingsDialogProps = {
	open: boolean;
	currency: string;
	onClose: () => void;
	onSave: (currency: string) => void;
};

export function BasketSettingsDialog({
	open,
	currency,
	onClose,
	onSave,
}: BasketSettingsDialogProps) {
	const [currencyInput, setCurrencyInput] = useState(currency);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setCurrencyInput(currency);
		setError(null);
	}, [open, currency]);

	function handleSubmit() {
		const symbol = currencyInput.trim().toUpperCase();
		if (!symbol || !/^[A-Z]{3}$/.test(symbol)) {
			setError("Enter a 3-letter currency code (e.g. USD, CAD, EUR).");
			return;
		}
		onSave(symbol);
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
					<DialogTitle>Portfolio settings</DialogTitle>
					<DialogDescription>
						Choose the currency used to display portfolio values. Positions are
						still priced in USD, then converted.
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
							<FieldLabel htmlFor="basket-currency">Currency</FieldLabel>
							<Input
								id="basket-currency"
								value={currencyInput}
								onChange={(event) => {
									setCurrencyInput(event.target.value.toUpperCase());
									setError(null);
								}}
								placeholder="USD"
								autoComplete="off"
								autoCapitalize="characters"
								spellCheck={false}
								maxLength={3}
							/>
							<p className="text-xs text-muted-foreground">
								3-letter code, e.g. USD, CAD, EUR, GBP. Rate is units per 1 USD.
							</p>
						</Field>
						{error ? (
							<p className="text-sm text-destructive">{error}</p>
						) : null}
					</FieldGroup>

					<DialogFooter className="mt-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit">Save</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
