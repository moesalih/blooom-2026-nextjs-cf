import Link from "next/link";
import { ShoppingBasketIcon } from "lucide-react";
import { ColumnHeader } from "./price-list";
import { CryptoPrices } from "./crypto-prices";
import { INDEX_SYMBOLS, StockPrices, TopStockPrices } from "./stock-prices";

export function MarketPrices() {
	return (
		<section>
			<ColumnHeader>Stocks & Crypto</ColumnHeader>
			<div className="space-y-6 mt-6">
				<StockPrices symbols={INDEX_SYMBOLS} />
				<TopStockPrices />
				<CryptoPrices />
				<p>
					<Link
						href="/basket"
						className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
					>
						<ShoppingBasketIcon className="size-3.5" />
						Basket
					</Link>
				</p>
			</div>
		</section>
	);
}
