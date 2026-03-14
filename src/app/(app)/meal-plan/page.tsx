"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Shuffle,
  RotateCcw,
  X,
  ShoppingCart,
  Search,
} from "lucide-react";
import Link from "next/link";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  eachDayOfInterval,
  isToday,
  isSameDay,
} from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/components/toaster";

interface MealPlanItem {
  id: string;
  date: string;
  mealType: string;
  recipe: {
    id: string;
    title: string;
    imageUrl: string | null;
    prepTime: number | null;
    cookTime: number | null;
  };
}

interface Recipe {
  id: string;
  title: string;
  imageUrl: string | null;
  mealType: string | null;
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner"];

export default function MealPlanPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [items, setItems] = useState<MealPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState<{ date: Date; mealType: string } | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeSearch, setRecipeSearch] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [randomizing, setRandomizing] = useState(false);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const fetchMealPlan = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
      });
      const res = await fetch(`/api/meal-plan?${params}`);
      const data = await res.json();
      setItems(data);
    } catch {
      toast("Failed to load meal plan", "error");
    } finally {
      setLoading(false);
    }
  }, [weekStart.toISOString(), weekEnd.toISOString()]);

  useEffect(() => {
    fetchMealPlan();
  }, [fetchMealPlan]);

  async function openAddModal(date: Date, mealType: string) {
    setShowAddModal({ date, mealType });
    if (recipes.length === 0) {
      const res = await fetch("/api/recipes");
      setRecipes(await res.json());
    }
  }

  async function addToMealPlan(recipeId: string) {
    if (!showAddModal) return;
    try {
      await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: showAddModal.date.toISOString(),
          mealType: showAddModal.mealType,
          recipeId,
        }),
      });
      setShowAddModal(null);
      fetchMealPlan();
      toast("Recipe added to plan", "success");
    } catch {
      toast("Failed to add", "error");
    }
  }

  async function removeItem(itemId: string) {
    try {
      await fetch(`/api/meal-plan/${itemId}`, { method: "DELETE" });
      setItems(items.filter((i) => i.id !== itemId));
    } catch {
      toast("Failed to remove", "error");
    }
  }

  async function randomFill() {
    setRandomizing(true);
    try {
      const res = await fetch("/api/meal-plan/random", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: weekStart.toISOString(),
          endDate: weekEnd.toISOString(),
          mealTypes: MEAL_TYPES,
        }),
      });
      if (!res.ok) throw new Error();
      toast("Week filled with random recipes!", "success");
      fetchMealPlan();
    } catch {
      toast("Failed to fill week. Make sure you have some recipes.", "error");
    } finally {
      setRandomizing(false);
    }
  }

  async function clearWeek() {
    try {
      const params = new URLSearchParams({
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
      });
      await fetch(`/api/meal-plan/clear?${params}`, { method: "DELETE" });
      setItems([]);
      setShowClearConfirm(false);
      toast("Week cleared", "success");
    } catch {
      toast("Failed to clear", "error");
    }
  }

  function getItemsForDayMeal(day: Date, mealType: string) {
    return items.filter(
      (item) =>
        isSameDay(new Date(item.date), day) && item.mealType === mealType
    );
  }

  const filteredRecipes = recipes.filter((r) =>
    r.title.toLowerCase().includes(recipeSearch.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Meal Plan</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={randomFill}
            disabled={randomizing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-secondary disabled:opacity-50"
            title="Fill week with random recipes"
          >
            <Shuffle className={cn("h-4 w-4", randomizing && "animate-spin")} />
            <span className="hidden sm:inline">Fill Week</span>
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-secondary"
            title="Clear week"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
          <Link
            href={`/shopping-list?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Shopping List</span>
          </Link>
        </div>
      </div>

      {/* Week navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
          className="p-2 rounded-lg hover:bg-secondary"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="font-semibold">
            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </p>
          <button
            onClick={() => setCurrentWeek(new Date())}
            className="text-xs text-primary hover:underline"
          >
            Today
          </button>
        </div>
        <button
          onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
          className="p-2 rounded-lg hover:bg-secondary"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "rounded-xl border bg-card overflow-hidden",
                isToday(day) && "ring-2 ring-primary"
              )}
            >
              <div className="px-4 py-2 border-b bg-secondary/50 flex items-center justify-between">
                <span className="font-medium text-sm">
                  {format(day, "EEEE")}
                  <span className="text-muted-foreground ml-2">
                    {format(day, "MMM d")}
                  </span>
                </span>
                {isToday(day) && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    Today
                  </span>
                )}
              </div>
              <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                {MEAL_TYPES.map((mealType) => {
                  const dayItems = getItemsForDayMeal(day, mealType);
                  return (
                    <div key={mealType} className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {mealType}
                      </span>
                      {dayItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 group"
                        >
                          {item.recipe.imageUrl ? (
                            <img
                              src={item.recipe.imageUrl}
                              alt=""
                              className="h-8 w-8 rounded object-cover shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs shrink-0">
                              🍽️
                            </div>
                          )}
                          <Link
                            href={`/recipes/${item.recipe.id}`}
                            className="text-xs font-medium truncate flex-1 hover:text-primary"
                          >
                            {item.recipe.title}
                          </Link>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => openAddModal(day, mealType)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-dashed text-xs text-muted-foreground hover:text-foreground hover:border-foreground transition-colors w-full"
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Recipe Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
          <div className="bg-card rounded-t-xl md:rounded-xl w-full max-w-md max-h-[70vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Add Recipe</h3>
                <p className="text-xs text-muted-foreground">
                  {format(showAddModal.date, "EEEE, MMM d")} - {showAddModal.mealType}
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(null)}
                className="p-2 rounded-lg hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                  placeholder="Search recipes..."
                  autoFocus
                  className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {filteredRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => addToMealPlan(recipe.id)}
                  className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-secondary transition-colors text-left"
                >
                  {recipe.imageUrl ? (
                    <img
                      src={recipe.imageUrl}
                      alt=""
                      className="h-10 w-10 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                      🍽️
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{recipe.title}</p>
                    {recipe.mealType && (
                      <p className="text-xs text-muted-foreground capitalize">
                        {recipe.mealType}
                      </p>
                    )}
                  </div>
                </button>
              ))}
              {filteredRecipes.length === 0 && (
                <p className="text-center py-8 text-sm text-muted-foreground">
                  No recipes found
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-semibold">Clear this week?</h3>
            <p className="text-sm text-muted-foreground">
              This will remove all meals from{" "}
              {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d")}.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 rounded-lg border hover:bg-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={clearWeek}
                className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium"
              >
                Clear Week
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
