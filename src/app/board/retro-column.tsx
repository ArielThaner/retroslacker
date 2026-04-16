"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import {
  addRetroItem,
  updateRetroItem,
  deleteRetroItem,
  addTagToItem,
  removeTagFromItem,
} from "./actions";
import { useToast } from "@/components/ui/toast";
import { RETRO_TAGS, RETRO_TAG_STYLES, DEFAULT_RETRO_TAG, type RetroTag } from "@/lib/tags";

export interface RetroItemData {
  id: number;
  text: string;
  source: string;
  tags: string[];
  week: number;
  createdAt: string;
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
  // Multi-tag picker in the manual input — defaults to [DEFAULT_RETRO_TAG]
  // so every manual item always carries at least one tag, and the user can
  // add/remove via the same chip UI used on existing items.
  const [newTags, setNewTags] = useState<RetroTag[]>([DEFAULT_RETRO_TAG]);
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  function handleAdd() {
    if (!newText.trim()) return;
    const text = newText.trim();

    const formData = new FormData();
    formData.set("text", text);
    formData.set("category", category);
    // Send the whole tag set as JSON. The server action merges in any
    // auto-detected tags from the description. Week defaults to 4 at the
    // schema level — no client input needed.
    formData.set("tags", JSON.stringify(newTags));

    startTransition(async () => {
      const result = await addRetroItem(formData);
      if (result.success) {
        setNewText("");
        setNewTags([DEFAULT_RETRO_TAG]);
        addToast("Item added", "success");
      } else {
        addToast(result.error ?? "Failed to add item", "error");
      }
    });
  }

  function handleRemoveNewTag(tag: string) {
    setNewTags((current) => {
      const next = current.filter((t) => t !== tag);
      return next.length > 0 ? next : [DEFAULT_RETRO_TAG];
    });
  }

  function handleAddNewTag(tag: RetroTag) {
    setNewTags((current) => (current.includes(tag) ? current : [...current, tag]));
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

        {/* Add new item — stays at the bottom of the list */}
        <div className="bg-surface border border-border rounded-xl p-3 mt-3 space-y-2">
          <div className="flex gap-2">
            <input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder={`Add a "${title.toLowerCase()}" item...`}
              disabled={isPending}
              className="flex-1 px-4 py-2.5 bg-white border border-border rounded-xl text-sm text-foreground placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 disabled:opacity-50"
            />
            <button
              onClick={handleAdd}
              disabled={isPending || !newText.trim()}
              className="px-3 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              Add
            </button>
          </div>
          {/* Same chip-based tag picker as existing retro cards — multi-select,
              with × to remove and "+ Tag" menu to add. */}
          <div className="flex flex-wrap items-center gap-1.5">
            {newTags.map((t) => (
              <TagChip
                key={t}
                tag={t}
                onRemove={() => handleRemoveNewTag(t)}
                disabled={isPending}
              />
            ))}
            <AddTagMenu
              currentTags={newTags}
              onPick={handleAddNewTag}
              disabled={isPending}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TagChip({
  tag,
  onRemove,
  disabled,
}: {
  tag: string;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const style = RETRO_TAG_STYLES[tag as RetroTag] ?? RETRO_TAG_STYLES.Other;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium border"
      style={{ backgroundColor: style.bg, color: style.text, borderColor: style.border }}
    >
      {tag}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove ${tag} tag`}
          className="opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30"
          style={{ color: style.text }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </span>
  );
}

/**
 * Pure-UI dropdown for picking a tag not already in `currentTags`. The caller
 * owns the "what happens when a tag is picked" logic via `onPick` — for
 * existing retro items the caller persists through `addTagToItem`, while the
 * manual-input form just appends to local state before submission.
 */
export function AddTagMenu({
  currentTags,
  onPick,
  disabled,
}: {
  currentTags: string[];
  onPick: (tag: RetroTag) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const available = RETRO_TAGS.filter((t) => !currentTags.includes(t));

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (available.length === 0) return null;

  function handlePick(tag: RetroTag) {
    setOpen(false);
    onPick(tag);
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium border border-dashed border-border text-muted hover:text-foreground hover:border-border-light transition-colors disabled:opacity-50"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Tag
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[140px] animate-fade-in">
          {available.map((t) => {
            const style = RETRO_TAG_STYLES[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => handlePick(t)}
                className="w-full text-left px-2 py-1.5 text-xs hover:bg-surface-hover transition-colors flex items-center gap-1.5"
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm border"
                  style={{ backgroundColor: style.bg, borderColor: style.border }}
                />
                <span className="text-foreground">{t}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RetroCard({ item }: { item: RetroItemData }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [showConfirm, setShowConfirm] = useState(false);
  // Optimistic copy of tags so add/remove feels instant. Synced back to the server
  // via revalidation after each action completes.
  const [tags, setTags] = useState<string[]>(item.tags);
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  // Reset local tags when the server revalidates with fresh props.
  // Uses the React-documented "storing info from previous renders" pattern
  // (https://react.dev/reference/react/useState#storing-information-from-previous-renders).
  const [lastServerTags, setLastServerTags] = useState(item.tags);
  if (lastServerTags !== item.tags) {
    setLastServerTags(item.tags);
    setTags(item.tags);
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

  return (
    <div className="group bg-surface border border-border rounded-xl p-4 hover:border-border-light transition-all">
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full px-2 py-1.5 bg-white border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50 resize-none"
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
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header: sprint-week + source provenance. Fall back to 4 if the
                week somehow wasn't set (pre-migration prod rows, etc.) so the
                label never reads "Week  via Slack" with an empty gap. */}
            <span className="block text-[10px] text-muted">
              Week {item.week ?? 4} via {item.source === "slack" ? "Slack" : "Manual"}
            </span>

            {/* Description comes before tags — tags are moved below per
                recent UX change so the idea itself reads first. */}
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
        </div>
      )}
    </div>
  );
}
