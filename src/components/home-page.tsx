import { ColumnHeader } from "./price-list";
import { CryptoPrices } from "./crypto-prices";
import { StockPrices } from "./stock-prices";
import { TechNews } from "./tech-news";
import { WorldNews } from "./world-news";

export function HomePage() {
	return (
		<div className="min-h-screen bg-background text-foreground">
			<header className=" border-black/10 dark:border-white/10">
				<div className="w-full px-4 py-6 sm:px-8 lg:px-10">
					<h1 className="text-xl font-semibold tracking-tight">Blooom</h1>
				</div>
			</header>

			<main className="w-full px-4 py-8 sm:px-8 lg:px-10">
				<div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,2.1fr)]">
					<div className="flex flex-col gap-4">
						<StockPrices />
						<CryptoPrices />
					</div>
					<section>
						<ColumnHeader>Tech News</ColumnHeader>
						<TechNews />
					</section>
					<section>
						<ColumnHeader>World News</ColumnHeader>
						<WorldNews />
					</section>
				</div>
			</main>
		</div>
	);
}
