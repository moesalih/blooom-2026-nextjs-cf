"use client";

import type { TechmemeNewsItem } from "@/lib/techmeme";
import { useQuery } from "@tanstack/react-query";

async function fetchNewsItems(): Promise<TechmemeNewsItem[]> {
	const response = await fetch("/api/techmeme");

	if (!response.ok) {
		throw new Error("Failed to load news");
	}

	const data = (await response.json()) as { items?: TechmemeNewsItem[] };
	return data.items ?? [];
}

export function HomePage() {
	const { data: items, isPending, isError } = useQuery({
		queryKey: ["techmeme"],
		queryFn: fetchNewsItems,
	});

	return (
		<div className="min-h-screen bg-background text-foreground">
			<header className="border-b border-black/10 dark:border-white/10">
				<div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
					<h1 className="text-2xl font-semibold tracking-tight">Top News</h1>
					<p className="mt-1 text-sm text-black/60 dark:text-white/60">
						From{" "}
						<a
							href="https://www.techmeme.com/"
							target="_blank"
							rel="noopener noreferrer"
							className="underline underline-offset-2 hover:text-foreground"
						>
							Techmeme
						</a>
					</p>
				</div>
			</header>

			<main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
				{isPending ? (
					<p className="text-sm text-black/60 dark:text-white/60">
						Loading news…
					</p>
				) : isError || !items?.length ? (
					<p className="text-sm text-black/60 dark:text-white/60">
						Could not load news right now. Try again shortly.
					</p>
				) : (
					<ul className="flex flex-col gap-8">
						{items.map((item) => (
							<li
								key={item.linkUrl}
								className="flex items-start gap-4 border-b border-black/10 pb-8 last:border-0 dark:border-white/10"
							>
								<div className="min-w-0 flex-1">
									<p className="text-xs font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
										{item.source}
									</p>
									<a
										href={item.linkUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="mt-1 block text-lg font-medium leading-snug hover:underline"
									>
										{item.title}
									</a>
									{item.preview ? (
										<p className="mt-2 text-sm leading-relaxed text-black/70 dark:text-white/70">
											{item.preview}
										</p>
									) : null}
								</div>
								{item.imageUrl ? (
									<a
										href={item.linkUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="shrink-0"
									>
										<img
											src={item.imageUrl}
											alt=""
											className="max-h-28 max-w-40 rounded"
										/>
									</a>
								) : null}
							</li>
						))}
					</ul>
				)}
			</main>
		</div>
	);
}
