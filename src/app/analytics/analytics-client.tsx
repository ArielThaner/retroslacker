"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getUserInitials } from "@/lib/utils";

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

interface AnalyticsClientProps {
  retroTrend: RetroTrendPoint[];
  weeklyData: Record<string, string | number>[];
  teamMembers: TeamMember[];
  sprintLabel: string;
}

const LINE_COLORS = ["#4A3AFF", "#00C48C", "#FFB946", "#FF4757", "#8F30A1"];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-3 shadow-lg">
      <p className="text-xs font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted">{entry.name}:</span>
          <span className="font-semibold text-foreground">{entry.value}/10</span>
        </div>
      ))}
    </div>
  );
}

function AvatarDot({ cx, cy, member, color }: { cx: number; cy: number; member: TeamMember; color: string }) {
  const size = 20;
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
          <circle cx={cx} cy={cy} r={half} fill="none" stroke="#fff" strokeWidth={1.5} />
        </>
      ) : (
        <>
          <circle cx={cx} cy={cy} r={half} fill={color} stroke="#fff" strokeWidth={1.5} />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={7} fontWeight={600}>
            {getUserInitials(member.name)}
          </text>
        </>
      )}
    </g>
  );
}

export function AnalyticsClient({ retroTrend, weeklyData, teamMembers, sprintLabel }: AnalyticsClientProps) {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 animate-fade-in">
        <h1 className="text-xl font-semibold text-foreground">{sprintLabel}</h1>
        <p className="text-sm text-muted mt-0.5">Sentiment trends and retrospective analytics</p>
      </div>

      {/* Section header */}
      <div className="flex items-center gap-2 mb-4 animate-fade-in">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <h2 className="text-sm font-semibold text-foreground">Sentiment</h2>
      </div>

      {/* Side-by-side charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">

        {/* Weekly Sentiment - Per Person */}
        <div className="bg-surface rounded-xl p-6" style={{ border: "1px solid #E8E6F0" }}>
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-foreground">Weekly Sentiment</h3>
            <p className="text-xs text-muted mt-0.5">Individual team member sentiment this sprint</p>
          </div>
          <div className="flex flex-wrap gap-3 mb-4">
            {teamMembers.map((m, i) => (
              <div key={m.name} className="flex items-center gap-1.5">
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
                <span className="text-[11px] text-muted">{m.name.split(" ")[0]}</span>
              </div>
            ))}
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={weeklyData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
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
                <Tooltip content={<CustomTooltip />} />
                {teamMembers.map((member, i) => (
                  <Line
                    key={member.name}
                    type="monotone"
                    dataKey={member.name}
                    name={member.name.split(" ")[0]}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={(props: { cx: number; cy: number; index: number }) => (
                      <AvatarDot
                        key={`${member.name}-${props.index}`}
                        cx={props.cx}
                        cy={props.cy}
                        member={member}
                        color={LINE_COLORS[i % LINE_COLORS.length]}
                      />
                    )}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                  />
                ))}
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
          <div className="flex items-center gap-1.5 mb-4">
            <span className="w-3 h-0.5 rounded-full bg-accent" />
            <span className="text-[11px] text-muted">Sentiment score</span>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={retroTrend} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
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
                  stroke="#4A3AFF"
                  strokeWidth={2.5}
                  dot={(props: { cx: number; cy: number; index: number }) => {
                    const isCurrent = retroTrend[props.index]?.isCurrent;
                    return (
                      <circle
                        key={props.index}
                        cx={props.cx}
                        cy={props.cy}
                        r={isCurrent ? 6 : 4}
                        fill="#4A3AFF"
                        stroke={isCurrent ? "#fff" : "none"}
                        strokeWidth={isCurrent ? 2 : 0}
                      />
                    );
                  }}
                  activeDot={{ r: 6, fill: "#4A3AFF", strokeWidth: 2, stroke: "#fff" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </main>
  );
}
