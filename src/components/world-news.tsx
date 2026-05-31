"use client";

import { NewsFeed } from "@/components/news-feed";

export function WorldNews() {
	return <NewsFeed queryKey={["bbc-world"]} apiPath="/api/news/world" />;
}
