"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { RetroColumn, type RetroItemData } from "./retro-column";
import { MessageView } from "./message-view";
import { startSession } from "./actions";
import { updateActionStatus, updateActionNote } from "../session/actions";
import { useRouter } from "next/navigation";
import { getUserInitials } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

type BoardItem = RetroItemData;

export interface FullItem {
  id: number;
  text: string;
  category: string;
  source: string;
  content: string;
  tags: string[];
  week: number;
  createdAt: string;
}

export interface MyPreviousAction {
  id: number;
  description: string;
  status: string;
  note: string;
  relatedCount: number;
}

interface BoardClientProps {
  wentWellItems: BoardItem[];
  couldImproveItems: BoardItem[];
  allItems: FullItem[];
  sprintLabel: string;
  myPreviousActions: MyPreviousAction[];
  previousSprintLabel: string | null;
  userName: string;
  userJobTitle: string;
  userAvatarColor: string;
  userAvatarUrl?: string | null;
}

type ViewMode = "columns" | "messages";

/**
 * Vertical "my action" card shown on the Home dashboard. Layout:
 *   - Header row: small avatar + name + job title
 *   - Description: the action item text
 *   - Note: a collapsible textarea, toggled by the note icon. If a note
 *     already exists we render it open by default so it's never hidden.
 *   - Footer: Complete / Undo button on the right, note toggle on the left
 *
 * Status + note writes go through the shared server actions in
 * `/session/actions.ts`; both revalidate `/home` so the server render
 * stays in sync with the optimistic local state used here.
 */
function MyActionCard({
  action,
  userName,
  userJobTitle,
  userAvatarColor,
  userAvatarUrl,
}: {
  action: MyPreviousAction;
  userName: string;
  userJobTitle: string;
  userAvatarColor: string;
  userAvatarUrl?: string | null;
}) {
  const [status, setStatus] = useState(action.status);
  const [note, setNote] = useState(action.note);
  const [noteOpen, setNoteOpen] = useState(action.note.length > 0);
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();
  const router = useRouter();

  const done = status === "completed";

  function handleToggleDone() {
    const next = done ? "active" : "completed";
    setStatus(next);
    startTransition(async () => {
      const res = await updateActionStatus(action.id, next);
      if (res.success) {
        router.refresh();
      } else {
        setStatus(action.status);
        addToast(res.error ?? "Failed to update", "error");
      }
    });
  }

  function handleSaveNote() {
    startTransition(async () => {
      const res = await updateActionNote(action.id, note);
      if (res.success) {
        addToast(note.trim() ? "Note saved" : "Note cleared", "success");
        router.refresh();
      } else {
        addToast(res.error ?? "Failed to save note", "error");
      }
    });
  }

  return (
    <div
      className="bg-white rounded-2xl p-6 flex flex-col gap-3 transition-all min-h-[260px]"
      style={{ opacity: done ? 0.7 : 1, border: "1px solid #E8E6F0" }}
    >
      {/* Assignee header — this action belongs to the signed-in user, so
          we just show their own identity for visual parity with the team
          session cards. */}
      <div className="flex items-center gap-2.5">
        <Avatar name={userName} color={userAvatarColor} imageUrl={userAvatarUrl ?? undefined} size="sm" />
        <div className="min-w-0 leading-tight">
          <p className="text-sm font-medium text-foreground truncate">{userName}</p>
          {userJobTitle && (
            <p className="text-xs text-muted truncate">{userJobTitle}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <p className={`text-sm ${done ? "text-muted line-through" : "text-foreground/90"}`}>
        {action.description}
      </p>

      {/* Spacer pushes the associated-items row, note, and footer to the
          bottom so cards in a row line up neatly regardless of
          description length. */}
      <div className="flex-1" />

      {/* Associated retro items — anchored just above the footer. Read-only
          count for now; could become a popover link later. */}
      <div className="flex items-center gap-2 text-xs text-muted">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span>Associated retro items</span>
        <span className="ml-auto tabular-nums bg-surface rounded-full px-2 py-0.5 text-foreground/80 font-medium">
          {action.relatedCount}
        </span>
      </div>

      {/* Optional note — collapsed until the note icon is clicked (or the
          card loads with an existing note). Textarea auto-saves via
          explicit "Save" button to avoid thrashing the server on each
          keystroke. */}
      {noteOpen && (
        <div className="animate-fade-in">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note — progress, blockers, links…"
            rows={3}
            className="w-full text-sm bg-surface border border-border rounded-lg p-2.5 text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/50 resize-none"
          />
          <div className="flex items-center justify-end gap-2 mt-1.5">
            <button
              type="button"
              onClick={() => {
                setNote(action.note);
                setNoteOpen(action.note.length > 0);
              }}
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={isPending || note === action.note}
              className="text-xs px-2.5 py-1 bg-accent hover:bg-accent-hover text-white rounded-md transition-colors disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => setNoteOpen((v) => !v)}
          title={noteOpen ? "Hide note" : "Add note"}
          aria-label={noteOpen ? "Hide note" : "Add note"}
          className={`p-1.5 rounded-md transition-colors ${
            noteOpen || note.length > 0
              ? "text-accent hover:bg-accent/10"
              : "text-muted hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="17" x2="13" y2="17" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleToggleDone}
          disabled={isPending}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${
            done
              ? "bg-surface text-muted hover:text-foreground"
              : "bg-success/10 hover:bg-success/15 text-success"
          }`}
        >
          {done ? (
            "Undo"
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Mark Complete
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function BoardContent({
  wentWellItems,
  couldImproveItems,
  allItems,
  sprintLabel,
  myPreviousActions,
  previousSprintLabel,
  userName,
  userJobTitle,
  userAvatarColor,
  userAvatarUrl,
}: BoardClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("columns");
  const [isStarting, startTransition] = useTransition();
  const { addToast } = useToast();
  const router = useRouter();

  // Countdown until the "Join Retro" button appears. Starts at 20s on
  // page load. Anchored to a mount-time start timestamp so the timer
  // advances based on real elapsed time rather than tick counts — this
  // means a render storm or brief stall can't "skip" it to zero, and a
  // user click on the countdown can't race the interval into finishing
  // early. (Previous implementation recreated the interval on every
  // state change, which was the source of the click-bypass bug.)
  const COUNTDOWN_SECONDS = 20;
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const startAtRef = useRef<number | null>(null);

  useEffect(() => {
    startAtRef.current = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - (startAtRef.current ?? Date.now())) / 1000);
      const remaining = Math.max(0, COUNTDOWN_SECONDS - elapsed);
      setSecondsLeft(remaining);
      if (remaining === 0) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
    // Mount-only: no deps so the interval is never torn down mid-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStartSession() {
    startTransition(async () => {
      const result = await startSession();
      if (result.success) {
        addToast("Retro session started!");
        router.push("/session");
      }
    });
  }

  return (
    <>
      {/* Full-width user hero — flush under the sticky header, edge-to-edge
          white banner with a single bottom border separating it from the
          lavender page body below. */}
      <div className="bg-white border-b border-border animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex items-center justify-between">
          <div className="flex items-center gap-5">
          {userAvatarUrl ? (
            <img
              src={userAvatarUrl}
              alt={userName}
              className="w-[100px] h-[100px] rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              className="w-[100px] h-[100px] rounded-full flex items-center justify-center text-white font-semibold text-3xl shrink-0"
              style={{ backgroundColor: userAvatarColor }}
              aria-label={userName}
            >
              {getUserInitials(userName)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-2xl font-semibold text-foreground leading-tight">{userName}</p>
            {userJobTitle && (
              <p className="text-sm text-muted mt-1">{userJobTitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {secondsLeft > 0 ? (
            <button
              type="button"
              onClick={() => setSecondsLeft(0)}
              title="Skip countdown"
              aria-label="Skip countdown and join retro"
              className="flex items-center gap-2.5 px-5 py-2.5 bg-surface border border-border rounded-xl text-sm font-medium text-foreground animate-fade-in select-none cursor-pointer hover:bg-surface-hover transition-colors"
              aria-live="polite"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent animate-pulse"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="text-muted">Retro session starts in</span>
              <span className="tabular-nums font-semibold text-accent min-w-[2ch] text-right">
                {secondsLeft}s
              </span>
            </button>
          ) : (
            <button
              onClick={handleStartSession}
              disabled={isStarting}
              className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm hover:shadow-md animate-fade-in"
            >
              {isStarting ? "Joining..." : "Join Retro"}
            </button>
          )}
        </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* My Actions — read-only list of action items from the previous
          retro assigned to the signed-in user. Always rendered so its
          absence from the dashboard never feels like a bug; an empty
          state explains why the list is empty. */}
      <section className="mb-10 animate-fade-in">
        <div className="flex items-end gap-3 mb-4 flex-wrap">
          <h1 className="text-xl font-semibold text-foreground leading-none">
            My Actions
          </h1>
          {previousSprintLabel && (
            <span className="text-sm text-muted">from {previousSprintLabel}</span>
          )}
        </div>

        {myPreviousActions.length === 0 ? (
          <div className="bg-surface border border-border border-dashed rounded-xl p-6 text-center">
            <p className="text-sm text-muted">
              {previousSprintLabel
                ? `You have no actions carried over from ${previousSprintLabel}.`
                : "No previous retro to show actions from yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {myPreviousActions.map((a) => (
              <MyActionCard
                key={a.id}
                action={a}
                userName={userName}
                userJobTitle={userJobTitle}
                userAvatarColor={userAvatarColor}
                userAvatarUrl={userAvatarUrl}
              />
            ))}
          </div>
        )}
      </section>

      {/* My Retro Board section header — matches the H1 size of "My
          Actions" above it. Sprint label sits as a subtitle. */}
      <div className="mb-4 animate-fade-in">
        <h1 className="text-xl font-semibold text-foreground leading-none">
          My Retro Board
        </h1>
        <p className="text-sm text-muted mt-1">{sprintLabel}</p>
      </div>

      {/* View toggle — styled to match the Active / Archived / All tabs
          on /session: same pill container, same padding, count chips per
          tab. */}
      <div className="flex items-center gap-1 mb-5 animate-fade-in">
        <div className="bg-surface-hover border border-border rounded-xl p-1 flex">
          {(
            [
              { key: "columns", label: "By Category", count: wentWellItems.length + couldImproveItems.length },
              { key: "messages", label: "By Message", count: allItems.length },
            ] as const
          ).map((opt) => {
            const isActive = viewMode === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setViewMode(opt.key)}
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

      {/* View content */}
      {viewMode === "columns" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RetroColumn
            title="Went Well"
            icon="check"
            category="went_well"
            items={wentWellItems}
            iconColor="text-success"
          />
          <RetroColumn
            title="Could Improve"
            icon="alert"
            category="could_improve"
            items={couldImproveItems}
            iconColor="text-warning"
          />
        </div>
      ) : (
        <MessageView items={allItems} />
      )}
      </main>
    </>
  );
}

export function BoardClient(props: BoardClientProps) {
  return (
    <ToastProvider>
      <BoardContent {...props} />
    </ToastProvider>
  );
}
