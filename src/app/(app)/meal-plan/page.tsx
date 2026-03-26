"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Shuffle,
  RotateCcw,
  X,
  ShoppingCart,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { ResponsiveModal } from "@/components/responsive-modal";

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
const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

export default function MealPlanPage() {
  const router = useRouter();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [items, setItems] = useState<MealPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAddModal, setShowAddModal] = useState<{ date: Date; mealType: string } | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);
  const [randomizing, setRandomizing] = useState(false);
  const [showFillPreview, setShowFillPreview] = useState(false);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  function navigateWeek(date: Date) {
    setCurrentWeek(date);
    const ws = startOfWeek(date, { weekStartsOn: 1 });
    const we = endOfWeek(date, { weekStartsOn: 1 });
    router.push(`/meal-plan?startDate=${ws.toISOString()}&endDate=${we.toISOString()}`);
  }

  const fetchMealPlan = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
      });
      const res = await fetch(`/api/meal-plan?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data);
    } catch {
      setError(true);
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
      setRecipesLoading(true);
      try {
        const res = await fetch("/api/recipes");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setRecipes(await res.json());
      } catch {
        toast("Failed to load recipes", "error");
      } finally {
        setRecipesLoading(false);
      }
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

  async function confirmRemoveItem() {
    if (!showRemoveConfirm) return;
    try {
      await fetch(`/api/meal-plan/${showRemoveConfirm}`, { method: "DELETE" });
      setItems(items.filter((i) => i.id !== showRemoveConfirm));
    } catch {
      toast("Failed to remove", "error");
    } finally {
      setShowRemoveConfirm(null);
    }
  }

  async function randomFill() {
    setShowFillPreview(true);
  }

  async function confirmRandomFill() {
    setShowFillPreview(false);
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

  function dayHasMeals(day: Date) {
    return items.some((item) => isSameDay(new Date(item.date), day));
  }

  const filteredRecipes = recipes.filter((r) =>
    r.title.toLowerCase().includes(recipeSearch.toLowerCase())
  );

  if (error && !loading) {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
        <h1 className="font-display text-xl md:text-2xl font-bold hand-underline">Meal Plan</h1>
        <div className="text-center py-12 space-y-4">
          <p className="font-hand text-base text-muted-foreground">Failed to load meal plan</p>
          <button onClick={fetchMealPlan} className="btn-cookbook" aria-label="Retry">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-xl md:text-2xl font-bold hand-underline shrink-0">Meal Plan</h1>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={randomFill}
            disabled={randomizing}
            className="inline-flex items-center gap-1.5 p-2 md:px-3 md:py-2 border text-sm hover:bg-secondary disabled:opacity-50 rounded"
            title="Fill week with random recipes"
          >
            <Shuffle className={cn("h-4 w-4", randomizing && "animate-spin")} />
            <span className="hidden sm:inline font-hand text-base">Fill Week</span>
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="inline-flex items-center gap-1.5 p-2 md:px-3 md:py-2 border text-sm hover:bg-secondary rounded"
            title="Clear week"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline font-hand text-base">Clear</span>
          </button>
          <Link
            href={`/shopping-list?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`}
            className="btn-cookbook inline-flex items-center gap-1.5 !px-3 !py-2 !text-sm"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Shopping List</span>
          </Link>
        </div>
      </div>

      {/* Week navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigateWeek(subWeeks(currentWeek, 1))}
          className="p-2 hover:bg-secondary rounded"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="font-display font-bold text-sm">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
          </p>
          <button
            onClick={() => {
              setCurrentWeek(new Date());
              setSelectedDay(new Date());
            }}
            className="font-hand text-sm text-primary hover:underline"
          >
            Today
          </button>
        </div>
        <button
          onClick={() => navigateWeek(addWeeks(currentWeek, 1))}
          className="p-2 hover:bg-secondary rounded"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <div className="md:flex md:gap-6">
          {/* Day selector */}
          <div className="grid grid-cols-7 gap-1 pb-3 md:pb-0 md:flex md:flex-col md:w-48 md:shrink-0">
            {days.map((day) => {
              const isSelected = isSameDay(day, selectedDay);
              const hasMeals = dayHasMeals(day);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "flex flex-col items-center py-2 md:flex-row md:gap-3 md:px-4 md:py-3 rounded transition-all font-hand",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isToday(day)
                        ? "border-2 border-primary bg-card"
                        : "bg-card hover:bg-secondary"
                  )}
                >
                  <span className="text-[0.6rem] md:text-xs uppercase tracking-wide opacity-80">
                    {format(day, "EEE")}
                  </span>
                  <span className="text-base md:text-base font-bold leading-none md:flex-1">
                    {format(day, "d")}
                  </span>
                  {hasMeals && !isSelected && (
                    <span className="hidden md:inline text-xs opacity-60">
                      {items.filter((i) => isSameDay(new Date(i.date), day)).length} meals
                    </span>
                  )}
                  {hasMeals && !isSelected && (
                    <span className="md:hidden w-1.5 h-1.5 rounded-full bg-accent mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Day content */}
          <div className="flex-1 space-y-4 md:space-y-5">
            <div className="flex items-baseline gap-2">
              <h2 className="font-display font-bold text-lg">
                {format(selectedDay, "EEEE")}
              </h2>
              <span className="font-hand text-muted-foreground text-base">
                {format(selectedDay, "MMM d")}
              </span>
              {isToday(selectedDay) && (
                <span className="stamp-badge text-[0.65rem]">Today</span>
              )}
            </div>

            {/* Meal sections */}
            {MEAL_TYPES.map((mealType) => {
              const dayItems = getItemsForDayMeal(selectedDay, mealType);
              return (
                <div key={mealType}>
                  <div className="font-hand text-base text-muted-foreground uppercase tracking-wide mb-2" role="heading" aria-level={3}>
                    <span aria-hidden="true">
                      {mealType === "breakfast" ? "🌅" : mealType === "lunch" ? "☀️" : "🌙"}
                    </span>{" "}
                    {MEAL_LABELS[mealType]}
                  </div>

                  {dayItems.length > 0 ? (
                    <div className="space-y-2">
                      {dayItems.map((item) => {
                        const totalTime = (item.recipe.prepTime || 0) + (item.recipe.cookTime || 0);
                        return (
                          <div key={item.id} className="paper-card overflow-hidden group">
                            {item.recipe.imageUrl && (
                              <Link href={`/recipes/${item.recipe.id}`}>
                                <img
                                  src={item.recipe.imageUrl}
                                  alt={item.recipe.title}
                                  className="w-full aspect-[16/7] object-cover"
                                />
                              </Link>
                            )}
                            <div className="p-3 flex items-center gap-3">
                              {!item.recipe.imageUrl && (
                                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-lg shrink-0">
                                  🍽️
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <Link
                                  href={`/recipes/${item.recipe.id}`}
                                  className="font-display font-bold text-sm hover:text-primary block truncate"
                                >
                                  {item.recipe.title}
                                </Link>
                                {totalTime > 0 && (
                                  <span className="font-hand text-sm text-muted-foreground">
                                    {totalTime} min
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => setShowRemoveConfirm(item.id)}
                                className="p-1.5 text-muted-foreground hover:text-destructive transition-opacity"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground font-hand py-2">
                      No meals planned
                    </p>
                  )}

                  <button
                    onClick={() => openAddModal(selectedDay, mealType)}
                    className="flex items-center gap-2 w-full px-4 py-3 mt-1 border-2 border-dashed border-border rounded text-muted-foreground hover:text-foreground hover:border-foreground transition-colors font-hand text-base"
                  >
                    <Plus className="h-4 w-4" />
                    Add {mealType}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Remove Confirmation */}
      <ResponsiveModal open={!!showRemoveConfirm} onClose={() => setShowRemoveConfirm(null)}>
        <h3 className="font-display font-bold">Remove this meal?</h3>
        <p className="text-sm text-muted-foreground">
          This will remove the meal from your plan.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setShowRemoveConfirm(null)} className="flex-1 py-2 border hover:bg-secondary font-hand text-base rounded">Cancel</button>
          <button onClick={confirmRemoveItem} className="flex-1 py-2 bg-destructive text-destructive-foreground font-hand text-base font-bold rounded">Remove</button>
        </div>
      </ResponsiveModal>

      {/* Fill Week Preview */}
      <ResponsiveModal open={showFillPreview} onClose={() => setShowFillPreview(false)}>
        <h3 className="font-display font-bold">Fill week with random recipes?</h3>
        <p className="text-sm text-muted-foreground">
          This will fill empty meal slots with randomly chosen recipes from your cookbook. Confirm to proceed.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setShowFillPreview(false)} className="flex-1 py-2 border hover:bg-secondary font-hand text-base rounded">Cancel</button>
          <button onClick={confirmRandomFill} className="flex-1 py-2 btn-cookbook">Confirm</button>
        </div>
      </ResponsiveModal>

      {/* Add Recipe Modal */}
      <ResponsiveModal open={!!showAddModal} onClose={() => setShowAddModal(null)} tall>
        {showAddModal && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-display font-bold">Add Recipe</h3>
                <p className="font-hand text-sm text-muted-foreground">
                  {format(showAddModal.date, "EEEE, MMM d")} · {showAddModal.mealType}
                </p>
              </div>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-1 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                placeholder="Search recipes..."
                autoFocus
                className="input-cookbook w-full pl-7 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              {recipesLoading ? (
                <div className="space-y-2 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : filteredRecipes.length > 0 ? (
                filteredRecipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    onClick={() => addToMealPlan(recipe.id)}
                    className="flex items-center gap-3 w-full p-2.5 hover:bg-secondary transition-colors text-left rounded"
                  >
                    {recipe.imageUrl ? (
                      <img src={recipe.imageUrl} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">🍽️</div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-display font-bold truncate">{recipe.title}</p>
                      {recipe.mealType && <p className="font-hand text-sm text-muted-foreground capitalize">{recipe.mealType}</p>}
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-center py-8 text-sm text-muted-foreground font-hand">No recipes found</p>
              )}
            </div>
          </>
        )}
      </ResponsiveModal>

      {/* Clear Confirmation */}
      <ResponsiveModal open={showClearConfirm} onClose={() => setShowClearConfirm(false)}>
        <h3 className="font-display font-bold">Clear this week?</h3>
        <p className="text-sm text-muted-foreground">
          This will remove all meals from {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d")}.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-2 border hover:bg-secondary font-hand text-base rounded">Cancel</button>
          <button onClick={clearWeek} className="flex-1 py-2 bg-destructive text-destructive-foreground font-hand text-base font-bold rounded">Clear Week</button>
        </div>
      </ResponsiveModal>
    </div>
  );
}
