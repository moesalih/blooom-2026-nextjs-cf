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

export function TechNews() {
	const { data: items, isPending, isError } = useQuery({
		queryKey: ["techmeme"],
		queryFn: fetchNewsItems,
	});

	if (isPending) {
		return (
			<p className="text-sm text-black/60 dark:text-white/60">
				Loading news…
			</p>
		);
	}

	if (isError || !items?.length) {
		return (
			<p className="text-sm text-black/60 dark:text-white/60">
				Could not load news right now. Try again shortly.
			</p>
		);
	}

	return (
		<ul className="flex flex-col gap-8">
			{items.map((item) => (
				<li
					key={item.linkUrl}
					className="overflow-hidden border-b border-black/10 pb-8 last:border-0 dark:border-white/10"
				>
					<p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
						{item.source}
					</p>
					{item.imageUrl ? (
						<a
							href={item.linkUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="float-right mb-2 ml-3 mt-1"
						>
							<img
								src={item.imageUrl}
								alt=""
								className="max-h-24 max-w-28 rounded border border-foreground sm:max-h-28 sm:max-w-36"
							/>
						</a>
					) : null}
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
	);
}

