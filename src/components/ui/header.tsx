"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/auth-actions";
import { linkSlackUser, unlinkSlackUser } from "@/app/board/actions";
import { getUserInitials } from "@/lib/utils";

interface HeaderProps {
  userName: string;
  avatarColor: string;
  avatarUrl?: string | null;
  slackUserId?: string | null;
  sprintLabel: string;
  sessionStatus?: string;
}

export function Header({ userName, avatarColor, avatarUrl, slackUserId, sprintLabel, sessionStatus }: HeaderProps) {
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
              <a href="/board" className="text-lg font-bold text-foreground tracking-tight hover:text-accent transition-colors">
                RetroSlacker
              </a>
            </div>

            <nav className="flex items-center gap-1">
              <a
                href="/board"
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  pathname === "/board"
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                My Board
              </a>
              <a
                href="/session"
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
                  pathname === "/session"
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                Session
                {sessionStatus === "active" && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                  </span>
                )}
              </a>
              <a
                href="/actions"
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  pathname === "/actions"
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                Actions
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
        </div>
      </div>
    </div>
  );
}
