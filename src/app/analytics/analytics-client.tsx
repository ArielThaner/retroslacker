"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface RetroTrendPoint {
  sprint: string;
  sentiment: number;
  isCurrent: boolean;
}

interface WeeklyPoint {
  week: string;
  currentSprint: number;
  average: number;
}

interface AnalyticsClientProps {
  retroTrend: RetroTrendPoint[];
  weeklyData: WeeklyPoint[];
  sprintLabel: string;
}

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

export function AnalyticsClient({ retroTrend, weeklyData, sprintLabel }: AnalyticsClientProps) {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-xl font-semibold text-foreground">{sprintLabel}</h1>
        <p className="text-sm text-muted mt-0.5">Sentiment trends and retrospective analytics</p>
      </div>

      {/* Weekly Sentiment Chart */}
      <div className="bg-surface rounded-xl p-6 mb-6 animate-fade-in" style={{ border: "1px solid #E8E6F0" }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Weekly Sentiment</h2>
            <p className="text-xs text-muted mt-0.5">Current sprint vs. historical average</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full bg-accent" />
              <span className="text-xs text-muted">This sprint</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full bg-success" />
              <span className="text-xs text-muted">Average</span>
            </div>
          </div>
        </div>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={weeklyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E6F0" vertical={false} />
              <XAxis
                dataKey="week"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#7A778A", fontSize: 12 }}
                dy={10}
              />
              <YAxis
                domain={[0, 10]}
                ticks={[0, 2, 4, 6, 8, 10]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#7A778A", fontSize: 12 }}
                dx={-10}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="currentSprint"
                name="This Sprint"
                stroke="#4A3AFF"
                strokeWidth={2.5}
                dot={{ fill: "#4A3AFF", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#4A3AFF", strokeWidth: 2, stroke: "#fff" }}
              />
              <Line
                type="monotone"
                dataKey="average"
                name="Historical Avg"
                stroke="#00C48C"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={{ fill: "#00C48C", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#00C48C", strokeWidth: 2, stroke: "#fff" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Retro-over-Retro Sentiment Chart */}
      <div className="bg-surface rounded-xl p-6 animate-fade-in" style={{ border: "1px solid #E8E6F0" }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Retro Sentiment Trend</h2>
            <p className="text-xs text-muted mt-0.5">How team sentiment has evolved across sprints</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full bg-accent" />
            <span className="text-xs text-muted">Sentiment score</span>
          </div>
        </div>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={retroTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E6F0" vertical={false} />
              <XAxis
                dataKey="sprint"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#7A778A", fontSize: 12 }}
                dy={10}
              />
              <YAxis
                domain={[0, 10]}
                ticks={[0, 2, 4, 6, 8, 10]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#7A778A", fontSize: 12 }}
                dx={-10}
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
                      fill={isCurrent ? "#4A3AFF" : "#4A3AFF"}
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
    </main>
  );
}
