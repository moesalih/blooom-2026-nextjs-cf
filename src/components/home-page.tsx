import { CryptoPrices } from "./crypto-prices";
import { TechNews } from "./tech-news";
import { StockPrices } from "./stock-prices";

export function HomePage() {
	return (
		<div className="min-h-screen bg-background text-foreground">
			<header className=" border-black/10 dark:border-white/10">
				<div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
					<h1 className="text-2xl font-semibold tracking-tight">Blooom</h1>
				</div>
			</header>

			<main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
				<div className="grid gap-8 lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)]">
					<section>
						<TechNews />
					</section>
					<div className="flex flex-col gap-4">
						<StockPrices />
						<CryptoPrices />
					</div>
				</div>
			</main>
		</div>
	);
}
