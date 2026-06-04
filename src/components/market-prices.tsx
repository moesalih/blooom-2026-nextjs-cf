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
			</div>
		</section>
	);
}
