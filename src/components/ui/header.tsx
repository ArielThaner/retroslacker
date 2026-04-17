"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { logoutAction } from "@/app/auth-actions";
import {
  linkSlackUser,
  unlinkSlackUser,
  deleteAllBotMessages,
  resetExperience,
  sendCheckinsNow,
} from "@/app/home/actions";
import { getUserInitials } from "@/lib/utils";

interface HeaderProps {
  userName: string;
  avatarColor: string;
  avatarUrl?: string | null;
  slackUserId?: string | null;
  sprintLabel: string;
}

export function Header({
  userName,
  avatarColor,
  avatarUrl,
  slackUserId,
  sprintLabel,
}: HeaderProps) {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <div className="flex-1">
              <a href="/home" className="text-lg font-bold text-foreground tracking-tight hover:text-accent transition-colors">
                RetroSlacker
              </a>
            </div>

            {/* Nav is now just Home + Analytics. Session and Actions are
                reached via flow buttons (Join Retro on Home → Session;
                Assign Action Items on Session → Actions; Close Retro on
                Actions → Home) rather than a persistent nav link. */}
            <nav className="flex items-center gap-1">
              <a
                href="/home"
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  pathname === "/home"
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                Home
              </a>
              <a
                href="/analytics"
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  pathname === "/analytics"
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                Analytics
              </a>
            </nav>

            <div className="flex-1 flex items-center justify-end">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-surface-hover transition-all"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={userName}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {getUserInitials(userName)}
                    </div>
                  )}
                  <span className="text-sm font-medium text-foreground">{userName}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-lg py-1.5 animate-fade-in z-50">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        setSettingsOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-surface-hover transition-colors flex items-center gap-2"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                      Settings
                    </button>
                    <div className="border-t border-border my-1" />
                    <form action={logoutAction}>
                      <button
                        type="submit"
                        className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-surface-hover transition-colors flex items-center gap-2"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Sign out
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {settingsOpen && (
        <SettingsModal
          slackUserId={slackUserId ?? null}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </>
  );
}

function SettingsModal({
  slackUserId,
  onClose,
}: {
  slackUserId: string | null;
  onClose: () => void;
}) {
  const [slackId, setSlackId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [linked, setLinked] = useState(slackUserId);

  const router = useRouter();

  // Danger-zone state: two-step confirm for the bulk Slack delete.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();

  // "Send check-in now" — fires the weekly "Hey {firstName} 👋" DM
  // to every user with a linked Slack account. Same code path as the
  // scheduled cron; this button is handy for dev + ad-hoc prod pokes.
  const [checkinResult, setCheckinResult] = useState<string | null>(null);
  const [isCheckinPending, startCheckinTransition] = useTransition();

  function handleSendCheckins() {
    setCheckinResult(null);
    startCheckinTransition(async () => {
      const res = await sendCheckinsNow();
      if ("error" in res && res.error) {
        setCheckinResult(res.error);
        return;
      }
      if ("success" in res && res.success) {
        const parts = [
          `Sent check-in to ${res.sent} of ${res.total} user${res.total === 1 ? "" : "s"}.`,
        ];
        if (res.firstError) parts.push(`First error: ${res.firstError}`);
        setCheckinResult(parts.join(" "));
      }
    });
  }

  // Two-step confirm for "Reset experience" — wipes and re-seeds the
  // demo data tables (retro items, sessions, action items) from
  // `src/lib/seed-data.ts` while preserving user accounts.
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [isResetPending, startResetTransition] = useTransition();

  function handleResetExperience() {
    setResetResult(null);
    startResetTransition(async () => {
      const res = await resetExperience();
      if (res.success) {
        setResetResult("Experience reset — reloading…");
        // Pull the freshly-seeded rows into every server component on
        // screen. router.refresh() is enough (revalidatePath ran in
        // the action) but we also close the modal for good measure.
        router.refresh();
      } else {
        setResetResult(res.error ?? "Reset failed");
      }
      setConfirmingReset(false);
    });
  }

  function handleDeleteAllBotMessages() {
    setDeleteResult(null);
    startDeleteTransition(async () => {
      const res = await deleteAllBotMessages();
      if (res.success) {
        const parts = [
          `Deleted ${res.deleted} message${res.deleted === 1 ? "" : "s"}${res.skipped ? ` (${res.skipped} skipped)` : ""}.`,
        ];
        if (res.missingScopes) {
          parts.push(
            `Missing Slack scope(s): ${res.missingScopes.join(", ")} — add them in your Slack app and reinstall.`
          );
        }
        if (res.warnings) parts.push(...res.warnings);
        setDeleteResult(parts.join(" "));
      } else {
        setDeleteResult(res.error ?? "Failed to delete");
      }
      setConfirmingDelete(false);
    });
  }

  function handleLink() {
    if (!slackId.trim()) return;
    const formData = new FormData();
    formData.set("slackUserId", slackId.trim());

    startTransition(async () => {
      const result = await linkSlackUser(formData);
      if (result.success) {
        setLinked(slackId.trim().toUpperCase());
        setSlackId("");
      }
    });
  }

  function handleUnlink() {
    startTransition(async () => {
      const result = await unlinkSlackUser();
      if (result.success) {
        setLinked(null);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-xl shadow-xl w-full max-w-md mx-4 animate-fade-in" style={{ border: "0.5px solid #D1D5DB" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-muted hover:text-foreground transition-colors rounded-md hover:bg-surface-hover"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded bg-[#8F30A1] flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">S</span>
            </div>
            <h3 className="text-sm font-medium text-foreground">Slack Integration</h3>
          </div>

          {linked ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-success/5 border border-success/20 rounded-lg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span className="text-sm text-foreground">Connected</span>
                <code className="text-xs text-muted ml-auto font-mono">{linked}</code>
              </div>
              <button
                onClick={handleUnlink}
                disabled={isPending}
                className="text-sm text-danger hover:text-danger/80 transition-colors disabled:opacity-50"
              >
                {isPending ? "Unlinking..." : "Unlink Slack account"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                Link your Slack account to receive retro check-ins via DM. Find your Slack User ID in your profile under &quot;More actions&quot; &rarr; &quot;Copy member ID&quot;.
              </p>
              <div className="flex gap-2">
                <input
                  value={slackId}
                  onChange={(e) => setSlackId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLink()}
                  placeholder="U0123ABCDEF"
                  disabled={isPending}
                  className="flex-1 px-3 py-2 bg-white border border-border rounded-lg text-sm text-foreground placeholder-muted/50 focus:outline-none focus:ring-1 focus:ring-accent/50 disabled:opacity-50 font-mono"
                />
                <button
                  onClick={handleLink}
                  disabled={isPending || !slackId.trim()}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
                >
                  {isPending ? "Linking..." : "Link"}
                </button>
              </div>
            </div>
          )}

          {/* Manual trigger for the weekly check-in DM. Mirrors the
              `/api/slack/checkin` cron so you can fire one off without
              waiting for the schedule. */}
          <div className="border-t border-border mt-5 pt-5">
            <p className="text-xs font-medium text-foreground mb-1">
              Send check-in now
            </p>
            <p className="text-xs text-muted mb-3 leading-relaxed">
              DM every linked user the &quot;How did your week go?&quot;
              prompt. Same message the scheduled cron sends.
            </p>
            <button
              onClick={handleSendCheckins}
              disabled={isCheckinPending}
              className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
            >
              {isCheckinPending ? "Sending…" : "Send check-in now"}
            </button>
            {checkinResult && (
              <p className="text-xs text-muted mt-2">{checkinResult}</p>
            )}
          </div>

          {/* Danger zone: destructive global actions. Reset experience
              replays the canonical demo seed; delete-all-bot-messages
              wipes the bot's Slack history. Both affect every user. */}
          <div className="border-t border-border mt-5 pt-5 space-y-5">
            <h3 className="text-sm font-medium text-foreground -mb-2">
              Danger zone
            </h3>

            {/* Reset experience — wipe retro items, sessions, and follow-ups
                then replay the canonical seed from src/lib/seed-data.ts.
                User accounts (and Slack links) are preserved. */}
            <div>
              <p className="text-xs font-medium text-foreground mb-1">Reset experience</p>
              <p className="text-xs text-muted mb-3 leading-relaxed">
                Replace all retro items, session history, and follow-ups
                with the canonical demo data. User accounts and Slack links
                are kept. Cannot be undone.
              </p>

              {!confirmingReset ? (
                <button
                  onClick={() => setConfirmingReset(true)}
                  disabled={isResetPending}
                  className="text-sm text-danger hover:text-danger/80 transition-colors disabled:opacity-50"
                >
                  Reset experience
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetExperience}
                    disabled={isResetPending}
                    className="px-3 py-1.5 bg-danger text-white text-xs font-medium rounded-md hover:bg-danger/90 transition-colors disabled:opacity-50"
                  >
                    {isResetPending ? "Resetting…" : "Confirm reset"}
                  </button>
                  <button
                    onClick={() => setConfirmingReset(false)}
                    disabled={isResetPending}
                    className="text-xs text-muted hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {resetResult && (
                <p className="text-xs text-muted mt-2">{resetResult}</p>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-foreground mb-1">Delete all bot messages</p>
            <p className="text-xs text-muted mb-3 leading-relaxed">
              Delete every message the bot has posted in any DM or channel
              it belongs to. Affects all users, not just you. Cannot be
              undone.
            </p>

            {!confirmingDelete ? (
              <button
                onClick={() => setConfirmingDelete(true)}
                disabled={isDeletePending}
                className="text-sm text-danger hover:text-danger/80 transition-colors disabled:opacity-50"
              >
                Delete all bot messages
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeleteAllBotMessages}
                  disabled={isDeletePending}
                  className="px-3 py-1.5 bg-danger text-white text-xs font-medium rounded-md hover:bg-danger/90 transition-colors disabled:opacity-50"
                >
                  {isDeletePending ? "Deleting…" : "Confirm delete"}
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  disabled={isDeletePending}
                  className="text-xs text-muted hover:text-foreground transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}

            {deleteResult && (
              <p className="text-xs text-muted mt-2">{deleteResult}</p>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
