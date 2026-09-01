"use client";

import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart";

export type CsvChart = {
	title: string;
	metrics: string[];
	stacked: boolean;
};

export type CsvChartsConfig = {
	title: string;
	csvUrl: string;
	charts: CsvChart[];
};

const COLORS = [
	"rgb(54, 162, 235)",
	"rgb(255, 99, 132)",
	"rgb(255, 206, 86)",
	"rgb(75, 192, 192)",
	"rgb(153, 102, 255)",
	"rgb(255, 159, 64)",
];

const compact = new Intl.NumberFormat("en", {
	notation: "compact",
	maximumFractionDigits: 1,
});

export function CsvCharts({ config }: { config: CsvChartsConfig }) {
	const { data, isPending, error } = useQuery({
		queryKey: ["csv-charts", config.csvUrl],
		queryFn: async () => {
			const res = await fetch(config.csvUrl);
			if (!res.ok) throw new Error("Failed to load CSV");
			return parseCsv(await res.text());
		},
	});

	return (
		<div className="min-h-screen bg-background text-foreground">
			<main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
				<h1 className="mb-8 text-xl font-semibold tracking-tight">
					{config.title}
				</h1>
				{isPending && (
					<p className="text-muted-foreground">Loading data…</p>
				)}
				{error && (
					<p className="text-destructive">Could not load data.</p>
				)}
				{data && (
					<div className="flex flex-col gap-10">
						{config.charts.map((chart) => (
							<section key={chart.title}>
								<h2 className="mb-2 text-center font-medium ">
									{chart.title}
								</h2>
								<ChartContainer
									config={toChartConfig(chart.metrics)}
									className="aspect-square w-full sm:aspect-[2/1]"
								>
									<BarChart
										data={toChartData(data, chart.metrics)}
										margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
									>
										<CartesianGrid
											vertical={false}
											stroke="var(--border)"
										/>
										<XAxis
											dataKey="period"
											tick={{ fontSize: 12 }}
											tickLine={false}
											axisLine={false}
										/>
										<YAxis
											tick={{ fontSize: 12 }}
											tickLine={false}
											axisLine={false}
											tickFormatter={(v: number) => compact.format(v)}
										/>
										<ChartTooltip
											content={
												<ChartTooltipContent className="min-w-56 [&_.justify-between]:gap-4" />
											}
											isAnimationActive={false}
										/>
										<ChartLegend
											verticalAlign="top"
											content={
												<ChartLegendContent className="flex-wrap gap-x-3 gap-y-2 leading-tight text-muted-foreground" />
											}
											itemSorter={(item) =>
												chart.metrics.indexOf(String(item.dataKey))
											}
										/>
										{chart.metrics.map((metric, i) => (
											<Bar
												key={metric}
												dataKey={metric}
												fill={COLORS[i % COLORS.length]}
												stackId={chart.stacked ? "stack" : undefined}
												isAnimationActive={false}
											/>
										))}
									</BarChart>
								</ChartContainer>
							</section>
						))}
					</div>
				)}
			</main>
		</div>
	);
}

function toChartConfig(metrics: string[]): ChartConfig {
	return Object.fromEntries(
		metrics.map((metric, i) => [
			metric,
			{ label: metric, color: COLORS[i % COLORS.length] },
		]),
	);
}

type CsvData = { periods: string[]; series: Record<string, number[]> };

function parseCsv(text: string): CsvData {
	const rows = text
		.trim()
		.split(/\r?\n/)
		.map(splitCsvLine);
	const periods = rows[0].slice(1).map((p) => p.trim()).reverse();
	const series: Record<string, number[]> = {};
	for (const row of rows.slice(1)) {
		const name = row[0]?.trim();
		if (!name) continue;
		const values = row.slice(1).map(parseNumber);
		if (values.every((v) => v == null)) continue;
		series[name] = values.map((v) => v ?? 0).reverse();
	}
	return { periods, series };
}

function toChartData(csv: CsvData, metrics: string[]) {
	return csv.periods.map((period, i) => {
		const point: Record<string, string | number> = { period };
		for (const metric of metrics) {
			point[metric] = csv.series[metric]?.[i] ?? 0;
		}
		return point;
	});
}

function splitCsvLine(line: string): string[] {
	const out: string[] = [];
	let cur = "";
	let quoted = false;
	for (const ch of line) {
		if (ch === '"') {
			quoted = !quoted;
			continue;
		}
		if (ch === "," && !quoted) {
			out.push(cur);
			cur = "";
			continue;
		}
		cur += ch;
	}
	out.push(cur);
	return out;
}

function parseNumber(raw: string): number | null {
	const t = raw.trim();
	if (!t) return null;
	const n = Number(t.replace(/,/g, ""));
	return Number.isFinite(n) ? n : null;
}
