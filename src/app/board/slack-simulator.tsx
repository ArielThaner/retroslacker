"use client";

import { useState, useTransition } from "react";
import { submitSlackMessage } from "./actions";
import { useToast } from "@/components/ui/toast";

interface SlackMessage {
  id: number;
  sender: "bot" | "user";
  text: string;
}

let msgId = 0;

export function SlackSimulator({ userName }: { userName: string }) {
  const [messages, setMessages] = useState<SlackMessage[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [checkedIn, setCheckedIn] = useState(false);
  const { addToast } = useToast();

  function triggerCheckin() {
    setMessages((prev) => [
      ...prev,
      {
        id: ++msgId,
        sender: "bot",
        text: `Hey ${userName.split(" ")[0]} \uD83D\uDC4B How did your week go? Share a quick reflection and I'll add it to the retro board!`,
      },
    ]);
    setCheckedIn(true);
  }

  function handleSubmit() {
    if (!input.trim() || isPending) return;

    const userText = input.trim();
    setMessages((prev) => [...prev, { id: ++msgId, sender: "user", text: userText }]);
    setInput("");

    const formData = new FormData();
    formData.set("message", userText);

    startTransition(async () => {
      const result = await submitSlackMessage(formData);
      if (result.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: ++msgId,
            sender: "bot",
            text: `Got it! I've added ${result.itemCount} item${result.itemCount === 1 ? "" : "s"} to your retro board \u2705`,
          },
        ]);
        addToast(`${result.itemCount} items added from Slack`, "success");
      } else {
        setMessages((prev) => [
          ...prev,
          { id: ++msgId, sender: "bot", text: `Oops, something went wrong: ${result.error}` },
        ]);
        addToast(result.error ?? "Failed to parse message", "error");
      }
    });
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-[#1a1025]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#8F30A1] flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">S</span>
          </div>
          <span className="text-sm font-semibold text-white">Slack Simulator</span>
          <span className="text-xs text-white/50">#retro</span>
        </div>
        {!checkedIn && (
          <button
            onClick={triggerCheckin}
            className="px-3 py-1 bg-[#8F30A1] hover:bg-[#7a2a85] text-white text-xs font-medium rounded transition-colors"
          >
            Trigger Friday Check-in
          </button>
        )}
      </div>

      <div className="h-64 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted text-sm">
              Click &quot;Trigger Friday Check-in&quot; to start
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="animate-fade-in flex gap-2">
            <div
              className={`w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                msg.sender === "bot" ? "bg-[#8F30A1]" : "bg-accent"
              }`}
            >
              {msg.sender === "bot" ? "B" : userName[0]}
            </div>
            <div>
              <span className="text-xs font-semibold text-foreground">
                {msg.sender === "bot" ? "RetroSlacker Bot" : userName}
              </span>
              <p className="text-sm text-foreground/80 mt-0.5">{msg.text}</p>
            </div>
          </div>
        ))}
        {isPending && (
          <div className="flex gap-2 animate-fade-in">
            <div className="w-7 h-7 rounded bg-[#8F30A1] flex items-center justify-center text-white text-xs font-bold shrink-0">
              B
            </div>
            <div className="flex items-center gap-1 py-2">
              <div className="w-2 h-2 rounded-full bg-muted animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-muted animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-muted animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {checkedIn && (
        <div className="flex gap-2 p-3 border-t border-border">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Type your reflection..."
            disabled={isPending}
            className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground placeholder-muted/50 focus:outline-none focus:ring-1 focus:ring-accent/50 disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={isPending || !input.trim()}
            className="px-4 py-2 bg-[#007a5a] hover:bg-[#148567] text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
