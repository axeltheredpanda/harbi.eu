import {
  buildAnalyticsReport,
  type ReportPeriod,
} from "@/backend/analytics/report";
import { AnalyticsReportView } from "./analytics-report-view";

type Props = {
  searchParams: Promise<{ period?: string }>;
};

export const metadata = {
  title: "Usage report",
};

function parsePeriod(raw?: string): ReportPeriod {
  if (raw === "30d" || raw === "all") return raw;
  return "7d";
}

export default async function AnalyticsPage({ searchParams }: Props) {
  const { period: raw } = await searchParams;
  const period = parsePeriod(raw);

  let report;
  try {
    report = await buildAnalyticsReport(period);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not build report";
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="font-display text-3xl text-ink">Usage report</h1>
        <p className="text-sm text-ink-muted">{message}</p>
        <p className="text-sm text-ink-faint">
          If tables are missing, run{" "}
          <code className="text-ink-muted">supabase/analytics.sql</code> in the
          Supabase SQL editor, then refresh.
        </p>
      </div>
    );
  }

  return <AnalyticsReportView report={report} />;
}
