"use client";

import { useState, useTransition } from "react";
import { linkSlackUser, unlinkSlackUser } from "./actions";
import { useToast } from "@/components/ui/toast";

interface SlackLinkPanelProps {
  slackUserId: string | null;
}

export function SlackLinkPanel({ slackUserId }: SlackLinkPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [slackId, setSlackId] = useState("");
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  function handleLink() {
    if (!slackId.trim()) return;

    const formData = new FormData();
    formData.set("slackUserId", slackId.trim());

    startTransition(async () => {
      const result = await linkSlackUser(formData);
      if (result.success) {
        addToast("Slack account linked!", "success");
        setSlackId("");
        setIsOpen(false);
      } else {
        addToast(result.error ?? "Failed to link", "error");
      }
    });
  }

  function handleUnlink() {
    startTransition(async () => {
      const result = await unlinkSlackUser();
      if (result.success) {
        addToast("Slack account unlinked", "info");
      }
    });
  }

  if (slackUserId) {
    return (
      <div className="flex items-center gap-3 mb-4 animate-fade-in">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-lg">
          <div className="w-4 h-4 rounded bg-[#8F30A1] flex items-center justify-center">
            <span className="text-white text-[8px] font-bold">S</span>
          </div>
          <span className="text-xs text-muted">
            Slack linked: <code className="text-foreground/70">{slackUserId}</code>
          </span>
          <button
            onClick={handleUnlink}
            disabled={isPending}
            className="text-xs text-muted hover:text-danger transition-colors ml-1 disabled:opacity-50"
          >
            Unlink
          </button>
        </div>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div className="mb-4 animate-fade-in">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border border-dashed rounded-lg text-xs text-muted hover:text-foreground hover:border-border-light transition-all"
        >
          <div className="w-4 h-4 rounded bg-[#8F30A1]/20 flex items-center justify-center">
            <span className="text-[#8F30A1] text-[8px] font-bold">S</span>
          </div>
          Link Slack Account
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4 mb-4 animate-fade-in shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded bg-[#8F30A1] flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">S</span>
        </div>
        <h3 className="text-sm font-medium text-foreground">Link Slack Account</h3>
      </div>
      <p className="text-xs text-muted mb-3">
        Enter your Slack User ID to receive retro check-ins via DM. Find it in your Slack profile under &quot;More actions&quot; &rarr; &quot;Copy member ID&quot;.
      </p>
      <div className="flex gap-2">
        <input
          value={slackId}
          onChange={(e) => setSlackId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLink()}
          placeholder="U0123ABCDEF"
          disabled={isPending}
          className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted/50 focus:outline-none focus:ring-1 focus:ring-accent/50 disabled:opacity-50 font-mono"
        />
        <button
          onClick={handleLink}
          disabled={isPending || !slackId.trim()}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
        >
          {isPending ? "Linking..." : "Link"}
        </button>
        <button
          onClick={() => { setIsOpen(false); setSlackId(""); }}
          className="px-3 py-2 text-sm text-muted hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
