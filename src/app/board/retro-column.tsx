"use client";

import { useState, useTransition } from "react";
import { addRetroItem, updateRetroItem, deleteRetroItem } from "./actions";
import { useToast } from "@/components/ui/toast";

interface RetroItemData {
  id: number;
  text: string;
  source: string;
}

interface RetroColumnProps {
  title: string;
  icon: "check" | "alert";
  category: string;
  items: RetroItemData[];
  iconColor: string;
}

function ColumnIcon({ type, color }: { type: "check" | "alert"; color: string }) {
  if (type === "check") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={color}>
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={color}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export function RetroColumn({ title, icon, category, items, iconColor }: RetroColumnProps) {
  const [newText, setNewText] = useState("");
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  function handleAdd() {
    if (!newText.trim()) return;
    const text = newText.trim();
    setNewText("");

    const formData = new FormData();
    formData.set("text", text);
    formData.set("category", category);

    startTransition(async () => {
      const result = await addRetroItem(formData);
      if (result.success) {
        addToast("Item added", "success");
      } else {
        addToast(result.error ?? "Failed to add item", "error");
      }
    });
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <ColumnIcon type={icon} color={iconColor} />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <span className="text-xs text-muted bg-surface px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </div>

      <div className="space-y-2">
        {items.length === 0 && (
          <div className="bg-surface border border-border border-dashed rounded-lg p-6 text-center">
            <p className="text-sm text-muted">No items yet — add one below or use the Slack simulator!</p>
          </div>
        )}

        {items.map((item) => (
          <RetroCard key={item.id} item={item} />
        ))}

        {/* Add new item */}
        <div className="flex gap-2 mt-3">
          <input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder={`Add a "${title.toLowerCase()}" item...`}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-foreground placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 disabled:opacity-50"
          />
          <button
            onClick={handleAdd}
            disabled={isPending || !newText.trim()}
            className="px-3 py-2 bg-accent/10 text-accent text-sm font-medium rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function RetroCard({ item }: { item: RetroItemData }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  function handleSave() {
    if (!editText.trim()) return;

    const formData = new FormData();
    formData.set("id", String(item.id));
    formData.set("text", editText.trim());

    startTransition(async () => {
      const result = await updateRetroItem(formData);
      if (result.success) {
        setIsEditing(false);
        addToast("Item updated", "success");
      } else {
        addToast(result.error ?? "Failed to update", "error");
      }
    });
  }

  function handleDelete() {
    const formData = new FormData();
    formData.set("id", String(item.id));

    startTransition(async () => {
      const result = await deleteRetroItem(formData);
      if (result.success) {
        addToast("Item deleted", "info");
      } else {
        addToast(result.error ?? "Failed to delete", "error");
      }
    });
  }

  return (
    <div className="group bg-surface border border-border rounded-xl p-4 hover:border-border-light transition-all">
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50 resize-none"
            rows={2}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditText(item.text);
              }}
              className="px-2 py-1 text-xs text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="px-2 py-1 text-xs bg-accent text-white rounded transition-colors disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            {item.source === "slack" && (
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-[#4A3AFF]/10 text-[#4A3AFF] rounded font-medium mt-0.5">
                Slack
              </span>
            )}
            <p
              className="text-sm text-foreground/90 cursor-pointer hover:text-foreground transition-colors"
              onClick={() => setIsEditing(true)}
            >
              {item.text}
            </p>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-muted hover:text-foreground transition-colors"
              title="Edit"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            {showConfirm ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="px-1.5 py-0.5 text-[10px] bg-danger text-white rounded transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-1.5 py-0.5 text-[10px] text-muted hover:text-foreground transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirm(true)}
                className="p-1 text-muted hover:text-danger transition-colors"
                title="Delete"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
