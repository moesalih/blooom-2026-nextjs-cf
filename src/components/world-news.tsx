"use client";

import { NewsItemCard } from "@/components/news-item-card";
import type { NewsItem } from "@/lib/news-item";
import { useQuery } from "@tanstack/react-query";

async function fetchNewsItems(): Promise<NewsItem[]> {
	const response = await fetch("/api/news/world");

	if (!response.ok) {
		throw new Error("Failed to load news");
	}

	const data = (await response.json()) as { items?: NewsItem[] };
	return data.items ?? [];
}

export function WorldNews() {
	const { data: items, isPending, isError } = useQuery({
		queryKey: ["bbc-world"],
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
		<ul className="flex flex-col">
			{items.map((item) => (
				<NewsItemCard key={item.linkUrl} item={item} />
			))}
		</ul>
	);
}
