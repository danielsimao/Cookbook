"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Heart,
  Clock,
  Grid3X3,
  List,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/toaster";
import { MEAL_TYPES } from "@/lib/recipe-form";

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  cuisine: string | null;
  mealType: string | null;
  tags: string[];
  prepTime: number | null;
  cookTime: number | null;
  isFavorite: boolean;
  servings: number;
}

const WASHI_COLORS = ["washi-tape-pink", "washi-tape-blue", "washi-tape-green", "washi-tape-yellow", "washi-tape-pink"];
const WASHI_ROTATIONS = ["-1deg", "0.5deg", "-0.5deg", "1deg", "-0.8deg"];

const VIEW_MODE_KEY = "cookbook-view-mode";

export default function RecipesPageWrapper() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <RecipesPage />
    </Suspense>
  );
}

function RecipesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [aiSearch, setAiSearch] = useState(false);
  const [filterMealType, setFilterMealType] = useState<string>(
    searchParams.get("mealType") || ""
  );
  const [filterFavorite, setFilterFavorite] = useState(
    searchParams.get("favorite") === "true"
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_KEY);
      if (saved === "list" || saved === "grid") return saved;
    } catch {
      // Storage unavailable
    }
    return "grid";
  });
  const [searching, setSearching] = useState(false);

  function persistViewMode(mode: "grid" | "list") {
    setViewMode(mode);
    try { localStorage.setItem(VIEW_MODE_KEY, mode); } catch { /* Storage unavailable */ }
  }

  function updateURL(params: { search?: string; mealType?: string; favorite?: boolean }) {
    const url = new URLSearchParams();
    const s = params.search ?? search;
    const m = params.mealType ?? filterMealType;
    const f = params.favorite ?? filterFavorite;
    if (s) url.set("search", s);
    if (m) url.set("mealType", m);
    if (f) url.set("favorite", "true");
    const qs = url.toString();
    router.push(qs ? `/recipes?${qs}` : "/recipes");
  }

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams();
    if (search && !aiSearch) params.set("search", search);
    if (filterMealType) params.set("mealType", filterMealType);
    if (filterFavorite) params.set("favorite", "true");

    try {
      const res = await fetch(`/api/recipes?${params}`);
      const data = await res.json();
      setRecipes(data);
    } catch {
      setError(true);
      toast("Failed to load recipes", "error");
    } finally {
      setLoading(false);
    }
  }, [search, aiSearch, filterMealType, filterFavorite]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  async function handleAiSearch() {
    if (!search.trim()) return;
    setSearching(true);
    setAiSearch(true);
    try {
      const res = await fetch("/api/recipes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: search }),
      });
      const data = await res.json();
      setRecipes(data);
    } catch {
      toast("AI search failed", "error");
    } finally {
      setSearching(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setFilterMealType("");
    setFilterFavorite(false);
    setAiSearch(false);
    router.push("/recipes");
  }

  function handleFilterFavorite() {
    const next = !filterFavorite;
    setFilterFavorite(next);
    updateURL({ favorite: next });
  }

  function handleFilterMealType(type: string) {
    const next = filterMealType === type ? "" : type;
    setFilterMealType(next);
    updateURL({ mealType: next });
  }

  const hasFilters = search || filterMealType || filterFavorite;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold hand-underline">Recipes</h1>
        <Link
          href="/recipes/new"
          className="btn-cookbook inline-flex items-center gap-2 px-4 py-2"
        >
          <Plus className="h-4 w-4" />
          Add
        </Link>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setAiSearch(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.shiftKey) handleAiSearch();
            }}
            placeholder="Search recipes... (Shift+Enter for AI search)"
            className="input-cookbook w-full pl-10 pr-4 py-2.5 text-sm"
          />
        </div>
        <button
          onClick={handleAiSearch}
          disabled={!search.trim() || searching}
          className="px-3 py-2.5 rounded-lg border bg-card hover:bg-secondary disabled:opacity-50 transition-colors"
          title="AI Smart Search"
        >
          <Sparkles className={cn("h-4 w-4", searching && "animate-spin")} />
        </button>
      </div>

      {/* AI Search loading indicator */}
      {searching && (
        <p className="text-sm text-muted-foreground text-center font-hand animate-pulse">
          AI is searching your recipes...
        </p>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleFilterFavorite}
          className={cn(
            "washi-tape washi-tape-pink inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
            filterFavorite
              ? "opacity-100 font-bold"
              : "opacity-70 hover:opacity-90"
          )}
          style={{ transform: 'rotate(-1deg)' }}
        >
          <Heart className="h-3 w-3" />
          Favorites
        </button>
        {MEAL_TYPES.map((type, i) => (
          <button
            key={type}
            onClick={() => handleFilterMealType(type)}
            className={cn(
              `washi-tape ${WASHI_COLORS[i]} px-3 py-1.5 text-xs font-medium capitalize transition-colors`,
              filterMealType === type
                ? "opacity-100 font-bold"
                : "opacity-70 hover:opacity-90"
            )}
            style={{ transform: `rotate(${WASHI_ROTATIONS[i]})` }}
          >
            {type}
          </button>
        ))}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => persistViewMode("grid")}
            className={cn(
              "p-1.5 rounded",
              viewMode === "grid" ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => persistViewMode("list")}
            className={cn(
              "p-1.5 rounded",
              viewMode === "list" ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Results */}
      {error ? (
        <div className="text-center py-16 space-y-4">
          <p className="font-hand text-muted-foreground">
            Failed to load recipes
          </p>
          <button onClick={fetchRecipes} className="btn-cookbook">Retry</button>
        </div>
      ) : loading ? (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
              : "space-y-2"
          )}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={cn(
                "rounded bg-muted animate-pulse",
                viewMode === "grid" ? "h-56" : "h-20"
              )}
            />
          ))}
        </div>
      ) : recipes.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {recipes.map((recipe) => (
              <RecipeGridCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {recipes.map((recipe) => (
              <RecipeListCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-16">
          <span className="text-4xl block mb-3">🔍</span>
          <p className="font-hand text-muted-foreground">
            {hasFilters
              ? "No recipes match your filters"
              : "No recipes yet. Add your first one!"}
          </p>
        </div>
      )}

      <p className="font-hand text-xs text-muted-foreground text-center">
        {recipes.length} recipe{recipes.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

function RecipeGridCard({ recipe }: { recipe: Recipe }) {
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="group recipe-card overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">
            🍽️
          </div>
        )}
        {recipe.isFavorite && (
          <div className="absolute top-2 right-2">
            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-display font-bold text-sm line-clamp-2">{recipe.title}</h3>
        <div className="font-hand flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
          {recipe.cuisine && <span>{recipe.cuisine}</span>}
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {totalTime}m
            </span>
          )}
        </div>
        {recipe.tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {recipe.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="stamp-badge px-1.5 py-0.5 text-[10px]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

function RecipeListCard({ recipe }: { recipe: Recipe }) {
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="paper-card p-3 flex items-center gap-4 hover:bg-secondary transition-colors"
    >
      <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden shrink-0">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl">
            🍽️
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-display font-bold text-sm truncate">{recipe.title}</h3>
        <div className="font-hand flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {recipe.cuisine && <span>{recipe.cuisine}</span>}
          {recipe.mealType && (
            <span className="capitalize">{recipe.mealType}</span>
          )}
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {totalTime}m
            </span>
          )}
        </div>
      </div>
      {recipe.isFavorite && (
        <Heart className="h-4 w-4 fill-red-500 text-red-500 shrink-0" />
      )}
    </Link>
  );
}
