import { motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { normalizeGithubAccount } from "../github";
import "./github-graph.css";

export { normalizeGithubAccount };

export type GithubGraphVariant = "github" | "graphite" | "ocean" | "violet";

export interface GithubContribution {
  date: string;
  count: number;
  level?: number;
}

interface GithubContributionCell extends GithubContribution {
  level: 0 | 1 | 2 | 3 | 4;
}

interface GithubGraphProps {
  account: string;
  months?: number;
  variant?: GithubGraphVariant;
  showAccount?: boolean;
  showLegend?: boolean;
  data?: readonly GithubContribution[];
}

interface GitHubActivityProps extends Omit<GithubGraphProps, "showAccount"> {
  title?: string;
}

type ResourceState =
  | { status: "loading" }
  | { status: "ready"; contributions: readonly GithubContribution[] }
  | { status: "error"; message: string };

const CONTRIBUTIONS_ENDPOINT = "https://github-contributions-api.jogruber.de/v4";
const VARIANTS: Record<GithubGraphVariant, readonly [string, string, string, string, string]> = {
  github: ["#252b2d", "#0e4429", "#006d32", "#26a641", "#39d353"],
  graphite: ["#202020", "#414141", "#686868", "#a0a0a0", "#e1e1e1"],
  ocean: ["#17232b", "#124e68", "#167c9f", "#2ba9c9", "#78d4e7"],
  violet: ["#251c30", "#482863", "#704096", "#a06bd0", "#d2a8f0"],
};

function dateFromISO(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? date
    : null;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function fallbackLevel(count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || maxCount <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((count / maxCount) * 4))) as 1 | 2 | 3 | 4;
}

function contributionFromValue(value: unknown): GithubContribution | null {
  if (typeof value !== "object" || value === null) return null;
  if (!("date" in value) || !("count" in value)) return null;
  if (typeof value.date !== "string" || dateFromISO(value.date) === null) return null;
  if (typeof value.count !== "number" || !Number.isFinite(value.count)) return null;
  const level = "level" in value ? value.level : undefined;
  if (level !== undefined && (typeof level !== "number" || !Number.isFinite(level))) return null;
  return { date: value.date, count: Math.max(0, value.count), level };
}

export function buildContributionWeeks(
  contributions: readonly GithubContribution[],
): GithubContributionCell[][] {
  const valid = contributions
    .map((item) => ({ ...item, parsedDate: dateFromISO(item.date) }))
    .filter(
      (item): item is GithubContribution & { parsedDate: Date } =>
        item.parsedDate !== null && Number.isFinite(item.count),
    )
    .sort((left, right) => left.date.localeCompare(right.date));

  const first = valid[0];
  const last = valid.at(-1);
  if (!first || !last) return [];

  const maxCount = Math.max(0, ...valid.map((item) => item.count));
  const byDate = new Map(valid.map((item) => [item.date, item]));
  const firstDate = first.parsedDate;
  const lastDate = last.parsedDate;
  const startDate = addDays(firstDate, -firstDate.getUTCDay());
  const endDate = addDays(lastDate, 6 - lastDate.getUTCDay());
  const cells: GithubContributionCell[] = [];

  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    const key = date.toISOString().slice(0, 10);
    const contribution = byDate.get(key);
    const count = Math.max(0, contribution?.count ?? 0);
    const explicitLevel = contribution?.level;
    const level =
      Number.isInteger(explicitLevel) && explicitLevel !== undefined && explicitLevel >= 0 && explicitLevel <= 4
        ? (count === 0 ? 0 : explicitLevel) as 0 | 1 | 2 | 3 | 4
        : fallbackLevel(count, maxCount);
    cells.push({ date: key, count, level });
  }

  return Array.from({ length: Math.ceil(cells.length / 7) }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  );
}

function selectRecentContributions(
  contributions: readonly GithubContribution[],
  months: number,
): GithubContribution[] {
  const valid = contributions
    .map((contribution) => ({ contribution, date: dateFromISO(contribution.date) }))
    .filter(
      (item): item is { contribution: GithubContribution; date: Date } => item.date !== null,
    );
  const latest = valid.reduce<Date | null>(
    (current, item) => current === null || item.date > current ? item.date : current,
    null,
  );
  if (latest === null) return [];

  const start = new Date(latest);
  start.setUTCMonth(start.getUTCMonth() - Math.max(1, Math.min(12, Math.round(months))));
  return valid.filter((item) => item.date >= start).map((item) => item.contribution);
}

function contributionLabel(contribution: GithubContributionCell): string {
  const date = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    dateFromISO(contribution.date) ?? new Date(),
  );
  return `${contribution.count} ${contribution.count === 1 ? "contribution" : "contributions"} · ${date}`;
}

export function GithubGraph({
  account,
  months = 6,
  variant = "graphite",
  showAccount = true,
  showLegend = false,
  data,
}: GithubGraphProps) {
  const reducedMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const normalizedAccount = useMemo(() => normalizeGithubAccount(account), [account]);
  const [resource, setResource] = useState<ResourceState>(() =>
    data ? { status: "ready", contributions: data } : { status: "loading" },
  );

  useEffect(() => {
    if (data) {
      setResource({ status: "ready", contributions: data });
      return;
    }
    if (normalizedAccount === null) {
      setResource({ status: "error", message: "Enter a valid GitHub username." });
      return;
    }

    const controller = new AbortController();
    setResource({ status: "loading" });
    void fetch(`${CONTRIBUTIONS_ENDPOINT}/${normalizedAccount}?y=last`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("GitHub account not found.");
        const payload: unknown = await response.json();
        if (typeof payload !== "object" || payload === null || !("contributions" in payload)) {
          throw new Error("No public contributions were returned.");
        }
        if (!Array.isArray(payload.contributions)) {
          throw new Error("No public contributions were returned.");
        }
        const contributions = payload.contributions.map(contributionFromValue);
        if (contributions.some((item) => item === null)) {
          throw new Error("The contribution data is invalid.");
        }
        return contributions.filter((item): item is GithubContribution => item !== null);
      })
      .then((contributions) => {
        if (!controller.signal.aborted) setResource({ status: "ready", contributions });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResource({
          status: "error",
          message: error instanceof Error ? error.message : "Could not load contributions.",
        });
      });
    return () => controller.abort();
  }, [data, normalizedAccount]);

  const weeks = useMemo(
    () => resource.status === "ready"
      ? buildContributionWeeks(selectRecentContributions(resource.contributions, months))
      : [],
    [months, resource],
  );
  const colors = VARIANTS[variant];

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (scroller) scroller.scrollLeft = scroller.scrollWidth;
  }, [weeks]);

  return (
    <div className="github-graph" aria-busy={resource.status === "loading"}>
      {showAccount ? <p className="github-graph__account">@{normalizedAccount ?? account}</p> : null}

      {resource.status === "loading" ? (
        <div className="github-graph__loading" aria-label="Loading contributions">
          {Array.from({ length: 182 }, (_, index) => <span key={index} />)}
        </div>
      ) : null}

      {resource.status === "error" ? (
        <p className="github-graph__message" role="alert">{resource.message}</p>
      ) : null}

      {resource.status === "ready" && weeks.length > 0 ? (
        <div className="github-graph__scroll" ref={scrollRef}>
          <div className="github-graph__grid" role="grid" aria-label={`GitHub contributions for ${normalizedAccount ?? account}`}>
            {weeks.map((week, weekIndex) => (
              <div className="github-graph__week" role="row" key={week[0]?.date ?? weekIndex}>
                {week.map((contribution, dayIndex) => {
                  const label = contributionLabel(contribution);
                  return (
                    <motion.span
                      aria-label={label}
                      className="github-graph__cell"
                      initial={reducedMotion ? false : { opacity: 0, scale: 0.45 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: reducedMotion ? 0 : weekIndex * 0.018 + dayIndex * 0.012 }}
                      role="gridcell"
                      style={{ backgroundColor: colors[contribution.level] }}
                      tabIndex={0}
                      title={label}
                      key={contribution.date}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {showLegend && resource.status === "ready" ? (
        <div className="github-graph__legend" aria-label="Contribution activity legend">
          <span>Less</span>
          {colors.map((color, level) => (
            <i aria-label={`Level ${level}`} key={color} style={{ backgroundColor: color }} />
          ))}
          <span>More</span>
        </div>
      ) : null}
    </div>
  );
}

export function GitHubActivity({ title = "GitHub activity", account, ...graphProps }: GitHubActivityProps) {
  const normalizedAccount = normalizeGithubAccount(account);
  return (
    <section className="github-activity" aria-labelledby="github-activity-heading">
      <div className="github-activity__content">
        <header>
          <h2 id="github-activity-heading">{title}</h2>
          {normalizedAccount ? (
            <a href={`https://github.com/${normalizedAccount}`} rel="noreferrer" target="_blank">
              @{normalizedAccount}
            </a>
          ) : null}
        </header>
        <GithubGraph {...graphProps} account={account} showAccount={false} />
      </div>
    </section>
  );
}
