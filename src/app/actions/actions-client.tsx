"use client";

import { useState, useTransition } from "react";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Avatar } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import {
  assignActionItem,
  updateActionStatus,
  deleteAction,
  moveActionToCurrentRetro,
} from "../session/actions";

export interface ActionRow {
  id: number;
  description: string;
  status: string; // "active" | "completed"
  assignedUserId: number | null;
  assignedUserName: string | null;
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
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <div className="animate-fade-in">
        <h1 className="text-xl font-semibold text-foreground">Action Items</h1>
        <p className="text-sm text-muted mt-0.5">
          Track what the team committed to — carry unfinished items forward, or clean them up.
        </p>
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
          <div className="space-y-2">
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
            <p className="text-sm text-muted">No outstanding actions from a previous retro.</p>
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
              No action items yet. Go to the{" "}
              <a href="/session" className="text-accent hover:underline">
                retro session
              </a>
              , mark items (or patterns) as action candidates, then tap{" "}
              <strong>Generate Actions</strong>.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
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
    if (!confirm("Delete this action item?")) return;
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

  return (
    <div
      className="bg-surface border border-border rounded-xl p-3 flex items-start gap-3 transition-all animate-fade-in"
      style={{ opacity: isDone ? 0.7 : 1 }}
    >
      {/* Done checkbox */}
      <button
        type="button"
        onClick={handleToggleDone}
        disabled={isPending}
        title={isDone ? "Mark as not done" : "Mark as done"}
        className={`shrink-0 w-5 h-5 mt-0.5 rounded border flex items-center justify-center transition-colors ${
          isDone
            ? "bg-success border-success text-white"
            : "border-border hover:border-success/60 text-transparent hover:text-success/60"
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </button>

      <p
        className={`flex-1 min-w-0 text-sm pt-0.5 ${
          isDone ? "text-muted line-through" : "text-foreground/90"
        }`}
      >
        {action.description}
      </p>

      {/* Assignee — visible avatar + select */}
      <div className="shrink-0 flex items-center gap-2">
        {action.assignedUserName && action.assignedUserColor && (
          <Avatar
            name={action.assignedUserName}
            color={action.assignedUserColor}
            imageUrl={action.assignedUserAvatarUrl ?? undefined}
            size="sm"
          />
        )}
        <select
          value={localAssigneeId ?? ""}
          onChange={(e) => handleAssign(e.target.value)}
          disabled={isPending}
          className="pl-2 pr-7 py-1.5 bg-white border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50 disabled:opacity-50"
        >
          <option value="">Assign to…</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      {/* Overflow actions */}
      <div className="shrink-0 flex items-center gap-1">
        {placement === "previous" && (
          <button
            type="button"
            onClick={handleMoveToCurrent}
            disabled={isPending}
            title="Move to current retro"
            className="text-[10px] px-2 py-1 rounded-md border border-accent/40 text-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
          >
            Move to current
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          title="Delete action"
          className="p-1.5 text-muted hover:text-danger transition-colors rounded-md hover:bg-surface-hover disabled:opacity-50"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
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
