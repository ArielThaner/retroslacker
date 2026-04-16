"use client";

import { useEffect, useState, useTransition } from "react";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Avatar } from "@/components/ui/avatar";
import { InsightSkeleton } from "@/components/ui/skeleton";
import { fetchInsights, fetchInsightsForUser, fetchActionItems, assignActionItem } from "./actions";
import { useRouter } from "next/navigation";

interface SessionItem {
  id: number;
  text: string;
  userName: string;
  avatarColor: string;
  avatarUrl?: string | null;
  jobTitle?: string;
  source: string;
}

interface ActionItemData {
  id: number;
  description: string;
  assignedUserId: number | null;
  assignedUserName: string | null;
}

interface UserOption {
  id: number;
  name: string;
}

interface Insights {
  sentiment: { score: number; summary: string };
  synopsis: string;
  patterns: { title: string; mentions: number; participants: number; sentiment: "positive" | "negative"; relatedUsers: string[]; relatedItems: string[] }[];
}

interface SessionClientProps {
  wentWellItems: SessionItem[];
  couldImproveItems: SessionItem[];
  actionItems: ActionItemData[];
  users: UserOption[];
  sprintLabel: string;
  sessionStatus: string;
  existingInsights: Insights | null;
}

function SessionContent({
  wentWellItems,
  couldImproveItems,
  actionItems,
  users,
  sprintLabel,
  sessionStatus,
  existingInsights,
}: SessionClientProps) {
  const [insights, setInsights] = useState<Insights | null>(existingInsights);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const { addToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!insights && sessionStatus === "active") {
      setLoadingInsights(true);
      fetchInsights().then((result) => {
        setLoadingInsights(false);
        if (result.success && result.insights) {
          setInsights(result.insights);
          addToast("AI insights generated", "success");
        }
      });
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Group items by user
  // Participant filter
  const allParticipants = [...new Set([...wentWellItems, ...couldImproveItems].map((i) => i.userName))].sort();
  const filteredWentWell = selectedUser ? wentWellItems.filter((i) => i.userName === selectedUser) : wentWellItems;
  const filteredCouldImprove = selectedUser ? couldImproveItems.filter((i) => i.userName === selectedUser) : couldImproveItems;

  const groupByUser = (items: SessionItem[]) => {
    const groups: Record<string, { userName: string; avatarColor: string; items: SessionItem[] }> = {};
    for (const item of items) {
      if (!groups[item.userName]) {
        groups[item.userName] = { userName: item.userName, avatarColor: item.avatarColor, items: [] };
      }
      groups[item.userName].items.push(item);
    }
    return Object.values(groups);
  };

  const wentWellGroups = groupByUser(filteredWentWell);
  const couldImproveGroups = groupByUser(filteredCouldImprove);

  const USER_BORDER_COLORS: Record<string, string> = {};
  const allGroups = [...wentWellGroups, ...couldImproveGroups];
  for (const group of allGroups) {
    USER_BORDER_COLORS[group.userName] = group.avatarColor;
  }

  const filteredPatterns = insights?.patterns.filter((p) => p.mentions >= 2) ?? [];
  const selectedPatternData = selectedPattern !== null ? filteredPatterns[selectedPattern] : null;
  const relatedItemTexts = selectedPatternData?.relatedItems ?? null;

  function isRelatedItem(itemText: string): boolean {
    if (!relatedItemTexts) return false;
    const normalized = itemText.toLowerCase().trim();
    return relatedItemTexts.some((ri) => {
      const rn = ri.toLowerCase().trim();
      return normalized.includes(rn) || rn.includes(normalized);
    });
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{sprintLabel}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-muted">
              {sessionStatus === "active" ? "Live retro session" : "Session complete"}
            </p>
            <span className="text-sm text-muted">&middot;</span>
            <span className="text-sm text-muted">{wentWellItems.length + couldImproveItems.length} items</span>
            <span className="text-sm text-muted">&middot;</span>
            <span className="text-sm text-muted">{new Set([...wentWellItems, ...couldImproveItems].map((i) => i.userName)).size} participants</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedUser}
            onChange={(e) => {
              const user = e.target.value;
              setSelectedUser(user);
              setSelectedPattern(null);
              setLoadingInsights(true);
              fetchInsightsForUser(user).then((result) => {
                setLoadingInsights(false);
                if (result.success && result.insights) {
                  setInsights(result.insights);
                }
              });
            }}
            className="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"
          >
            <option value="">All participants</option>
            {allParticipants.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          {sessionStatus === "active" && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-all active:scale-[0.98]"
            >
              Assign Actions
            </button>
          )}
        </div>
      </div>

      {/* Three Column Layout: Insights | Went Well | Could Improve */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* AI Insights */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
              <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
            </svg>
            <h2 className="text-sm font-semibold text-foreground">Insights</h2>
          </div>
          {loadingInsights ? (
            <div className="space-y-4">
              <InsightSkeleton />
              <InsightSkeleton />
              <InsightSkeleton />
            </div>
          ) : insights ? (
            <div className="animate-fade-in bg-surface rounded-lg shadow-sm sticky top-20" style={{ border: "0.5px solid #D1D5DB" }}>
              {/* Sentiment */}
              <div className="p-5 border-b border-border">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Sentiment</h3>
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => {
                    const color = insights.sentiment.score <= 3
                      ? "bg-danger"
                      : insights.sentiment.score <= 7
                        ? "bg-warning"
                        : "bg-success";
                    return (
                      <div
                        key={level}
                        className={`h-2 flex-1 rounded-full ${
                          level <= insights.sentiment.score ? color : "bg-border"
                        }`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] text-muted">Needs work</span>
                  <span className="text-[10px] text-muted">Great</span>
                </div>
                <p className="text-sm text-foreground/80">{insights.sentiment.summary}</p>
              </div>

              {/* Synopsis */}
              <div className="p-5 border-b border-border">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Sprint Synopsis</h3>
                <p className="text-sm text-foreground/80">{insights.synopsis}</p>
              </div>

              {/* Patterns */}
              <div className="p-5">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Patterns</h3>
                {(() => {
                  const filtered = insights.patterns.filter((p) => p.mentions >= 2);
                  if (filtered.length === 0) {
                    return <p className="text-sm text-muted italic">No associated patterns</p>;
                  }
                  return (
                    <div className="space-y-1">
                      {filtered.map((pattern, i) => {
                        const isSelected = selectedPattern === i;
                        return (
                          <div
                            key={i}
                            onClick={() => setSelectedPattern(isSelected ? null : i)}
                            className={`flex items-start gap-2 px-2 py-2 rounded-md cursor-pointer transition-all ${
                              isSelected
                                ? "bg-accent/8"
                                : "hover:bg-surface-hover"
                            }`}
                          >
                            {pattern.sentiment === "positive" ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success shrink-0 mt-0.5">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-danger shrink-0 mt-0.5">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                              </svg>
                            )}
                            <div>
                              <p className="text-sm font-medium text-foreground">{pattern.title}</p>
                              <p className="text-[11px] text-muted">{pattern.mentions} mentions &middot; {pattern.participants} participants</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : null}
        </div>

        {/* Went Well */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <h2 className="text-sm font-semibold text-foreground">Went Well</h2>
            <span className="text-xs text-muted bg-surface px-2 py-0.5 rounded-full">
              {filteredWentWell.length}
            </span>
          </div>
          <div className="space-y-4">
            {wentWellGroups.map((group) => (
              <div key={group.userName} className="space-y-4">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-lg p-3 animate-fade-in transition-all duration-200 ${
                      relatedItemTexts
                        ? isRelatedItem(item.text)
                          ? "bg-surface shadow-lg ring-1 ring-accent/20"
                          : "bg-surface-hover/60 shadow-none"
                        : "bg-surface shadow-sm"
                    }`}
                    style={{
                      border: "0.5px solid #D1D5DB",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={item.userName} color={item.avatarColor} imageUrl={item.avatarUrl} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center h-10">
                          <div className="leading-none">
                            <span className="text-sm font-semibold text-foreground block">{item.userName}</span>
                            {item.jobTitle && (
                              <span className="text-[10px] text-muted mt-0.5 block">{item.jobTitle}</span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-foreground/90 mt-1">{item.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Could Improve */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-warning">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h2 className="text-sm font-semibold text-foreground">Could Improve</h2>
            <span className="text-xs text-muted bg-surface px-2 py-0.5 rounded-full">
              {filteredCouldImprove.length}
            </span>
          </div>
          <div className="space-y-4">
            {couldImproveGroups.map((group) => (
              <div key={group.userName} className="space-y-4">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-lg p-3 animate-fade-in transition-all duration-200 ${
                      relatedItemTexts
                        ? isRelatedItem(item.text)
                          ? "bg-surface shadow-lg ring-1 ring-accent/20"
                          : "bg-surface-hover/60 shadow-none"
                        : "bg-surface shadow-sm"
                    }`}
                    style={{
                      border: "0.5px solid #D1D5DB",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={item.userName} color={item.avatarColor} imageUrl={item.avatarUrl} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center h-10">
                          <div className="leading-none">
                            <span className="text-sm font-semibold text-foreground block">{item.userName}</span>
                            {item.jobTitle && (
                              <span className="text-[10px] text-muted mt-0.5 block">{item.jobTitle}</span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-foreground/90 mt-1">{item.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {drawerOpen && (
        <ActionsDrawer
          actionItems={actionItems}
          users={users}
          onClose={() => setDrawerOpen(false)}
          onRefresh={() => router.refresh()}
        />
      )}
    </main>
  );
}

function ActionsDrawer({
  actionItems,
  users,
  onClose,
  onRefresh,
}: {
  actionItems: ActionItemData[];
  users: UserOption[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [isGenerating, startGenTransition] = useTransition();
  const { addToast } = useToast();

  useEffect(() => {
    if (actionItems.length === 0) {
      startGenTransition(async () => {
        const result = await fetchActionItems();
        if (result.success) {
          addToast("Action items generated", "success");
          onRefresh();
        } else {
          addToast(result.error ?? "Failed to generate", "error");
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/10" onClick={onClose} />
      <div
        className="absolute top-0 right-0 h-full w-full max-w-md bg-surface shadow-2xl flex flex-col animate-drawer-in"
        style={{ borderLeft: "0.5px solid #D1D5DB" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
              <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
            </svg>
            <h2 className="text-base font-semibold text-foreground">Action Items</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-foreground transition-colors rounded-md hover:bg-surface-hover"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isGenerating ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg p-4 space-y-2" style={{ border: "0.5px solid #D1D5DB" }}>
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-8 w-28 mt-2" />
                </div>
              ))}
            </div>
          ) : actionItems.length > 0 ? (
            <div className="space-y-3">
              {actionItems.map((action, i) => (
                <ActionItemCard
                  key={action.id}
                  action={action}
                  users={users}
                  index={i}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted text-center py-8">No action items yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionItemCard({
  action,
  users,
  index,
}: {
  action: ActionItemData;
  users: UserOption[];
  index: number;
}) {
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  function handleAssign(userId: string) {
    const formData = new FormData();
    formData.set("actionId", String(action.id));
    formData.set("userId", userId);

    startTransition(async () => {
      const result = await assignActionItem(formData);
      if (result.success) {
        addToast("Assignment updated", "success");
      }
    });
  }

  return (
    <div
      className="animate-fade-in bg-surface border border-border rounded-lg p-4 shadow-sm flex items-start gap-3"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <span className="text-accent font-bold text-sm mt-0.5">{index + 1}.</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground/90">{action.description}</p>
      </div>
      <div className="shrink-0">
        <select
          value={action.assignedUserId ?? ""}
          onChange={(e) => handleAssign(e.target.value)}
          disabled={isPending}
          className="px-2 py-1.5 bg-background border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50 disabled:opacity-50"
        >
          <option value="">Assign to...</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function SessionClient(props: SessionClientProps) {
  return (
    <ToastProvider>
      <SessionContent {...props} />
    </ToastProvider>
  );
}
