import type { NewsItem } from "@/lib/news-item"

export function NewsItemCard({ item }: { item: NewsItem }) {
	return (
		<li className="overflow-hidden py-5">
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
				className="mt-1 block text-lg font-medium leading-snug text-foreground visited:text-[#555] dark:visited:text-[#aaa] hover:underline"
			>
				{item.title}
			</a>
			{item.preview ? (
				<p className="mt-2 text-sm leading-relaxed text-black/70 dark:text-white/70">
					{item.preview}
				</p>
			) : null}
		</li>
	)
}
