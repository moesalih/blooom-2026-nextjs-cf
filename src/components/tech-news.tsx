"use client";

import { NewsFeed } from "@/components/news-feed";

export function TechNews() {
	return <NewsFeed queryKey={["techmeme"]} apiPath="/api/news/tech" />;
}
