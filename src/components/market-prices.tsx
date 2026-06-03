import { ColumnHeader } from "./price-list";
import { CryptoPrices } from "./crypto-prices";
import { StockPrices } from "./stock-prices";

export function MarketPrices() {
	return (
		<section>
			<ColumnHeader>Stocks & Crypto</ColumnHeader>
			<div className="space-y-6 mt-6">
				<StockPrices />
				<CryptoPrices />
			</div>
		</section>
	);
}
