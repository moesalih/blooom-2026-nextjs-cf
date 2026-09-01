"use client";

import { useQuery } from "@tanstack/react-query";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
	type TooltipContentProps,
} from "recharts";

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
const full = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });

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
								<div className="aspect-square w-full sm:aspect-[2/1]">
									<ResponsiveContainer>
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
											<Tooltip
												cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
												content={ChartTooltip}
												isAnimationActive={false}
											/>
											<Legend
												position={"top"}
												offset={10}
												wrapperStyle={{ color: "#888", fontSize: 12 }}
												iconType="square"
												iconSize={10}
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
									</ResponsiveContainer>
								</div>
							</section>
						))}
					</div>
				)}
			</main>
		</div>
	);
}

function ChartTooltip({ active, label, payload }: TooltipContentProps) {
	if (!active || !payload?.length) return null;

	return (
		<div className="rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-xs leading-5 text-neutral-100">
			<div className="mb-0.5 font-medium">{label}</div>
			{payload.map((item) => (
				<div key={String(item.dataKey)} className="flex items-center gap-1.5">
					<span
						className="inline-block size-2 shrink-0 rounded-[1px]"
						style={{ background: item.color ?? item.fill }}
					/>
					<span>
						{item.name}: {full.format(Number(item.value))}
					</span>
				</div>
			))}
		</div>
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
