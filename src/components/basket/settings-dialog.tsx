"use client";

import { useEffect, useState } from "react";
import { ClipboardCopyIcon, ClipboardPasteIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
	FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	type BasketData,
	parseBasketJson,
	serializeBasketJson,
} from "@/lib/basket-storage";

type SyncStatus =
	| { kind: "idle" }
	| { kind: "success"; message: string }
	| { kind: "error"; message: string };

type BasketSettingsDialogProps = {
	open: boolean;
	currency: string;
	data: BasketData;
	onClose: () => void;
	onSave: (currency: string) => void;
	onImport: (data: BasketData) => void;
};

function clipboardUnavailableMessage() {
	return "Clipboard is not available in this browser.";
}

export function BasketSettingsDialog({
	open,
	currency,
	data,
	onClose,
	onSave,
	onImport,
}: BasketSettingsDialogProps) {
	const [currencyInput, setCurrencyInput] = useState(currency);
	const [error, setError] = useState<string | null>(null);
	const [syncStatus, setSyncStatus] = useState<SyncStatus>({ kind: "idle" });
	const [syncBusy, setSyncBusy] = useState(false);

	useEffect(() => {
		if (!open) return;
		setCurrencyInput(currency);
		setError(null);
	}, [open, currency]);

	useEffect(() => {
		if (!open) return;
		setSyncStatus({ kind: "idle" });
		setSyncBusy(false);
	}, [open]);

	function handleSubmit() {
		const symbol = currencyInput.trim().toUpperCase();
		if (!symbol || !/^[A-Z]{3}$/.test(symbol)) {
			setError("Enter a 3-letter currency code (e.g. USD, CAD, EUR).");
			return;
		}
		onSave(symbol);
	}

	async function handleExport() {
		if (syncBusy) return;
		if (!navigator.clipboard?.writeText) {
			setSyncStatus({ kind: "error", message: clipboardUnavailableMessage() });
			return;
		}

		setSyncBusy(true);
		try {
			await navigator.clipboard.writeText(serializeBasketJson(data));
			setSyncStatus({ kind: "success", message: "Copied portfolio JSON to clipboard." });
		} catch {
			setSyncStatus({
				kind: "error",
				message: "Could not copy to clipboard. Check browser permissions.",
			});
		} finally {
			setSyncBusy(false);
		}
	}

	async function handleImport() {
		if (syncBusy) return;
		if (!navigator.clipboard?.readText) {
			setSyncStatus({ kind: "error", message: clipboardUnavailableMessage() });
			return;
		}

		setSyncBusy(true);
		try {
			const raw = await navigator.clipboard.readText();
			const result = parseBasketJson(raw);
			if (!result.ok) {
				setSyncStatus({ kind: "error", message: result.error });
				return;
			}

			onImport(result.data);
			const count = result.data.positions.length;
			setSyncStatus({
				kind: "success",
				message:
					count === 1
						? "Imported 1 position from clipboard."
						: `Imported ${count} positions from clipboard.`,
			});
		} catch {
			setSyncStatus({
				kind: "error",
				message: "Could not read clipboard. Check browser permissions.",
			});
		} finally {
			setSyncBusy(false);
		}
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

						<FieldSeparator />

						<Field>
							<FieldTitle>Data sync</FieldTitle>
							<FieldDescription>
								Export copies this portfolio as JSON. Import reads JSON from the
								clipboard and replaces the current portfolio.
							</FieldDescription>
							<div className="flex gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={handleExport}
									disabled={syncBusy}
								>
									<ClipboardCopyIcon data-icon="inline-start" />
									Export
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={handleImport}
									disabled={syncBusy}
								>
									<ClipboardPasteIcon data-icon="inline-start" />
									Import
								</Button>
							</div>
							{syncStatus.kind !== "idle" ? (
								<p
									role="status"
									className={
										syncStatus.kind === "error"
											? "text-sm text-destructive"
											: "text-sm text-muted-foreground"
									}
								>
									{syncStatus.message}
								</p>
							) : null}
						</Field>
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
