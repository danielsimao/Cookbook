"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ShoppingCart,
  Loader2,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import {
  startOfWeek,
  endOfWeek,
  format,
} from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/components/toaster";

interface MergedIngredient {
  name: string;
  quantity: string;
  category: string;
  checked?: boolean;
}

export default function ShoppingListPageWrapper() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <ShoppingListPage />
    </Suspense>
  );
}

function ShoppingListPage() {
  const searchParams = useSearchParams();
  const startDate = searchParams.get("startDate") || startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
  const endDate = searchParams.get("endDate") || endOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();

  const [ingredients, setIngredients] = useState<MergedIngredient[]>([]);
  const [pantryItems, setPantryItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await fetch(`/api/shopping-list?${params}`);
      const data = await res.json();
      setIngredients(data.ingredients || []);
      setPantryItems(data.pantryItems || []);
    } catch {
      toast("Failed to generate shopping list", "error");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  function toggleCheck(name: string) {
    const next = new Set(checked);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setChecked(next);
  }

  // Group by category
  const grouped: Record<string, MergedIngredient[]> = {};
  for (const ing of ingredients) {
    const cat = ing.category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(ing);
  }

  const totalItems = ingredients.length;
  const checkedCount = checked.size;
  const progress = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

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
          <h1 className="text-2xl font-bold">Shopping List</h1>
          <p className="text-xs text-muted-foreground">
            {format(new Date(startDate), "MMM d")} -{" "}
            {format(new Date(endDate), "MMM d, yyyy")}
          </p>
        </div>
        <button
          onClick={fetchList}
          className="p-2 rounded-lg hover:bg-secondary"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Progress */}
      {totalItems > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {checkedCount} of {totalItems} items
            </span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">
              AI is merging and organizing your ingredients...
            </p>
          </div>
        </div>
      ) : ingredients.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No items to buy</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add recipes to your meal plan first
          </p>
          <Link
            href="/meal-plan"
            className="inline-block mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            Go to Meal Plan
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {category}
              </h3>
              <div className="space-y-1">
                {items.map((item) => {
                  const isChecked = checked.has(item.name);
                  const inPantry = pantryItems.some(
                    (p) => p.toLowerCase() === item.name.toLowerCase()
                  );
                  return (
                    <button
                      key={item.name}
                      onClick={() => toggleCheck(item.name)}
                      className={cn(
                        "flex items-center gap-3 w-full p-3 rounded-lg transition-colors text-left",
                        isChecked
                          ? "bg-muted/50"
                          : "bg-card border hover:bg-secondary"
                      )}
                    >
                      <div
                        className={cn(
                          "h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                          isChecked
                            ? "bg-primary border-primary"
                            : "border-muted-foreground"
                        )}
                      >
                        {isChecked && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
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
                          <span className="ml-2 text-xs text-green-600 bg-green-50 dark:bg-green-950 px-1.5 py-0.5 rounded">
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
    </div>
  );
}
