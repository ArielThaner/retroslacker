"use client";

import { useState, useTransition } from "react";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { RetroColumn } from "./retro-column";
import { MessageView } from "./message-view";
import { startSession } from "./actions";
import { useRouter } from "next/navigation";

interface BoardItem {
  id: number;
  text: string;
  source: string;
}

export interface FullItem {
  id: number;
  text: string;
  category: string;
  source: string;
  content: string;
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
          {sessionStatus === "pending" && (
            <button
              onClick={handleStartSession}
              disabled={isStarting}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isStarting ? "Starting..." : "Start Retro Session"}
            </button>
          )}
          {sessionStatus === "active" && (
            <a
              href="/session"
              className="px-4 py-2 bg-success/10 text-success text-sm font-medium rounded-lg hover:bg-success/20 transition-all"
            >
              Join Live Session
            </a>
          )}
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-1 mb-5 animate-fade-in">
        <div className="bg-surface-hover border border-border rounded-lg p-0.5 flex">
          <button
            onClick={() => setViewMode("columns")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === "columns"
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            By Category
          </button>
          <button
            onClick={() => setViewMode("messages")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
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
