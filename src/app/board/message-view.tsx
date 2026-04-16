"use client";

import { useState, useTransition } from "react";
import { updateRetroItem, deleteRetroItem, addTagToItem, removeTagFromItem } from "./actions";
import { useToast } from "@/components/ui/toast";
import type { FullItem } from "./board-client";
import { TagChip, AddTagMenu } from "./retro-column";
import type { RetroTag } from "@/lib/tags";

interface MessageGroup {
  content: string;
  source: "slack" | "manual";
  items: FullItem[];
}

export function MessageView({ items }: { items: FullItem[] }) {
  // Group items by their original content (Slack message)
  // Manual items each get their own group
  const groups: MessageGroup[] = [];
  const slackGroups = new Map<string, FullItem[]>();
  const manualItems: FullItem[] = [];

  for (const item of items) {
    if (item.source === "slack") {
      const existing = slackGroups.get(item.content);
      if (existing) {
        existing.push(item);
      } else {
        slackGroups.set(item.content, [item]);
      }
    } else {
      manualItems.push(item);
    }
  }

  for (const [content, groupItems] of slackGroups) {
    groups.push({ content, source: "slack", items: groupItems });
  }

  for (const item of manualItems) {
    groups.push({ content: item.text, source: "manual", items: [item] });
  }

  if (groups.length === 0) {
    return (
      <div className="bg-surface border border-border border-dashed rounded-lg p-8 text-center animate-fade-in">
        <p className="text-sm text-muted">
          No items yet — use the Slack simulator or add items in the &quot;By Category&quot; view!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {groups.map((group, i) => (
        <MessageGroupCard key={`${group.source}-${i}`} group={group} />
      ))}
    </div>
  );
}

function MessageGroupCard({ group }: { group: MessageGroup }) {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Original message header */}
      <div className="px-4 py-3 border-b border-border bg-surface-hover/50">
        <div className="flex items-center gap-2 mb-1.5">
          {group.source === "slack" ? (
            <span className="text-[10px] px-1.5 py-0.5 bg-[#8F30A1]/10 text-[#8F30A1] rounded font-medium">
              Slack
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent rounded font-medium">
              Manual
            </span>
          )}
          <span className="text-[10px] text-muted">
            {group.items.length} {group.items.length === 1 ? "item" : "items"} parsed
          </span>
        </div>
        {group.source === "slack" && (
          <p className="text-sm text-foreground/70 leading-relaxed italic">
            &ldquo;{group.content}&rdquo;
          </p>
        )}
      </div>

      {/* Parsed items */}
      <div className="p-3 space-y-2">
        {group.items.map((item) => (
          <MessageItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function MessageItemCard({ item }: { item: FullItem }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [showConfirm, setShowConfirm] = useState(false);
  const [tags, setTags] = useState<string[]>(item.tags);
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  // Sync local state when the server revalidates with fresh props.
  const [lastServerTags, setLastServerTags] = useState(item.tags);
  if (lastServerTags !== item.tags) {
    setLastServerTags(item.tags);
    setTags(item.tags);
  }

  function handleRemoveTag(tag: string) {
    const previous = tags;
    setTags((current) => {
      const next = current.filter((t) => t !== tag);
      return next.length > 0 ? next : ["Other"];
    });
    startTransition(async () => {
      const result = await removeTagFromItem(item.id, tag);
      if (!result.success) {
        setTags(previous);
        addToast(result.error ?? "Failed to remove tag", "error");
      } else if (result.tags) {
        setTags(result.tags);
      }
    });
  }

  function handleAddTag(tag: RetroTag) {
    const previous = tags;
    setTags((current) => (current.includes(tag) ? current : [...current, tag]));
    startTransition(async () => {
      const result = await addTagToItem(item.id, tag);
      if (!result.success) {
        setTags(previous);
        addToast(result.error ?? "Failed to add tag", "error");
      } else if (result.tags) {
        setTags(result.tags);
      }
    });
  }

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

  const isWentWell = item.category === "went_well";

  return (
    <div className="group flex items-start gap-2.5 px-2 py-1.5 rounded-md hover:bg-surface-hover/50 transition-all">
      {isEditing ? (
        <div className="flex-1 space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full px-2 py-1.5 bg-white border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50 resize-none"
            rows={2}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setIsEditing(false); setEditText(item.text); }}
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
        <>
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Header row: category + week/source meta, no tags. */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  isWentWell
                    ? "bg-success/10 text-success"
                    : "bg-warning/10 text-warning"
                }`}
              >
                {isWentWell ? "Well" : "Improve"}
              </span>
              <span className="text-[10px] text-muted">
                Week {item.week ?? 4} via {item.source === "slack" ? "Slack" : "Manual"}
              </span>
            </div>

            <p
              className="text-sm text-foreground/90 cursor-pointer hover:text-foreground transition-colors"
              onClick={() => setIsEditing(true)}
            >
              {item.text}
            </p>

            {/* Tag chips + add menu sit below the description. */}
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((t) => (
                <TagChip
                  key={t}
                  tag={t}
                  onRemove={() => handleRemoveTag(t)}
                  disabled={isPending}
                />
              ))}
              <AddTagMenu
                currentTags={tags}
                onPick={handleAddTag}
                disabled={isPending}
              />
            </div>
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
        </>
      )}
    </div>
  );
}
