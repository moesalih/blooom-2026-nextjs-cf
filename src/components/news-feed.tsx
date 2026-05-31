"use client";

import { NewsItemCard } from "@/components/news-item-card";
import type { NewsItem } from "@/lib/news-item";
import { useQuery } from "@tanstack/react-query";

async function fetchNewsFeed(apiPath: string): Promise<NewsItem[]> {
	const response = await fetch(apiPath);

	if (!response.ok) {
		throw new Error("Failed to load news");
	}

	const data = (await response.json()) as { items?: NewsItem[] };
	return data.items ?? [];
}

type NewsFeedProps = {
	queryKey: string[];
	apiPath: string;
};

export function NewsFeed({ queryKey, apiPath }: NewsFeedProps) {
	const { data: items, isPending, isError } = useQuery({
		queryKey,
		queryFn: () => fetchNewsFeed(apiPath),
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
