"use client";

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

interface ActionData {
  sprint: string;
  assigned: number;
  completed: number;
}

interface AnalyticsClientProps {
  retroTrend: RetroTrendPoint[];
  weeklyData: Record<string, string | number>[];
  teamMembers: TeamMember[];
  actionData: ActionData[];
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

export function AnalyticsClient({ retroTrend, weeklyData, teamMembers, actionData, sprintLabel }: AnalyticsClientProps) {
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

        {/* Weekly Sentiment - Per Person */}
        <div className="bg-surface rounded-xl p-6" style={{ border: "1px solid #E8E6F0" }}>
          <div className="mb-4">
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
              <LineChart data={weeklyData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
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
                    dot={{ fill: LINE_COLORS[i % LINE_COLORS.length], r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
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
              <span className="w-3 h-3 rounded" style={{ backgroundColor: "#4A3AFF" }} />
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
              <Bar dataKey="assigned" name="Assigned" fill="#4A3AFF" radius={[4, 4, 0, 0]} barSize={28} />
              <Bar dataKey="completed" name="Completed" fill="#00C48C" radius={[4, 4, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}
