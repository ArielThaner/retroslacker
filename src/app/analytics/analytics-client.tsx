"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from "recharts";
import { getUserInitials } from "@/lib/utils";
import { RETRO_TAGS, RETRO_TAG_STYLES, type RetroTag } from "@/lib/tags";

interface RetroTrendPoint {
  sprint: string;
  sentiment: number;
  isCurrent: boolean;
}

interface TeamMember {
  name: string;
  avatarUrl: string | null;
  avatarColor: string;
}

interface ActionData {
  sprint: string;
  assigned: number;
  completed: number;
}

interface TagFrequencyRow {
  tag: RetroTag;
  count: number;
  percent: number;
}

type TagTrendRow = { sprint: string } & Record<RetroTag, number>;

interface AnalyticsClientProps {
  retroTrend: RetroTrendPoint[];
  weeklyData: Record<string, string | number>[];
  teamMembers: TeamMember[];
  actionData: ActionData[];
  sprintLabel: string;
  tagIssueFrequency: TagFrequencyRow[];
  tagTrend: TagTrendRow[];
  totalIssueCards: number;
}

// Chart colors for each tag — medium-tone variant of the chip palette in
// src/lib/tags.ts so analytics matches the session/board chip styling.
const TAG_CHART_COLORS: Record<RetroTag, string> = {
  QA: RETRO_TAG_STYLES.QA.border,                         // #FCD34D
  "Design Solution": RETRO_TAG_STYLES["Design Solution"].border, // #C4B5FD
  Spec: RETRO_TAG_STYLES.Spec.border,                     // #93C5FD
  Development: RETRO_TAG_STYLES.Development.border,       // #6EE7B7
  Other: RETRO_TAG_STYLES.Other.border,                   // #D1D5DB
};

const LINE_COLORS = ["#8200DB", "#00C48C", "#FFB946", "#FF4757", "#8F30A1"];
const TEAM_AVERAGE_COLOR = "#1F1D2C"; // dark ink — primary focal point
const TEAM_AVERAGE_KEY = "__teamAverage";

function CustomTooltip({
  active,
  payload,
  label,
  filterNames,
}: {
  active?: boolean;
  payload?: { color: string; name: string; value: number; dataKey?: string }[];
  label?: string;
  filterNames?: string[] | null;
}) {
  if (!active || !payload?.length) return null;
  // When a member is hovered, filter tooltip rows to that member + team average.
  const rows = filterNames
    ? payload.filter((p) => filterNames.includes(p.name) || filterNames.includes(String(p.dataKey ?? "")))
    : payload;
  if (rows.length === 0) return null;
  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-3 shadow-lg">
      <p className="text-xs font-semibold text-foreground mb-1.5">{label}</p>
      {rows.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted">{entry.name}:</span>
          <span className="font-semibold text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function AvatarDot({ cx, cy, member, color, show }: { cx: number; cy: number; member: TeamMember; color: string; show: boolean }) {
  if (!show) {
    return <circle cx={cx} cy={cy} r={3} fill={color} stroke="#fff" strokeWidth={1.5} />;
  }
  const size = 22;
  const half = size / 2;
  return (
    <g>
      {member.avatarUrl ? (
        <>
          <defs>
            <clipPath id={`clip-${member.name.replace(/\s/g, "")}`}>
              <circle cx={cx} cy={cy} r={half} />
            </clipPath>
          </defs>
          <image
            href={member.avatarUrl}
            x={cx - half}
            y={cy - half}
            width={size}
            height={size}
            clipPath={`url(#clip-${member.name.replace(/\s/g, "")})`}
            preserveAspectRatio="xMidYMid slice"
          />
          <circle cx={cx} cy={cy} r={half} fill="none" stroke="#fff" strokeWidth={2} />
        </>
      ) : (
        <>
          <circle cx={cx} cy={cy} r={half} fill={color} stroke="#fff" strokeWidth={2} />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={7} fontWeight={600}>
            {getUserInitials(member.name)}
          </text>
        </>
      )}
    </g>
  );
}

export function AnalyticsClient({
  retroTrend,
  weeklyData,
  teamMembers,
  actionData,
  sprintLabel,
  tagIssueFrequency,
  tagTrend,
  totalIssueCards,
}: AnalyticsClientProps) {
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);

  // Enrich each row with a computed team average across all members.
  // Average excludes missing/NaN values so partial weeks still plot.
  const weeklyDataWithAverage = useMemo(() => {
    return weeklyData.map((row) => {
      const values: number[] = [];
      for (const m of teamMembers) {
        const v = Number(row[m.name]);
        if (Number.isFinite(v)) values.push(v);
      }
      const avg =
        values.length > 0
          ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
          : null;
      return { ...row, [TEAM_AVERAGE_KEY]: avg } as Record<string, string | number | null>;
    });
  }, [weeklyData, teamMembers]);

  // Render order drives SVG painter order. When nothing is hovered, members
  // paint first then the team average on top. When a member is hovered, we
  // paint the non-hovered members → team average → hovered member last, so the
  // hovered line visually sits above the average for max legibility.
  const memberRenderOrder = useMemo(() => {
    if (!hoveredMember) return teamMembers.map((m, i) => ({ member: m, colorIndex: i, hovered: false }));
    const others = teamMembers
      .map((m, i) => ({ member: m, colorIndex: i, hovered: false }))
      .filter((x) => x.member.name !== hoveredMember);
    const active = teamMembers
      .map((m, i) => ({ member: m, colorIndex: i, hovered: true }))
      .find((x) => x.member.name === hoveredMember);
    return active ? [...others, active] : others;
  }, [teamMembers, hoveredMember]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 animate-fade-in">
        <h1 className="text-xl font-semibold text-foreground">{sprintLabel}</h1>
        <p className="text-sm text-muted mt-0.5">Sentiment trends and retrospective analytics</p>
      </div>

      {/* Sentiment section header */}
      <div className="flex items-center gap-2 mb-4 animate-fade-in">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <h2 className="text-sm font-semibold text-foreground">Sentiment</h2>
      </div>

      {/* Side-by-side sentiment charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-fade-in">

        {/* Weekly Sentiment — Team Average (primary) with faint per-member context */}
        <div className="bg-surface rounded-xl p-6" style={{ border: "1px solid #E8E6F0" }}>
          <style>{`
            .weekly-sentiment-chart .recharts-line-curve,
            .weekly-sentiment-chart .recharts-line-dot {
              transition: stroke-opacity 180ms ease, stroke-width 180ms ease, fill-opacity 180ms ease, r 180ms ease;
            }
          `}</style>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Weekly Sentiment</h3>
            <p className="text-xs text-muted mt-0.5">
              Team average across the sprint — hover a member to compare
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* Team Average legend entry — primary */}
            <div className="flex items-center gap-1.5 pr-3 mr-1 border-r border-border">
              <span
                className="w-4 h-0.5 rounded-full"
                style={{ backgroundColor: TEAM_AVERAGE_COLOR }}
              />
              <span className="text-[11px] font-semibold text-foreground">Team Average</span>
            </div>

            {teamMembers.map((m, i) => {
              const isHovered = hoveredMember === m.name;
              const isDimmed = hoveredMember !== null && !isHovered;
              return (
                <button
                  key={m.name}
                  type="button"
                  onMouseEnter={() => setHoveredMember(m.name)}
                  onMouseLeave={() => setHoveredMember(null)}
                  onFocus={() => setHoveredMember(m.name)}
                  onBlur={() => setHoveredMember(null)}
                  className="flex items-center gap-1.5 transition-opacity duration-200"
                  style={{
                    opacity: isDimmed ? 0.25 : 1,
                    filter: isDimmed ? "grayscale(1)" : "none",
                  }}
                  aria-pressed={isHovered}
                >
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt={m.name} className="w-4 h-4 rounded-full object-cover" />
                  ) : (
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[6px] font-bold"
                      style={{ backgroundColor: LINE_COLORS[i] }}
                    >
                      {getUserInitials(m.name)}
                    </span>
                  )}
                  <span
                    className={`text-[11px] transition-colors ${
                      isHovered ? "font-semibold text-foreground" : "text-muted"
                    }`}
                  >
                    {m.name.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="weekly-sentiment-chart" style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={weeklyDataWithAverage} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E6F0" vertical={false} />
                <XAxis
                  dataKey="week"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#7A778A", fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#7A778A", fontSize: 11 }}
                  dx={-5}
                />
                <Tooltip
                  content={
                    <CustomTooltip
                      filterNames={hoveredMember ? [hoveredMember.split(" ")[0], "Team Average"] : null}
                    />
                  }
                />

                {/* Painter order (SVG = later wins):
                    1) All non-hovered member lines (faint, dotted) — background context.
                    2) Team Average — primary focal point.
                    3) Hovered member (if any) — solid, bright, sits above the average. */}
                {memberRenderOrder
                  .filter((x) => !x.hovered)
                  .map(({ member, colorIndex }) => {
                    const color = LINE_COLORS[colorIndex % LINE_COLORS.length];
                    const dimmed = hoveredMember !== null;
                    return (
                      <Line
                        key={member.name}
                        type="monotone"
                        dataKey={member.name}
                        name={member.name.split(" ")[0]}
                        stroke={color}
                        strokeWidth={1.25}
                        strokeDasharray="4 3"
                        strokeOpacity={dimmed ? 0.12 : 0.35}
                        dot={{ fill: color, r: 2, strokeWidth: 0, fillOpacity: dimmed ? 0.15 : 0.4 }}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                    );
                  })}

                {/* Team Average — primary focal point */}
                <Line
                  type="monotone"
                  dataKey={TEAM_AVERAGE_KEY}
                  name="Team Average"
                  stroke={TEAM_AVERAGE_COLOR}
                  strokeWidth={3}
                  dot={{ fill: TEAM_AVERAGE_COLOR, r: 4, strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6, fill: TEAM_AVERAGE_COLOR, strokeWidth: 2, stroke: "#fff" }}
                  isAnimationActive={false}
                />

                {/* Hovered member — painted last so it layers above the average. */}
                {memberRenderOrder
                  .filter((x) => x.hovered)
                  .map(({ member, colorIndex }) => {
                    const color = LINE_COLORS[colorIndex % LINE_COLORS.length];
                    return (
                      <Line
                        key={`${member.name}-hover`}
                        type="monotone"
                        dataKey={member.name}
                        name={member.name.split(" ")[0]}
                        stroke={color}
                        strokeWidth={2.75}
                        strokeOpacity={1}
                        dot={{ fill: color, r: 3.5, strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                        isAnimationActive={false}
                      />
                    );
                  })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Retro-over-Retro Sentiment */}
        <div className="bg-surface rounded-xl p-6" style={{ border: "1px solid #E8E6F0" }}>
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-foreground">Retro Trend</h3>
            <p className="text-xs text-muted mt-0.5">Team sentiment across sprints</p>
          </div>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={retroTrend} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E6F0" vertical={false} />
                <XAxis
                  dataKey="sprint"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#7A778A", fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#7A778A", fontSize: 11 }}
                  dx={-5}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="sentiment"
                  name="Sentiment"
                  stroke="#8200DB"
                  strokeWidth={2.5}
                  dot={(props: { cx?: number; cy?: number; index?: number }) => {
                    const idx = props.index ?? 0;
                    const isCurrent = retroTrend[idx]?.isCurrent;
                    return (
                      <circle
                        key={idx}
                        cx={props.cx ?? 0}
                        cy={props.cy ?? 0}
                        r={isCurrent ? 6 : 4}
                        fill="#8200DB"
                        stroke={isCurrent ? "#fff" : "none"}
                        strokeWidth={isCurrent ? 2 : 0}
                      />
                    );
                  }}
                  activeDot={{ r: 6, fill: "#8200DB", strokeWidth: 2, stroke: "#fff" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Action Items section header */}
      <div className="flex items-center gap-2 mb-4 animate-fade-in">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
        <h2 className="text-sm font-semibold text-foreground">Action Items</h2>
      </div>

      {/* Action Items Bar Chart */}
      <div className="bg-surface rounded-xl p-6 animate-fade-in" style={{ border: "1px solid #E8E6F0" }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Actions by Sprint</h3>
            <p className="text-xs text-muted mt-0.5">Assigned vs completed action items per retro</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: "#8200DB" }} />
              <span className="text-[11px] text-muted">Assigned</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: "#00C48C" }} />
              <span className="text-[11px] text-muted">Completed</span>
            </div>
          </div>
        </div>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={actionData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E6F0" vertical={false} />
              <XAxis
                dataKey="sprint"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#7A778A", fontSize: 11 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#7A778A", fontSize: 11 }}
                dx={-5}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="assigned" name="Assigned" fill="#8200DB" radius={[4, 4, 0, 0]} barSize={28} />
              <Bar dataKey="completed" name="Completed" fill="#00C48C" radius={[4, 4, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <TagAnalyticsSection
        tagIssueFrequency={tagIssueFrequency}
        tagTrend={tagTrend}
        totalIssueCards={totalIssueCards}
      />
    </main>
  );
}

// =============================================================================
// Tag analytics — tag-issue frequency + per-sprint tag trend. Cards can carry
// multiple tags, so all percentages are expressed as "% of cards carrying this
// tag" and may sum to more than 100% across tags within a sprint.
// =============================================================================

function TagAnalyticsSection({
  tagIssueFrequency,
  tagTrend,
  totalIssueCards,
}: {
  tagIssueFrequency: TagFrequencyRow[];
  tagTrend: TagTrendRow[];
  totalIssueCards: number;
}) {
  const [hoveredFreqTag, setHoveredFreqTag] = useState<RetroTag | null>(null);

  // Biggest bar defines the scale for the horizontal bar chart.
  const maxCount = tagIssueFrequency.reduce((m, r) => Math.max(m, r.count), 0) || 1;

  return (
    <>
      {/* Tags section header */}
      <div className="flex items-center gap-2 mt-8 mb-4 animate-fade-in">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent"
        >
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
        <h2 className="text-sm font-semibold text-foreground">Tags</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
        {/* ---------- Tag Issue Frequency ---------- */}
        <div className="bg-surface rounded-xl p-6" style={{ border: "1px solid #E8E6F0" }}>
          <div className="mb-5 flex items-baseline justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Tag Issue Frequency</h3>
              <p className="text-xs text-muted mt-0.5">
                Tags appearing most on pain-point cards this sprint
              </p>
            </div>
            <span className="text-[11px] text-muted whitespace-nowrap">
              {totalIssueCards} issue {totalIssueCards === 1 ? "card" : "cards"}
            </span>
          </div>

          {tagIssueFrequency.length === 0 ? (
            <div className="bg-background border border-border border-dashed rounded-lg p-8 text-center">
              <p className="text-sm text-muted">No pain-point cards yet this sprint.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tagIssueFrequency.map((row) => {
                const color = TAG_CHART_COLORS[row.tag];
                const textColor = RETRO_TAG_STYLES[row.tag].text;
                const widthPct = Math.round((row.count / maxCount) * 100);
                const isHovered = hoveredFreqTag === row.tag;
                const isDimmed = hoveredFreqTag !== null && !isHovered;
                return (
                  <div
                    key={row.tag}
                    onMouseEnter={() => setHoveredFreqTag(row.tag)}
                    onMouseLeave={() => setHoveredFreqTag(null)}
                    className="transition-opacity duration-150"
                    style={{ opacity: isDimmed ? 0.4 : 1 }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[11px] font-medium px-1.5 py-0.5 rounded border"
                        style={{
                          backgroundColor: RETRO_TAG_STYLES[row.tag].bg,
                          color: textColor,
                          borderColor: RETRO_TAG_STYLES[row.tag].border,
                        }}
                      >
                        {row.tag}
                      </span>
                      <span className="text-[11px] tabular-nums text-muted">
                        <span className="font-semibold text-foreground">{row.count}</span>{" "}
                        <span className="text-muted">· {row.percent}%</span>
                      </span>
                    </div>
                    <div className="h-2.5 bg-background rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: color,
                          opacity: isDimmed ? 0.5 : 1,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              <p className="text-[10px] text-muted pt-2 leading-relaxed">
                Percentages are share of pain-point cards carrying this tag. Since a card
                can have multiple tags, these may sum to more than 100%.
              </p>
            </div>
          )}
        </div>

        {/* ---------- Tag Trend Over Time ---------- */}
        <div className="bg-surface rounded-xl p-6" style={{ border: "1px solid #E8E6F0" }}>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Tag Trend Over Time</h3>
            <p className="text-xs text-muted mt-0.5">
              Share of cards per sprint carrying each tag — last 8 sprints
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mb-4">
            {RETRO_TAGS.map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-sm border"
                  style={{
                    backgroundColor: TAG_CHART_COLORS[t],
                    borderColor: RETRO_TAG_STYLES[t].text,
                  }}
                />
                <span className="text-[11px] text-muted">{t}</span>
              </div>
            ))}
          </div>

          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <AreaChart
                data={tagTrend}
                margin={{ top: 10, right: 15, left: -10, bottom: 5 }}
              >
                <defs>
                  {RETRO_TAGS.map((t) => (
                    <linearGradient key={t} id={`tagFill-${t.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={TAG_CHART_COLORS[t]} stopOpacity={0.75} />
                      <stop offset="100%" stopColor={TAG_CHART_COLORS[t]} stopOpacity={0.35} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E6F0" vertical={false} />
                <XAxis
                  dataKey="sprint"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#7A778A", fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#7A778A", fontSize: 11 }}
                  dx={-5}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                {RETRO_TAGS.map((t) => (
                  <Area
                    key={t}
                    type="monotone"
                    dataKey={t}
                    name={t}
                    stackId="tags"
                    stroke={RETRO_TAG_STYLES[t].text}
                    strokeWidth={1.25}
                    fill={`url(#tagFill-${t.replace(/\s/g, "")})`}
                    isAnimationActive={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-muted pt-2 leading-relaxed">
            Each band is the % of cards carrying that tag. Because cards can have
            multiple tags, the stacked total may exceed 100% per sprint.
          </p>
        </div>
      </div>
    </>
  );
}
