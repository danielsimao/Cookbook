"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ShoppingCart,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  isThisWeek,
} from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/components/toaster";
import { ResponsiveModal } from "@/components/responsive-modal";

interface MergedIngredient {
  name: string;
  quantity: string;
  category: string;
  checked?: boolean;
}

interface CheckboxIconProps {
  checked: boolean;
}

function CheckboxIcon({ checked }: CheckboxIconProps) {
  return (
    <div
      className={cn(
        "hand-check flex items-center justify-center shrink-0",
        checked && "checked"
      )}
    >
      {checked && <Check className="h-3 w-3 text-primary-foreground" />}
    </div>
  );
}

const CHECKED_KEY_PREFIX = "cookbook-shopping-checked-";

interface CustomItem {
  id: string;
  name: string;
  checked: boolean;
}

function getWeekKey(startDate: string) {
  return startDate.split("T")[0];
}

export default function ShoppingListPageWrapper() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground font-hand">Loading...</div>}>
      <ShoppingListPage />
    </Suspense>
  );
}

function ShoppingListPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const now = new Date();
  const weekBase = searchParams.get("startDate")
    ? new Date(searchParams.get("startDate")!)
    : now;
  const weekStart = startOfWeek(weekBase, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekBase, { weekStartsOn: 1 });
  const startDate = weekStart.toISOString();
  const endDate = weekEnd.toISOString();
  const weekKey = getWeekKey(startDate);

  const [ingredients, setIngredients] = useState<MergedIngredient[]>([]);
  const [pantryItems, setPantryItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`${CHECKED_KEY_PREFIX}${weekKey}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [highlightedItem, setHighlightedItem] = useState<string | null>(null);
  const [showUncheckConfirm, setShowUncheckConfirm] = useState(false);

  // Persist checked state for recipe ingredients only
  useEffect(() => {
    try { localStorage.setItem(`${CHECKED_KEY_PREFIX}${weekKey}`, JSON.stringify(Array.from(checked))); } catch { /* Storage unavailable */ }
  }, [checked, weekKey]);

  // Fetch custom items from server
  useEffect(() => {
    fetch(`/api/shopping-list/custom?startDate=${startDate}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((items: CustomItem[]) => setCustomItems(items))
      .catch(() => {});
  }, [startDate]);

  function navigateWeek(date: Date) {
    const ws = startOfWeek(date, { weekStartsOn: 1 });
    const we = endOfWeek(date, { weekStartsOn: 1 });
    router.push(`/shopping-list?startDate=${ws.toISOString()}&endDate=${we.toISOString()}`);
  }

  const fetchList = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await fetch(`/api/shopping-list?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const newIngredients: MergedIngredient[] = data.ingredients || [];
      setIngredients(newIngredients);
      setPantryItems(data.pantryItems || []);

      // Reconcile checked items — keep checked state for items that still exist
      if (isRefresh) {
        setChecked((prev) => {
          const newNames = new Set(newIngredients.map((i) => i.name));
          const reconciled = new Set<string>();
          prev.forEach((name) => {
            if (newNames.has(name) || name.startsWith("custom:")) {
              reconciled.add(name);
            }
          });
          return reconciled;
        });
      }
    } catch {
      toast("Failed to generate shopping list", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  function toggleCheck(name: string) {
    if (name.startsWith("custom:")) {
      // Toggle custom item checked state via API
      const itemName = name.slice("custom:".length);
      const item = customItems.find((i) => i.name === itemName);
      if (!item) return;
      const newChecked = !item.checked;
      setCustomItems((prev) => prev.map((i) => i.name === itemName ? { ...i, checked: newChecked } : i));
      fetch("/api/shopping-list/custom", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: startDate, name: itemName, checked: newChecked }),
      }).catch(() => {
        // Rollback on failure
        setCustomItems((prev) => prev.map((i) => i.name === itemName ? { ...i, checked: !newChecked } : i));
      });
    } else {
      // Recipe ingredients — localStorage only
      const next = new Set(checked);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      setChecked(next);
    }
  }

  function handleUncheckAll() {
    if (checkedCount > 3) {
      setShowUncheckConfirm(true);
    } else {
      setChecked(new Set());
    }
  }

  function confirmUncheckAll() {
    setChecked(new Set());
    // Uncheck all custom items
    const checkedCustom = customItems.filter((i) => i.checked);
    setCustomItems((prev) => prev.map((i) => ({ ...i, checked: false })));
    checkedCustom.forEach((item) => {
      fetch("/api/shopping-list/custom", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: startDate, name: item.name, checked: false }),
      }).catch(() => {});
    });
    setShowUncheckConfirm(false);
  }

  // Group by category
  const grouped: Record<string, MergedIngredient[]> = {};
  for (const ing of ingredients) {
    const cat = ing.category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(ing);
  }

  const totalItems = ingredients.length + customItems.length;
  const checkedCount =
    ingredients.filter((i) => checked.has(i.name)).length +
    customItems.filter((i) => i.checked).length;
  const progress = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  async function addCustomItem() {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    if (customItems.some((i) => i.name.toLowerCase() === lower)) {
      toast(`"${trimmed}" is already in your extra items`, "error");
      return;
    }
    if (ingredients.some((i) => i.name.toLowerCase() === lower)) {
      setHighlightedItem(trimmed);
      setTimeout(() => setHighlightedItem(null), 2000);
      toast(`"${trimmed}" is already in your shopping list`, "info");
      setNewItem("");
      return;
    }
    // Optimistic add
    const tempItem: CustomItem = { id: `temp-${Date.now()}`, name: trimmed, checked: false };
    setCustomItems((prev) => [...prev, tempItem]);
    setNewItem("");

    try {
      const res = await fetch("/api/shopping-list/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: startDate, name: trimmed }),
      });
      if (!res.ok) throw new Error();
      const saved: CustomItem = await res.json();
      // Replace temp item with server response
      setCustomItems((prev) => prev.map((i) => i.id === tempItem.id ? saved : i));
    } catch {
      // Rollback
      setCustomItems((prev) => prev.filter((i) => i.id !== tempItem.id));
      toast("Failed to add item", "error");
    }
  }

  async function removeCustomItem(name: string) {
    const removed = customItems.find((i) => i.name === name);
    setCustomItems((prev) => prev.filter((i) => i.name !== name));

    try {
      await fetch(`/api/shopping-list/custom?weekStart=${encodeURIComponent(startDate)}&name=${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
    } catch {
      // Rollback
      if (removed) setCustomItems((prev) => [...prev, removed]);
      toast("Failed to remove item", "error");
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/meal-plan"
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold hand-underline">Shopping List</h1>
        </div>
        <button
          onClick={() => fetchList(true)}
          disabled={refreshing}
          className="p-2 rounded-lg hover:bg-secondary inline-flex items-center gap-1.5"
          title="Refresh"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </button>
      </div>

      {refreshing && (
        <p className="text-sm text-muted-foreground text-center font-hand animate-pulse">
          Regenerating your shopping list...
        </p>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigateWeek(subWeeks(weekStart, 1))}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="font-hand text-lg font-bold">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
          </p>
          {!isThisWeek(weekStart, { weekStartsOn: 1 }) && (
            <button
              onClick={() => navigateWeek(new Date())}
              className="font-hand text-sm text-primary hover:underline"
            >
              Back to this week
            </button>
          )}
        </div>
        <button
          onClick={() => navigateWeek(addWeeks(weekStart, 1))}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Progress */}
      {totalItems > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {checkedCount} of {totalItems} items
            </span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{Math.round(progress)}%</span>
              {checkedCount > 0 && (
                <button
                  onClick={handleUncheckAll}
                  className="text-xs text-muted-foreground hover:text-foreground"
                  aria-label="Clear all checked"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{
                width: `${progress}%`,
                backgroundImage:
                  "repeating-linear-gradient(90deg, transparent, transparent 6px, rgba(255,255,255,0.3) 6px, rgba(255,255,255,0.3) 10px)",
              }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="font-hand text-base text-muted-foreground">
              AI is merging and organizing your ingredients...
            </p>
          </div>
        </div>
      ) : totalItems === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="font-hand text-base text-muted-foreground">No items to buy</p>
          <p className="font-hand text-sm text-muted-foreground mt-1">
            Add recipes to your meal plan first
          </p>
          <Link
            href="/meal-plan"
            className="btn-cookbook inline-block mt-4"
          >
            Go to Meal Plan
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="section-header mb-2">
                {category}
              </h3>
              <div className="space-y-0">
                {items.map((item) => {
                  const isChecked = checked.has(item.name);
                  const inPantry = pantryItems.some(
                    (p) => p.toLowerCase() === item.name.toLowerCase()
                  );
                  const isHighlighted = highlightedItem?.toLowerCase() === item.name.toLowerCase();
                  return (
                    <button
                      key={item.name}
                      onClick={() => toggleCheck(item.name)}
                      className={cn(
                        "flex items-center gap-3 w-full p-3 rounded border-b border-border transition-colors text-left",
                        isChecked
                          ? "bg-muted/50"
                          : "hover:bg-secondary",
                        isHighlighted && "ring-2 ring-primary animate-pulse"
                      )}
                    >
                      <CheckboxIcon checked={isChecked} />
                      <div className="flex-1 min-w-0">
                        <span
                          className={cn(
                            "text-sm",
                            isChecked && "line-through text-muted-foreground"
                          )}
                        >
                          {item.name}
                        </span>
                        {inPantry && (
                          <span className="ml-2 washi-tape washi-tape-green text-xs">
                            In pantry
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-sm text-muted-foreground shrink-0",
                          isChecked && "line-through"
                        )}
                      >
                        {item.quantity}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Extra Items */}
      {!loading && (
        <div className="sticky-note space-y-3">
          <h3 className="section-header mb-2">Extra Items</h3>

          {customItems.length > 0 && (
            <div className="space-y-0">
              {customItems.map((item) => {
                const key = `custom:${item.name}`;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 w-full p-3 rounded border-b border-border transition-colors",
                      item.checked ? "bg-muted/50" : "hover:bg-secondary"
                    )}
                  >
                    <button
                      onClick={() => toggleCheck(key)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <CheckboxIcon checked={item.checked} />
                      <span
                        className={cn(
                          "text-sm",
                          item.checked && "line-through text-muted-foreground"
                        )}
                      >
                        {item.name}
                      </span>
                    </button>
                    <button
                      onClick={() => removeCustomItem(item.name)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addCustomItem();
              }}
              placeholder="Add an item..."
              className="input-cookbook flex-1 font-hand"
            />
            <button
              onClick={addCustomItem}
              disabled={!newItem.trim()}
              className="font-hand text-primary hover:text-primary/80 disabled:text-muted-foreground transition-colors p-2"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Uncheck all confirmation */}
      <ResponsiveModal open={showUncheckConfirm} onClose={() => setShowUncheckConfirm(false)}>
        <h3 className="font-display font-bold">Uncheck all items?</h3>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to uncheck {checkedCount} items?
        </p>
        <div className="flex gap-3">
          <button onClick={() => setShowUncheckConfirm(false)} className="flex-1 py-2 border hover:bg-secondary font-hand text-base rounded">Cancel</button>
          <button onClick={confirmUncheckAll} className="flex-1 py-2 bg-destructive text-destructive-foreground font-hand text-base font-bold rounded">Uncheck all</button>
        </div>
      </ResponsiveModal>
    </div>
  );
}
