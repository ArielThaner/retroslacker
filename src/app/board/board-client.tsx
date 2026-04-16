"use client";

import { useState, useEffect, useTransition } from "react";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { RetroColumn, type RetroItemData } from "./retro-column";
import { MessageView } from "./message-view";
import { startSession } from "./actions";
import { useRouter } from "next/navigation";

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

interface BoardClientProps {
  wentWellItems: BoardItem[];
  couldImproveItems: BoardItem[];
  allItems: FullItem[];
  sprintLabel: string;
  sessionStatus: string;
}

type ViewMode = "columns" | "messages";

function BoardContent({
  wentWellItems,
  couldImproveItems,
  allItems,
  sprintLabel,
  sessionStatus,
}: BoardClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("columns");
  const [isStarting, startTransition] = useTransition();
  const { addToast } = useToast();
  const router = useRouter();

  // Countdown until the "Join Retro" button appears. Starts at 20s on page load.
  const COUNTDOWN_SECONDS = 20;
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (sessionStatus !== "pending") return;
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStatus, secondsLeft]);

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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Sprint header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{sprintLabel}</h1>
          <p className="text-sm text-muted mt-0.5">Your personal retro board</p>
        </div>
        <div className="flex items-center gap-3">
          {sessionStatus === "pending" && secondsLeft > 0 && (
            <div
              className="flex items-center gap-2.5 px-5 py-2.5 bg-surface border border-border rounded-xl text-sm font-medium text-foreground animate-fade-in"
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
            </div>
          )}
          {sessionStatus === "pending" && secondsLeft === 0 && (
            <button
              onClick={handleStartSession}
              disabled={isStarting}
              className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm hover:shadow-md animate-fade-in"
            >
              {isStarting ? "Joining..." : "Join Retro"}
            </button>
          )}
          {sessionStatus === "active" && (
            <a
              href="/session"
              className="px-5 py-2.5 bg-accent/10 text-accent text-sm font-semibold rounded-xl hover:bg-accent/15 transition-all"
            >
              Join Live Session
            </a>
          )}
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-1 mb-5 animate-fade-in">
        <div className="bg-surface-hover border border-border rounded-xl p-1 flex">
          <button
            onClick={() => setViewMode("columns")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "columns"
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            By Category
          </button>
          <button
            onClick={() => setViewMode("messages")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "messages"
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            By Message
          </button>
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
  );
}

export function BoardClient(props: BoardClientProps) {
  return (
    <ToastProvider>
      <BoardContent {...props} />
    </ToastProvider>
  );
}
