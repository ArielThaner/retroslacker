"use client";

import { useEffect, useState, useTransition } from "react";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Avatar } from "@/components/ui/avatar";
import { InsightSkeleton } from "@/components/ui/skeleton";
import {
  fetchInsights,
  fetchInsightsForUser,
  toggleDiscussed,
  addItemAsAction,
  addAllPatternsAsActions,
  generateActionsFromItems,
} from "./actions";
import { useRouter, useSearchParams } from "next/navigation";

type FilterMode = "active" | "added" | "archived" | "all";

interface SessionItem {
  id: number;
  text: string;
  userName: string;
  avatarColor: string;
  avatarUrl?: string | null;
  jobTitle?: string;
  source: string;
  discussed: boolean;
  addedAsAction: boolean;
}

interface Insights {
  sentiment: { score: number; summary: string };
  synopsis: string;
  patterns: { title: string; mentions: number; participants: number; sentiment: "positive" | "negative"; relatedUsers: string[]; relatedItems: string[] }[];
}

interface SessionClientProps {
  wentWellItems: SessionItem[];
  couldImproveItems: SessionItem[];
  sprintLabel: string;
  sessionStatus: string;
  existingInsights: Insights | null;
}

function SessionContent({
  wentWellItems,
  couldImproveItems,
  sprintLabel,
  sessionStatus,
  existingInsights,
}: SessionClientProps) {
  const [insights, setInsights] = useState<Insights | null>(existingInsights);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [filterMode, setFilterMode] = useState<FilterMode>("active");
  const [generatingActions, startGeneratingActions] = useTransition();
  const { addToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  // `from=actions` means the user came here via the back-arrow on /actions.
  // When that's the case we surface a forward-arrow link back to Actions so
  // they can round-trip without using the browser back button.
  const cameFromActions = searchParams.get("from") === "actions";

  useEffect(() => {
    // Fetch insights on first visit whenever we don't already have them. We
    // used to also require sessionStatus === "active", but the Session nav
    // link now opens the page even for pending sessions, so we should still
    // surface insights in the column rather than leave it empty.
    if (!insights) {
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


  // Filter semantics:
  //   • active   = not discussed AND not added as a follow-up
  //   • added    = marked as a follow-up task (regardless of discussed)
  //   • archived = discussed (i.e. "checked" off) — regardless of added
  //   • all      = everything
  // Items marked both discussed AND added will appear in both "added"
  // and "archived" views, which is intentional — they qualify for both.
  function matchesFilter(item: SessionItem): boolean {
    if (filterMode === "all") return true;
    if (filterMode === "added") return item.addedAsAction;
    if (filterMode === "archived") return item.discussed;
    // "active"
    return !item.discussed && !item.addedAsAction;
  }

  // Participant filter + active/added/archived/all filter, applied to both columns.
  const allParticipants = [...new Set([...wentWellItems, ...couldImproveItems].map((i) => i.userName))].sort();
  const filteredWentWell = (selectedUser ? wentWellItems.filter((i) => i.userName === selectedUser) : wentWellItems).filter(matchesFilter);
  const filteredCouldImprove = (selectedUser ? couldImproveItems.filter((i) => i.userName === selectedUser) : couldImproveItems).filter(matchesFilter);

  const groupByUser = (items: SessionItem[]) => {
    const groups: Record<
      string,
      { userName: string; avatarColor: string; avatarUrl?: string | null; jobTitle?: string; items: SessionItem[] }
    > = {};
    for (const item of items) {
      if (!groups[item.userName]) {
        groups[item.userName] = {
          userName: item.userName,
          avatarColor: item.avatarColor,
          avatarUrl: item.avatarUrl,
          jobTitle: item.jobTitle,
          items: [],
        };
      }
      groups[item.userName].items.push(item);
    }
    return Object.values(groups);
  };

  const wentWellGroups = groupByUser(filteredWentWell);
  const couldImproveGroups = groupByUser(filteredCouldImprove);

  // Counts for the filter chips. Overlaps are allowed — an item can be
  // both "added" and "archived" — so the numbers don't have to sum to
  // the total.
  const allItemsFlat = [...wentWellItems, ...couldImproveItems];
  const archivedCount = allItemsFlat.filter((i) => i.discussed).length;
  const addedCount = allItemsFlat.filter((i) => i.addedAsAction).length;
  const activeCount = allItemsFlat.filter((i) => !i.discussed && !i.addedAsAction).length;
  // "All retro items resolved" = every item has been either discussed
  // (checked) or added as a follow-up task. Used to swap the two
  // retro columns for a single celebration card that nudges the user
  // toward assigning follow-ups.
  const allResolved = allItemsFlat.length > 0 && activeCount === 0;

  // The "Assign Follow-ups" button now does double duty: first it asks
  // the AI to consolidate every marked retro item into specific
  // follow-ups, then it navigates to the Follow-ups page. If nothing
  // was marked, the server action returns an error which we surface as
  // a toast — we still navigate so the user can see any existing
  // follow-ups and assign them.
  function handleAssignActionItems() {
    startGeneratingActions(async () => {
      const result = await generateActionsFromItems();
      if (result.success) {
        addToast("Follow-ups generated", "success");
      } else if (result.error && result.error !== "No items have been added as actions") {
        addToast(result.error, "error");
      }
      router.push("/actions?from=session");
    });
  }

  async function handleAddAllPatterns() {
    const result = await addAllPatternsAsActions();
    if (result.success) {
      addToast("All pattern items marked", "success");
      router.refresh();
    } else {
      addToast(result.error ?? "Failed", "error");
    }
  }

  const USER_BORDER_COLORS: Record<string, string> = {};
  const allGroups = [...wentWellGroups, ...couldImproveGroups];
  for (const group of allGroups) {
    USER_BORDER_COLORS[group.userName] = group.avatarColor;
  }

  const filteredPatterns = insights?.patterns.filter((p) => p.mentions >= 2) ?? [];
  const selectedPatternData = selectedPattern !== null ? filteredPatterns[selectedPattern] : null;

  // Build a Set of highlighted item IDs based on the selected pattern
  const highlightedItemIds = new Set<number>();
  if (selectedPatternData) {
    const relatedTexts = selectedPatternData.relatedItems ?? [];
    const relatedNames = selectedPatternData.relatedUsers ?? [];
    const allItems = [...wentWellItems, ...couldImproveItems];

    for (const item of allItems) {
      // Check text match
      const itemLower = item.text.toLowerCase();
      const textMatch = relatedTexts.some((rt) => {
        const rtLower = rt.toLowerCase();
        return itemLower.includes(rtLower) || rtLower.includes(itemLower);
      });
      if (textMatch) {
        highlightedItemIds.add(item.id);
        continue;
      }
      // Check user match as fallback
      if (relatedTexts.length === 0 && relatedNames.includes(item.userName)) {
        highlightedItemIds.add(item.id);
      }
    }
  }

  const hasPatternSelected = selectedPatternData !== null;
  function isHighlighted(itemId: number): boolean {
    return highlightedItemIds.has(itemId);
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Forward link to Follow-ups — only shown when the user came here
          from /actions via its back-arrow, so they can go back forward. */}
      {cameFromActions && (
        <a
          href="/actions?from=session"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors mb-4 animate-fade-in"
        >
          Follow-ups
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </a>
      )}

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
            className="pl-4 pr-9 py-2.5 bg-surface border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40"
          >
            <option value="">All participants</option>
            {allParticipants.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Active / Added / Archived / All filter.
          • Active   = not yet discussed and not added as a follow-up
          • Added    = marked as a follow-up task
          • Archived = discussed (checked off) */}
      <div className="flex items-center gap-1 mb-5 animate-fade-in">
        <div className="bg-surface-hover border border-border rounded-xl p-1 flex">
          {(
            [
              { key: "active", label: "Active", count: activeCount },
              { key: "added", label: "Added", count: addedCount },
              { key: "archived", label: "Archived", count: archivedCount },
              { key: "all", label: "All", count: allItemsFlat.length },
            ] as const
          ).map((opt) => {
            const isActive = filterMode === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setFilterMode(opt.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  isActive
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {opt.label}
                <span
                  className={`text-[11px] tabular-nums rounded-full px-1.5 py-0.5 ${
                    isActive ? "bg-accent/10 text-accent" : "bg-background text-muted"
                  }`}
                >
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Three Column Layout: Went Well | Could Improve | Insights
          Columns use CSS `order` so the Insights JSX block (and its state
          handlers) can stay where it is in the file while rendering last.
          Once every item is resolved and the celebration card is showing,
          the Insights column is hidden so the milestone takes the full
          width — the AI insights here are derived from item content and
          become stale / noisy once the user has triaged everything. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* AI Insights — hidden on the all-resolved celebration view */}
        <div className={`md:order-3 ${allResolved && filterMode === "active" ? "hidden" : ""}`}>
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
            <div className="animate-fade-in bg-surface rounded-xl sticky top-20" style={{ border: "1px solid #E8E6F0" }}>
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

                {/* Pattern bulk helper. Marks every item belonging to any
                    pattern as a follow-up task. The AI consolidation
                    step runs automatically when the user clicks "Assign
                    Follow-ups" on the all-resolved celebration card, so
                    no separate generate button here. */}
                {filteredPatterns.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <button
                      type="button"
                      onClick={handleAddAllPatterns}
                      disabled={generatingActions}
                      className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-accent/40 text-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
                    >
                      Add all patterns as follow-up tasks
                    </button>
                    <p className="text-[10px] text-muted leading-relaxed text-center mt-2">
                      Once every retro item is resolved, tap <strong>Assign Follow-ups</strong> —
                      the AI will consolidate everything you&apos;ve marked into specific follow-ups.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-border border-dashed rounded-xl p-6 text-center animate-fade-in">
              <p className="text-sm text-muted">
                AI insights will appear here once the retro has started.
              </p>
            </div>
          )}
        </div>

        {allResolved && filterMode === "active" ? (
          /* Celebration card — shown on the Active tab once every retro
             item has been either discussed or added as a follow-up.
             Spans the full grid (Insights column is hidden on this view)
             so the milestone reads as a single clear moment, and its
             primary CTA (Assign Follow-ups) replaces the now-removed
             top-right button. */
          <div className="md:order-1 md:col-span-3 animate-fade-in">
            <div
              className="bg-white rounded-2xl p-10 text-center flex flex-col items-center gap-5"
              style={{ border: "1px solid #E8E6F0" }}
            >
              <div className="w-14 h-14 rounded-full bg-success/10 text-success flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div className="space-y-2 max-w-xl">
                <h2 className="text-2xl font-semibold text-foreground">
                  You resolved all of your retro items.
                </h2>
                <p className="text-base text-muted">
                  Now assign Follow-ups.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAssignActionItems}
                disabled={generatingActions}
                className="px-7 py-3.5 bg-accent hover:bg-accent-hover text-white text-base font-semibold rounded-xl transition-all active:scale-[0.98] shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {generatingActions ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Generating…
                  </>
                ) : (
                  "Assign Follow-ups"
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Went Well */}
            <div className="md:order-1">
              <div className="flex items-center gap-2 mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <h2 className="text-sm font-semibold text-foreground">Went Well</h2>
                <span className="text-xs text-muted bg-surface px-2 py-0.5 rounded-full">
                  {filteredWentWell.length}
                </span>
              </div>
              <UserGroupedList
                groups={wentWellGroups}
                hasPatternSelected={hasPatternSelected}
                isHighlighted={isHighlighted}
                onRefresh={() => router.refresh()}
              />
            </div>

            {/* Could Improve */}
            <div className="md:order-2">
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
              <UserGroupedList
                groups={couldImproveGroups}
                hasPatternSelected={hasPatternSelected}
                isHighlighted={isHighlighted}
                onRefresh={() => router.refresh()}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );

  // Helper: user-grouped list. Declared outside the JSX return to keep the
  // component tree readable. Defined in a sibling function below.
}

// ---------- User-grouped list with per-item discussed/add-action controls ----

interface UserGroup {
  userName: string;
  avatarColor: string;
  avatarUrl?: string | null;
  jobTitle?: string;
  items: SessionItem[];
}

function UserGroupedList({
  groups,
  hasPatternSelected,
  isHighlighted,
  onRefresh,
}: {
  groups: UserGroup[];
  hasPatternSelected: boolean;
  isHighlighted: (id: number) => boolean;
  onRefresh: () => void;
}) {
  if (groups.length === 0) {
    return (
      <div className="bg-surface border border-border border-dashed rounded-xl p-6 text-center">
        <p className="text-sm text-muted">No items match the current filter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div
          key={group.userName}
          className="bg-surface rounded-xl p-4 animate-fade-in"
          style={{ border: "1px solid #E8E6F0" }}
        >
          {/* Per-user header — rendered once, not repeated per item. */}
          <div className="flex items-center gap-3 mb-3">
            <Avatar
              name={group.userName}
              color={group.avatarColor}
              imageUrl={group.avatarUrl}
              size="lg"
            />
            <div className="leading-tight">
              <span className="text-sm font-semibold text-foreground block">
                {group.userName}
              </span>
              {group.jobTitle && (
                <span className="text-[11px] text-muted block">{group.jobTitle}</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            {group.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                dimmed={hasPatternSelected && !isHighlighted(item.id)}
                highlighted={hasPatternSelected && isHighlighted(item.id)}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ItemRow({
  item,
  dimmed,
  highlighted,
  onRefresh,
}: {
  item: SessionItem;
  dimmed: boolean;
  highlighted: boolean;
  onRefresh: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  // Optimistic state for instant feedback.
  const [discussed, setDiscussed] = useState(item.discussed);
  const [addedAsAction, setAddedAsAction] = useState(item.addedAsAction);

  function handleToggleDiscussed() {
    const next = !discussed;
    setDiscussed(next);
    startTransition(async () => {
      const result = await toggleDiscussed(item.id);
      if (!result.success) {
        setDiscussed(!next);
        addToast(result.error ?? "Failed to update", "error");
      } else {
        onRefresh();
      }
    });
  }

  function handleAddAsAction() {
    if (addedAsAction) return;
    setAddedAsAction(true);
    startTransition(async () => {
      const result = await addItemAsAction(item.id);
      if (!result.success) {
        setAddedAsAction(false);
        addToast(result.error ?? "Failed to add", "error");
      } else {
        addToast("Marked as follow-up task", "success");
        onRefresh();
      }
    });
  }

  return (
    <div
      className={`flex items-start gap-2 px-2 py-1.5 rounded-md transition-all ${
        highlighted ? "bg-accent/8 card-highlighted" : ""
      } ${dimmed ? "card-dimmed" : ""}`}
    >
      <p
        className={`flex-1 min-w-0 text-sm transition-colors ${
          discussed ? "text-muted line-through" : "text-foreground/90"
        }`}
      >
        {item.text}
      </p>

      {/* Add as follow-up (one-way). Once marked it gets a filled state and disables. */}
      <button
        type="button"
        onClick={handleAddAsAction}
        disabled={isPending || addedAsAction}
        title={addedAsAction ? "Already marked as follow-up" : "Add as follow-up"}
        className={`shrink-0 inline-flex items-center gap-1 text-[10px] px-1.5 py-1 rounded font-medium border transition-colors ${
          addedAsAction
            ? "bg-accent text-white border-accent"
            : "bg-surface text-accent border-accent/40 hover:bg-accent/10"
        } disabled:cursor-not-allowed`}
      >
        {addedAsAction ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        )}
        {addedAsAction ? "Added" : "Follow-up"}
      </button>

      {/* Archive toggle — replaces the former "discussed" checkbox. Semantics
          are unchanged (backed by the same `discussed` flag the DB uses to
          decide what lands in the Archived tab); only the affordance changed
          from a check-box to an archive-box icon, and its position moved to
          the right of the Follow-up button per the new session layout. */}
      <button
        type="button"
        onClick={handleToggleDiscussed}
        disabled={isPending}
        title={discussed ? "Unarchive" : "Archive"}
        aria-label={discussed ? "Unarchive" : "Archive"}
        className={`shrink-0 p-1 rounded transition-colors ${
          discussed
            ? "text-accent hover:bg-accent/10"
            : "text-muted hover:text-foreground hover:bg-surface-hover"
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="21 8 21 21 3 21 3 8" />
          <rect x="1" y="3" width="22" height="5" />
          <line x1="10" y1="12" x2="14" y2="12" />
        </svg>
      </button>
    </div>
  );
}

// (Former ActionsDrawer / ActionItemCard components removed — action items now
// live on the dedicated /actions page instead of a sidebar drawer on /session.)

export function SessionClient(props: SessionClientProps) {
  return (
    <ToastProvider>
      <SessionContent {...props} />
    </ToastProvider>
  );
}
