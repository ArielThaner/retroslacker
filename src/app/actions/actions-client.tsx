"use client";

import { useState, useTransition } from "react";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Avatar } from "@/components/ui/avatar";
import { useRouter, useSearchParams } from "next/navigation";
import {
  assignActionItem,
  updateActionStatus,
  deleteAction,
  moveActionToCurrentRetro,
  postActionSummaryToTeamChannel,
  finalizeSession,
} from "../session/actions";

export interface ActionRow {
  id: number;
  description: string;
  status: string; // "active" | "completed"
  note: string;
  relatedCount: number;
  assignedUserId: number | null;
  assignedUserName: string | null;
  assignedUserJobTitle: string | null;
  assignedUserColor: string | null;
  assignedUserAvatarUrl: string | null;
}

interface UserOption {
  id: number;
  name: string;
}

interface ActionsClientProps {
  currentActions: ActionRow[];
  previousActions: ActionRow[];
  currentSprintLabel: string;
  previousSprintLabel: string | null;
  users: UserOption[];
}

function Content({
  currentActions,
  previousActions,
  currentSprintLabel,
  previousSprintLabel,
  users,
}: ActionsClientProps) {
  const [isClosing, startCloseTransition] = useTransition();
  const { addToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  // `from=session` means we arrived via the "Assign Follow-ups" button on
  // /session. Show a back-arrow that round-trips to /session with `from=actions`
  // so the session page in turn shows a forward link back here.
  const cameFromSession = searchParams.get("from") === "session";

  /**
   * Close-retro flow:
   *   1. Post the action summary to #all-retroteam.
   *   2. Finalize the RetroSession (status → completed).
   *   3. Navigate to /retro-complete for the celebration.
   * If the Slack post fails we still finalize + navigate — the session
   * close is the user's primary intent. Slack errors surface as toasts
   * so they can still be addressed (e.g., missing scope).
   */
  function handleCloseRetro() {
    startCloseTransition(async () => {
      const postRes = await postActionSummaryToTeamChannel();
      if (!postRes.success) {
        addToast(postRes.error ?? "Slack post failed — closing anyway", "error");
      }

      const closeRes = await finalizeSession();
      if (!closeRes.success) {
        addToast(closeRes.error ?? "Failed to close session", "error");
        return;
      }

      // Closing a retro is a milestone worth celebrating — route to the
      // fireworks page. /retro-complete has a "Return to Home" button
      // that brings the user back, where their freshly-assigned sprint
      // follow-ups will now appear in "My Actions".
      router.push("/retro-complete");
    });
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Page header + primary action. Close Retro Session lives up here
          (not down in the "This Retro" section) so it reads as the page's
          primary CTA. Disabled until there's at least one follow-up to
          summarize. The "Session" back-link is nested into the same block
          directly above the h1 so it reads as part of the header unit
          rather than a separate row with an awkward gap above it. */}
      <div className="animate-fade-in flex items-start justify-between gap-4">
        <div>
          {cameFromSession && (
            <a
              href="/session?from=actions"
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors mb-1"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Session
            </a>
          )}
          <h1 className="text-xl font-semibold text-foreground">Follow-ups</h1>
          <p className="text-sm text-muted mt-0.5">
            Track what the team committed to — carry unfinished follow-ups forward, or clean them up.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCloseRetro}
          disabled={isClosing || currentActions.length === 0}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          title={
            currentActions.length === 0
              ? "Add follow-ups first"
              : "Post the summary to Slack and close the retro"
          }
        >
          {isClosing ? (
            <>
              <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Closing…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Close Retro Session
            </>
          )}
        </button>
      </div>

      {/* Previous Retro */}
      {previousActions.length > 0 && previousSprintLabel ? (
        <section className="animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted bg-surface border border-border rounded-full px-2 py-0.5">
              Previous Retro
            </span>
            <h2 className="text-sm font-semibold text-foreground">{previousSprintLabel}</h2>
            <span className="text-xs text-muted bg-surface px-2 py-0.5 rounded-full">
              {previousActions.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {previousActions.map((action) => (
              <ActionRowCard
                key={action.id}
                action={action}
                users={users}
                placement="previous"
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted bg-surface border border-border rounded-full px-2 py-0.5">
              Previous Retro
            </span>
          </div>
          <div className="bg-surface border border-border border-dashed rounded-xl p-6 text-center">
            <p className="text-sm text-muted">No outstanding follow-ups from a previous retro.</p>
          </div>
        </section>
      )}

      {/* This Retro */}
      <section className="animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-accent bg-accent/10 border border-accent/20 rounded-full px-2 py-0.5">
            This Retro
          </span>
          <h2 className="text-sm font-semibold text-foreground">{currentSprintLabel}</h2>
          <span className="text-xs text-muted bg-surface px-2 py-0.5 rounded-full">
            {currentActions.length}
          </span>
        </div>
        {currentActions.length === 0 ? (
          <div className="bg-surface border border-border border-dashed rounded-xl p-6 text-center">
            <p className="text-sm text-muted">
              No follow-ups yet. Go to the{" "}
              <a href="/session" className="text-accent hover:underline">
                retro session
              </a>
              , mark items (or patterns) as follow-up tasks, then tap{" "}
              <strong>Assign Follow-ups</strong>.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {currentActions.map((action) => (
              <ActionRowCard
                key={action.id}
                action={action}
                users={users}
                placement="current"
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

/**
 * Vertical follow-up card on the /actions page. Mirrors the Home
 * "My Actions" card (same dimensions, border, padding, footer) so the
 * two surfaces feel like the same object viewed from different angles.
 *
 * Differences from Home:
 *   - The assignee is variable (not always the signed-in user), so the
 *     header renders the assigned user's avatar + name + job title, or a
 *     dashed "Unassigned" placeholder when blank. A compact <select>
 *     sits directly below for re-assigning.
 *   - Previous-retro cards show a "Move to current" pill in the top-right.
 *   - Every card has a delete (trash) button in the top-right.
 *
 * Status + note + assign writes all go through the shared server actions
 * in `/session/actions.ts`. Local state keeps the UI responsive while
 * the mutation is in-flight; `router.refresh()` re-syncs from the server
 * on success (and we revert the optimistic state on failure).
 */
function ActionRowCard({
  action,
  users,
  placement,
}: {
  action: ActionRow;
  users: UserOption[];
  placement: "current" | "previous";
}) {
  const [isPending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState(action.status);
  const [localAssigneeId, setLocalAssigneeId] = useState(action.assignedUserId);
  const { addToast } = useToast();
  const router = useRouter();

  const isDone = localStatus === "completed";

  function handleAssign(userIdStr: string) {
    const userId = Number(userIdStr) || 0;
    setLocalAssigneeId(userId || null);
    const formData = new FormData();
    formData.set("actionId", String(action.id));
    formData.set("userId", String(userId));
    startTransition(async () => {
      const result = await assignActionItem(formData);
      if (result.success) {
        addToast("Assignment updated", "success");
        router.refresh();
      } else {
        addToast(result.error ?? "Failed to assign", "error");
      }
    });
  }

  function handleToggleDone() {
    const next = isDone ? "active" : "completed";
    setLocalStatus(next);
    startTransition(async () => {
      const result = await updateActionStatus(action.id, next);
      if (result.success) {
        router.refresh();
      } else {
        setLocalStatus(action.status);
        addToast(result.error ?? "Failed to update", "error");
      }
    });
  }

  function handleDelete() {
    if (!confirm("Delete this follow-up?")) return;
    startTransition(async () => {
      const result = await deleteAction(action.id);
      if (result.success) {
        addToast("Deleted", "info");
        router.refresh();
      } else {
        addToast(result.error ?? "Failed to delete", "error");
      }
    });
  }

  function handleMoveToCurrent() {
    startTransition(async () => {
      const result = await moveActionToCurrentRetro(action.id);
      if (result.success) {
        addToast("Moved to current retro", "success");
        router.refresh();
      } else {
        addToast(result.error ?? "Failed to move", "error");
      }
    });
  }

  const isAssigned = Boolean(
    action.assignedUserName && action.assignedUserColor
  );

  return (
    <div
      className="bg-white rounded-2xl p-6 flex flex-col gap-3 transition-all min-h-[260px] animate-fade-in"
      style={{ opacity: isDone ? 0.7 : 1, border: "1px solid #E8E6F0" }}
    >
      {/* Header: avatar + identity. Delete lives in the footer now so the
          header stays purely informational. */}
      <div className="flex items-center gap-2.5 min-w-0">
        {isAssigned ? (
          <Avatar
            name={action.assignedUserName as string}
            color={action.assignedUserColor as string}
            imageUrl={action.assignedUserAvatarUrl ?? undefined}
            size="sm"
          />
        ) : (
          <div
            className="shrink-0 w-8 h-8 rounded-full border border-dashed border-border-light flex items-center justify-center text-muted"
            title="Unassigned"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        )}
        <div className="min-w-0 leading-tight flex-1">
          <p className={`text-sm font-medium truncate ${isAssigned ? "text-foreground" : "text-muted italic"}`}>
            {action.assignedUserName ?? "Unassigned"}
          </p>
          {isAssigned && action.assignedUserJobTitle && (
            <p className="text-xs text-muted truncate">{action.assignedUserJobTitle}</p>
          )}
        </div>
      </div>

      {/* Description — capped at 7 lines so an overly-long follow-up
          can't blow out the card's vertical rhythm in the grid. */}
      <p
        className={`text-sm ${isDone ? "text-muted line-through" : "text-foreground/90"} line-clamp-[7]`}
        title={action.description}
      >
        {action.description}
      </p>

      {/* Spacer pushes the associated-items row and footer to the bottom
          so cards line up neatly across a row regardless of description
          length. */}
      <div className="flex-1" />

      {/* Associated retro items — count only. */}
      <div className="flex items-center gap-2 text-xs text-muted">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span>Associated retro items</span>
        <span className="ml-auto tabular-nums bg-surface rounded-full px-2 py-0.5 text-foreground/80 font-medium">
          {action.relatedCount}
        </span>
      </div>

      {/* Footer — differs by placement:
          • Current sprint (sprint 24): delete on the left, Assign dropdown
            on the right (the dropdown also handles reassignment).
          • Previous sprint (sprint 23): delete on the left, a vertical
            stack of [Mark Complete, Move to current] on the right — both
            using the same green-success secondary style so they read as
            a matched pair. */}
      <div className="flex items-end justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          title="Delete follow-up"
          aria-label="Delete follow-up"
          className="shrink-0 p-1.5 rounded-md text-muted hover:text-danger hover:bg-surface-hover transition-colors disabled:opacity-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>

        {placement === "current" ? (
          // Native select styled to mirror the green secondary button used
          // on previous-sprint cards: same padding, radius, font weight.
          // Acts as both initial assign and reassign.
          <select
            value={localAssigneeId ?? ""}
            onChange={(e) => handleAssign(e.target.value)}
            disabled={isPending}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 border-0 focus:outline-none focus:ring-1 focus:ring-accent/40 ${
              isAssigned
                ? "bg-accent/10 hover:bg-accent/15 text-accent"
                : "bg-surface hover:bg-surface-hover text-foreground/80"
            }`}
            aria-label={isAssigned ? "Reassign" : "Assign"}
          >
            <option value="">Assign to…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex flex-col gap-1.5 items-stretch">
            <button
              type="button"
              onClick={handleToggleDone}
              disabled={isPending}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                isDone
                  ? "bg-surface text-muted hover:text-foreground"
                  : "bg-success/10 hover:bg-success/15 text-success"
              }`}
            >
              {isDone ? (
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
            <button
              type="button"
              onClick={handleMoveToCurrent}
              disabled={isPending}
              title="Move to current retro"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 bg-accent/10 hover:bg-accent/15 text-accent whitespace-nowrap"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
              Move to current
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ActionsClient(props: ActionsClientProps) {
  return (
    <ToastProvider>
      <Content {...props} />
    </ToastProvider>
  );
}
