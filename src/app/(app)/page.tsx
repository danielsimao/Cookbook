"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Link as LinkIcon,
  Calendar,
  ShoppingCart,
  Heart,
  Clock,
  Search,
} from "lucide-react";

interface Recipe {
  id: string;
  title: string;
  imageUrl: string | null;
  cuisine: string | null;
  mealType: string | null;
  prepTime: number | null;
  cookTime: number | null;
  isFavorite: boolean;
  createdAt: string;
}

export default function DashboardPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/recipes")
      .then((r) => r.json())
      .then((data) => {
        setRecipes(data.slice(0, 6));
        setFavorites(data.filter((r: Recipe) => r.isFavorite).slice(0, 4));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back 👋</h1>
        <p className="text-muted-foreground mt-1">
          What are we cooking today?
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link
          href="/recipes/new"
          className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-secondary transition-colors"
        >
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-medium">Add Recipe</span>
        </Link>

        <Link
          href="/recipes/new?mode=import"
          className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-secondary transition-colors"
        >
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <LinkIcon className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-medium">Import URL</span>
        </Link>

        <Link
          href="/meal-plan"
          className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-secondary transition-colors"
        >
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-medium">Meal Plan</span>
        </Link>

        <Link
          href="/shopping-list"
          className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-secondary transition-colors"
        >
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-medium">Shopping List</span>
        </Link>
      </div>

      {/* Search bar */}
      <Link
        href="/recipes?focus=search"
        className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card text-muted-foreground hover:bg-secondary transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="text-sm">Search recipes... &quot;something quick with chicken&quot;</span>
      </Link>

      {/* Favorites */}
      {favorites.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              Favorites
            </h2>
            <Link
              href="/recipes?favorite=true"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {favorites.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Recipes */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Recent Recipes
          </h2>
          <Link
            href="/recipes"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 rounded-xl bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : recipes.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-xl border bg-card">
            <span className="text-4xl block mb-3">📖</span>
            <p className="text-muted-foreground mb-4">
              Your cookbook is empty. Add your first recipe!
            </p>
            <Link
              href="/recipes/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Add Recipe
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const totalTime =
    (recipe.prepTime || 0) + (recipe.cookTime || 0);

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="group rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow"
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
        <h3 className="font-medium text-sm line-clamp-2">{recipe.title}</h3>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {recipe.cuisine && <span>{recipe.cuisine}</span>}
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {totalTime}m
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
