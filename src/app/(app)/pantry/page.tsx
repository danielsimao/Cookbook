"use client";

import { useEffect, useState } from "react";
import { Plus, X, Package, Search } from "lucide-react";
import { toast } from "@/components/toaster";

interface PantryItem {
  id: string;
  name: string;
}

export default function PantryPage() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/pantry")
      .then((r) => r.json())
      .then(setItems)
      .catch(() => toast("Failed to load pantry", "error"))
      .finally(() => setLoading(false));
  }, []);

  async function addItem() {
    const name = newItem.trim();
    if (!name) return;
    try {
      const res = await fetch("/api/pantry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const item = await res.json();
      setItems((prev) => {
        if (prev.some((p) => p.id === item.id)) return prev;
        return [...prev, item];
      });
      setNewItem("");
    } catch {
      toast("Failed to add item", "error");
    }
  }

  async function removeItem(name: string) {
    try {
      await fetch(`/api/pantry?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      setItems((prev) => prev.filter((p) => p.name !== name));
    } catch {
      toast("Failed to remove item", "error");
    }
  }

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pantry</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Items you already have at home. These will be highlighted on your shopping list.
        </p>
      </div>

      {/* Add item */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="Add ingredient to pantry..."
          className="flex-1 px-4 py-2.5 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={addItem}
          disabled={!newItem.trim()}
          className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      {items.length > 10 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter pantry..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {/* Items list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-1">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card group"
            >
              <span className="text-sm">{item.name}</span>
              <button
                onClick={() => removeItem(item.name)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-muted-foreground hover:text-destructive transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {items.length === 0
              ? "Your pantry is empty"
              : "No items match your search"}
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {items.length} item{items.length !== 1 ? "s" : ""} in pantry
      </p>
    </div>
  );
}
