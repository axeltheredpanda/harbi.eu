"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AnalyticsReport, ReportPeriod } from "@/backend/analytics/report";
import { Sparkline } from "@/frontend/analytics/sparkline";

type Props = {
  report: AnalyticsReport;
};

function money(n: number): string {
  if (n < 0.01 && n > 0) return "< $0.01";
  return `$${n.toFixed(n < 10 ? 2 : 1)}`;
}

function ms(n: number | null): string {
  if (n == null) return "-";
  if (n < 1000) return `${Math.round(n)} ms`;
  return `${(n / 1000).toFixed(1)} s`;
}

function pct(n: number | null): string {
  if (n == null) return "-";
  return `${Math.round(n * 100)}%`;
}

const PERIODS: { id: ReportPeriod; label: string }[] = [
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "all", label: "all-time" },
];

export function AnalyticsReportView({ report }: Props) {
  const router = useRouter();
  const { claude, cutout, news, patterns, health, extras } = report;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-14">
      <header className="space-y-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
          Site health
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
            Usage report
          </h1>
          <nav className="flex gap-3 font-mono text-[11px] uppercase tracking-wide text-ink-faint">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  const q = p.id === "7d" ? "" : `?period=${p.id}`;
                  router.push(`/analytics${q}`);
                }}
                className={
                  report.period === p.id
                    ? "text-accent"
                    : "hover:text-ink-muted"
                }
              >
                {p.label}
              </button>
            ))}
          </nav>
        </div>
        <p className="max-w-prose text-lg leading-relaxed text-ink-muted">
          {report.glance}.
        </p>
      </header>

      {/* Claude */}
      <section className="space-y-6 border-t border-border pt-10">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          Claude
        </h2>
        <p className="font-display text-3xl leading-snug tracking-tight text-ink sm:text-4xl">
          {claude.totalTokens.toLocaleString("en-GB")}{" "}
          <span className="text-ink-muted">tokens exchanged</span>
        </p>
        <Sparkline
          values={claude.byDay.map((d) => d.value)}
          label="Tokens per day"
        />
        <div className="space-y-2 text-sm leading-relaxed text-ink-muted">
          <p>
            Input {claude.inputTokens.toLocaleString("en-GB")} · output{" "}
            {claude.outputTokens.toLocaleString("en-GB")} · {claude.turns}{" "}
            turns
          </p>
          <p>
            Est. cost this period {money(claude.costUsd)} · month-to-date{" "}
            {money(claude.monthCostUsd)}
            {claude.monthProjectionUsd != null
              ? ` · pace projects ${money(claude.monthProjectionUsd)} by month-end`
              : ""}
          </p>
          <p>
            Prompt cache hit {pct(claude.cacheHitRate)}
            {claude.cacheSavingsUsd > 0
              ? ` · ~${money(claude.cacheSavingsUsd)} saved vs full input rate`
              : ""}
          </p>
          <p>
            Avg first token {ms(claude.avgTtftMs)} · avg total{" "}
            {ms(claude.avgTotalMs)}
          </p>
        </div>

        {claude.byModel.length > 0 && (
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">
              By model
            </p>
            <ul className="divide-y divide-border border-t border-border">
              {claude.byModel.map((m) => (
                <li
                  key={m.model}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm"
                >
                  <span className="font-mono text-xs text-ink">{m.model}</span>
                  <span className="text-ink-muted">
                    {m.turns} turns · {m.tokens.toLocaleString("en-GB")} tok ·{" "}
                    {money(m.costUsd)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {claude.byConversation.length > 0 && (
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">
              Heaviest conversations
            </p>
            <ul className="divide-y divide-border border-t border-border">
              {claude.byConversation.map((c) => (
                <li key={c.id} className="py-2.5 text-sm">
                  <Link
                    href={`/chat?c=${c.id}`}
                    className="text-ink transition-colors hover:text-accent"
                  >
                    {c.title}
                  </Link>
                  <span className="mt-0.5 block font-mono text-[11px] text-ink-faint">
                    {c.tokens.toLocaleString("en-GB")} tok · {money(c.costUsd)} ·{" "}
                    {c.turns} turns
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Patterns */}
      <section className="space-y-6 border-t border-border pt-10">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          When you show up
        </h2>
        <p className="font-display text-2xl text-ink sm:text-3xl">
          {extras.longestStreakDays > 0
            ? `${extras.longestStreakDays}-day streak`
            : "No streak yet"}
          <span className="text-ink-muted"> ending today</span>
        </p>
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-ink-faint">
            Hour of day
          </p>
          <Sparkline
            values={patterns.byHour.map((h) => h.value)}
            label="Chat activity by hour"
            axisLabels={patterns.byHour.map((h) =>
              h.hour % 4 === 0 ? String(h.hour) : null,
            )}
          />
        </div>
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-ink-faint">
            Weekday
          </p>
          <Sparkline
            values={patterns.byWeekday.map((d) => d.value)}
            label="Chat activity by weekday"
            axisLabels={patterns.byWeekday.map((d) => d.day)}
          />
        </div>
        {patterns.topics.length > 0 && (
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">
              Topics
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
              {patterns.topics.map((t) => (
                <li key={t.topic}>
                  <span className="text-ink">{t.topic}</span>
                  <span className="font-mono text-[11px] text-ink-faint">
                    {" "}
                    · {t.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Cutout */}
      <section className="space-y-6 border-t border-border pt-10">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          Cutout
        </h2>
        <p className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
          {cutout.processed.toLocaleString("en-GB")}{" "}
          <span className="text-ink-muted">images</span>
        </p>
        <Sparkline
          values={cutout.byDay.map((d) => d.value)}
          label="Cutouts per day"
        />
        <div className="space-y-2 text-sm text-ink-muted">
          <p>
            Fast {cutout.fast} · quality {cutout.quality}
            {cutout.cacheHits > 0 ? ` · ${cutout.cacheHits} cache hits` : ""}
          </p>
          <p>
            Avg process {ms(cutout.avgDurationMs)}
            {cutout.failureRate != null
              ? ` · fail rate ${pct(cutout.failureRate)}`
              : ""}
          </p>
          <p className="text-ink-faint">{cutout.note}</p>
        </div>
      </section>

      {/* News */}
      <section className="space-y-6 border-t border-border pt-10">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          News shelf
        </h2>
        <p className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
          {news.itemsInPeriod.toLocaleString("en-GB")}{" "}
          <span className="text-ink-muted">items ingested</span>
        </p>
        <Sparkline
          values={news.itemsByDay.map((d) => d.value)}
          label="News items per day"
        />
        <p className="text-sm text-ink-muted">
          {news.feedsOk} feeds healthy
          {news.feedsUnreachable > 0
            ? ` · ${news.feedsUnreachable} unreachable (${news.unreachableNames.join(", ")})`
            : " · none unreachable"}
          {extras.newsReads > 0
            ? ` · ${extras.newsReads} marked read in period`
            : ""}
        </p>
      </section>

      {/* Health */}
      <section className="space-y-6 border-t border-border pt-10">
        <h2 className="font-display text-2xl font-medium tracking-tight text-ink">
          Technical health
        </h2>
        <p className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
          {health.claudeErrors + health.cutoutErrors + health.newsErrors}{" "}
          <span className="text-ink-muted">logged faults</span>
        </p>
        <Sparkline
          values={health.errorByDay.map((d) => d.value)}
          label="Errors per day"
        />
        <p className="text-sm text-ink-muted">
          Claude {health.claudeErrors} · cutout {health.cutoutErrors} · news{" "}
          {health.newsErrors}
        </p>
        <p className="text-sm text-ink-faint">{health.note}</p>
      </section>

      <footer className="border-t border-border pt-6">
        <p className="font-mono text-[11px] text-ink-faint">
          Generated {new Date(report.generatedAt).toISOString()} · costs are
          estimates · run{" "}
          <code className="text-ink-muted">supabase/analytics.sql</code> once
        </p>
      </footer>
    </div>
  );
}
