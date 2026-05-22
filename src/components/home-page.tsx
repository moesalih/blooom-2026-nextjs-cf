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
			<header className=" border-black/10 dark:border-white/10">
				<div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
					<h1 className="text-2xl font-semibold tracking-tight">Blooom</h1>
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
								className="overflow-hidden border-b border-black/10 pb-8 last:border-0 dark:border-white/10"
							>
								{item.imageUrl ? (
									<a
										href={item.linkUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="float-right mb-2 ml-3"
									>
										<img
											src={item.imageUrl}
											alt=""
											className="max-h-24 max-w-28 rounded border border-foreground sm:max-h-28 sm:max-w-36"
										/>
									</a>
								) : null}
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
							</li>
						))}
					</ul>
				)}
			</main>
		</div>
	);
}
