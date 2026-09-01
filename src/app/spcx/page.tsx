import { CsvCharts } from "@/components/csv-charts";
import config from "@/lib/financials.json";

export default function SpcxPage() {
	return <CsvCharts config={config} />;
}
