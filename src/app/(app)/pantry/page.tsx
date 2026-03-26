"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X, Search, Undo2 } from "lucide-react";
import { toast } from "@/components/toaster";

interface PantryItem {
  id: string;
  name: string;
}

export default function PantryPage() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [search, setSearch] = useState("");
  const [ingredientSuggestions, setIngredientSuggestions] = useState<string[]>(
    []
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [highlightedItem, setHighlightedItem] = useState<string | null>(null);
  const [undoItem, setUndoItem] = useState<PantryItem | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function loadData() {
    setLoading(true);
    setError(false);
    try {
      const loadPantry = fetch("/api/pantry")
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then(setItems);

      const loadSuggestions = fetch("/api/suggestions")
        .then((r) => {
          if (!r.ok) throw new Error(`Suggestions API: ${r.status}`);
          return r.json();
        })
        .then((data) => setIngredientSuggestions(data.ingredients ?? []))
        .catch((err) => console.error("Failed to load suggestions:", err));

      await Promise.all([loadPantry, loadSuggestions]);
    } catch {
      setError(true);
      toast("Failed to load pantry", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function addItem(name?: string) {
    const itemName = (name ?? newItem).trim();
    if (!itemName) return;

    // Check for duplicates (case-insensitive)
    const existing = items.find(
      (i) => i.name.toLowerCase() === itemName.toLowerCase()
    );
    if (existing) {
      setHighlightedItem(existing.name);
      setTimeout(() => setHighlightedItem(null), 2000);
      setNewItem("");
      inputRef.current?.focus();
      return;
    }

    setShowSuggestions(false);
    setSelectedIndex(-1);
    try {
      const res = await fetch("/api/pantry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: itemName }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const item = await res.json();
      setItems((prev) => {
        if (prev.some((p) => p.id === item.id)) return prev;
        return [...prev, item];
      });
      setNewItem("");
      inputRef.current?.focus();
    } catch {
      toast("Failed to add item", "error");
    }
  }

  const pantryNames = new Set(items.map((i) => i.name.toLowerCase()));
  const filteredSuggestions =
    newItem.trim().length > 0
      ? ingredientSuggestions
          .filter(
            (s) =>
              s.toLowerCase().includes(newItem.toLowerCase()) &&
              !pantryNames.has(s.toLowerCase())
          )
          .slice(0, 5)
      : [];

  async function removeItem(name: string) {
    const removedItem = items.find((i) => i.name === name);
    if (!removedItem) return;

    // Optimistically remove
    setItems((prev) => prev.filter((p) => p.name !== name));

    // Clear any previous undo
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);

    setUndoItem(removedItem);

    // Auto-dismiss undo after 5 seconds
    undoTimeoutRef.current = setTimeout(() => {
      setUndoItem(null);
    }, 5000);

    try {
      await fetch(`/api/pantry?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
    } catch {
      // Rollback on failure
      setItems((prev) => [...prev, removedItem]);
      setUndoItem(null);
      toast("Failed to remove item", "error");
    }
  }

  async function handleUndo() {
    if (!undoItem) return;
    const item = undoItem;
    setUndoItem(null);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);

    try {
      const res = await fetch("/api/pantry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: item.name }),
      });
      const restored = await res.json();
      setItems((prev) => [...prev, restored]);
    } catch {
      toast("Failed to undo", "error");
    }
  }

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  if (error && !loading) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold hand-underline">Pantry</h1>
        </div>
        <div className="text-center py-12 space-y-4">
          <p className="font-hand text-base text-muted-foreground">
            Failed to load pantry
          </p>
          <button
            onClick={loadData}
            className="btn-cookbook inline-flex items-center gap-2"
            aria-label="Retry"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold hand-underline">
          Pantry
          {!loading && (
            <span className="font-hand text-base font-normal text-muted-foreground ml-2">
              ({items.length} item{items.length !== 1 ? "s" : ""})
            </span>
          )}
        </h1>
        <p className="font-hand text-base text-muted-foreground mt-1">
          Items you already have at home. These will be highlighted on your shopping list.
        </p>
      </div>

      {/* Add item */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newItem}
            onChange={(e) => {
              setNewItem(e.target.value);
              setShowSuggestions(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              blurTimeoutRef.current = setTimeout(
                () => setShowSuggestions(false),
                150
              );
            }}
            onKeyDown={(e) => {
              if (
                e.key === "ArrowDown" &&
                showSuggestions &&
                filteredSuggestions.length > 0
              ) {
                e.preventDefault();
                setSelectedIndex((i) =>
                  i < filteredSuggestions.length - 1 ? i + 1 : 0
                );
              } else if (e.key === "ArrowUp" && showSuggestions) {
                e.preventDefault();
                setSelectedIndex((i) =>
                  i > 0 ? i - 1 : filteredSuggestions.length - 1
                );
              } else if (e.key === "Enter") {
                if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
                  addItem(filteredSuggestions[selectedIndex]);
                } else {
                  addItem();
                }
              } else if (e.key === "Escape") {
                setShowSuggestions(false);
              }
            }}
            placeholder="Add ingredient to pantry..."
            className="input-cookbook flex-1 px-4 py-2.5 text-sm"
            role="combobox"
            aria-expanded={
              showSuggestions && filteredSuggestions.length > 0
            }
            aria-controls="ingredient-suggestions"
            aria-activedescendant={
              selectedIndex >= 0
                ? `suggestion-${selectedIndex}`
                : undefined
            }
            autoComplete="off"
          />
          <button
            onClick={() => addItem()}
            disabled={!newItem.trim()}
            className="btn-cookbook px-4 py-2.5 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            id="ingredient-suggestions"
            role="listbox"
            className="absolute left-0 right-12 z-10 mt-1 overflow-hidden rounded-sm border border-border bg-card shadow-[2px_3px_8px_rgba(59,35,20,0.08),0_1px_2px_rgba(59,35,20,0.05)]"
          >
            {filteredSuggestions.map((suggestion, i) => (
              <button
                key={suggestion}
                id={`suggestion-${i}`}
                role="option"
                aria-selected={i === selectedIndex}
                className={`w-full text-left px-4 py-2 font-hand text-sm transition-colors cursor-pointer ${
                  i === selectedIndex
                    ? "bg-secondary"
                    : "hover:bg-secondary"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (blurTimeoutRef.current)
                    clearTimeout(blurTimeoutRef.current);
                  addItem(suggestion);
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search — always visible */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter pantry..."
          className="input-cookbook w-full pl-10 pr-4 py-2 text-sm"
        />
      </div>

      {/* Items list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-0">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-3 border-b border-border transition-all ${
                highlightedItem === item.name
                  ? "ring-2 ring-primary animate-pulse bg-primary/5"
                  : ""
              }`}
            >
              <span className="text-sm">{item.name}</span>
              <button
                onClick={() => removeItem(item.name)}
                className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="font-hand text-base text-muted-foreground">
            {items.length === 0
              ? "Your pantry is empty"
              : "No items match your search"}
          </p>
        </div>
      )}

      {/* Undo toast */}
      {undoItem && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
          <span className="text-sm">
            Removed &quot;{undoItem.name}&quot;
          </span>
          <button
            onClick={handleUndo}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
