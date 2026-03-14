"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Users,
  Heart,
  Edit,
  Trash2,
  ChefHat,
  ExternalLink,
  Minus,
  Plus,
} from "lucide-react";
import { toast } from "@/components/toaster";

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  servings: number;
  prepTime: number | null;
  cookTime: number | null;
  cuisine: string | null;
  mealType: string | null;
  tags: string[];
  isFavorite: boolean;
  notes: string | null;
  ingredients: { id: string; name: string; quantity: number | null; unit: string | null; group: string | null; sortOrder: number }[];
  steps: { id: string; text: string; sortOrder: number }[];
}

export default function RecipeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setRecipe)
      .catch(() => toast("Recipe not found", "error"))
      .finally(() => setLoading(false));
  }, [id]);

  async function toggleFavorite() {
    if (!recipe) return;
    try {
      const res = await fetch(`/api/recipes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !recipe.isFavorite }),
      });
      if (res.ok) {
        setRecipe({ ...recipe, isFavorite: !recipe.isFavorite });
      }
    } catch {
      toast("Failed to update", "error");
    }
  }

  async function handleDelete() {
    try {
      await fetch(`/api/recipes/${id}`, { method: "DELETE" });
      toast("Recipe deleted", "success");
      router.push("/recipes");
    } catch {
      toast("Failed to delete", "error");
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto text-center py-16">
        <p className="text-muted-foreground">Recipe not found</p>
        <Link href="/recipes" className="text-primary hover:underline mt-2 inline-block">
          Back to recipes
        </Link>
      </div>
    );
  }

  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
  const sortedIngredients = [...recipe.ingredients].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedSteps = [...recipe.steps].sort((a, b) => a.sortOrder - b.sortOrder);
  const scaledServings = Math.round(recipe.servings * scale);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/recipes"
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1" />
        <button
          onClick={toggleFavorite}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <Heart
            className={`h-5 w-5 ${
              recipe.isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
            }`}
          />
        </button>
        <Link
          href={`/recipes/${id}/edit`}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <Edit className="h-5 w-5 text-muted-foreground" />
        </Link>
        <Link
          href={`/recipes/${id}/cook`}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
          title="Cooking mode"
        >
          <ChefHat className="h-5 w-5 text-muted-foreground" />
        </Link>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <Trash2 className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Image */}
      {recipe.imageUrl && (
        <div className="rounded-xl overflow-hidden aspect-video bg-muted">
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Title & Meta */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">{recipe.title}</h1>
        {recipe.description && (
          <p className="text-muted-foreground mt-2">{recipe.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-4 text-sm text-muted-foreground">
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {totalTime} min
              {recipe.prepTime && recipe.cookTime && (
                <span className="text-xs">
                  ({recipe.prepTime}m prep + {recipe.cookTime}m cook)
                </span>
              )}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {scaledServings} servings
          </span>
          {recipe.cuisine && <span>{recipe.cuisine}</span>}
          {recipe.mealType && (
            <span className="capitalize">{recipe.mealType}</span>
          )}
        </div>

        {recipe.tags.length > 0 && (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {recipe.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            View original
          </a>
        )}
      </div>

      {/* Scale */}
      <div className="flex items-center gap-3 p-3 rounded-xl border bg-card">
        <span className="text-sm font-medium">Scale</span>
        <button
          onClick={() => setScale(Math.max(0.25, scale - 0.25))}
          className="p-1.5 rounded-lg border hover:bg-secondary"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="text-sm font-medium min-w-[3rem] text-center">
          {scale}x
        </span>
        <button
          onClick={() => setScale(scale + 0.25)}
          className="p-1.5 rounded-lg border hover:bg-secondary"
        >
          <Plus className="h-3 w-3" />
        </button>
        {scale !== 1 && (
          <button
            onClick={() => setScale(1)}
            className="text-xs text-primary hover:underline ml-2"
          >
            Reset
          </button>
        )}
      </div>

      {/* Ingredients */}
      {sortedIngredients.length > 0 && (
        <div className="rounded-xl border bg-card p-6 space-y-3">
          <h2 className="font-semibold text-lg">Ingredients</h2>
          <ul className="space-y-2">
            {sortedIngredients.map((ing) => {
              const scaledQty = ing.quantity ? Math.round(ing.quantity * scale * 100) / 100 : null;
              return (
                <li key={ing.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 h-4 w-4 rounded border shrink-0" />
                  <span>
                    {scaledQty && (
                      <span className="font-medium">{scaledQty} </span>
                    )}
                    {ing.unit && <span>{ing.unit} </span>}
                    {ing.name}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Steps */}
      {sortedSteps.length > 0 && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-lg">Instructions</h2>
          <ol className="space-y-4">
            {sortedSteps.map((step, i) => (
              <li key={step.id} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed pt-1">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Notes */}
      {recipe.notes && (
        <div className="rounded-xl border bg-card p-6 space-y-2">
          <h2 className="font-semibold text-lg">Notes</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {recipe.notes}
          </p>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-semibold">Delete recipe?</h3>
            <p className="text-sm text-muted-foreground">
              This will permanently delete &quot;{recipe.title}&quot; and remove it from any meal plans.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-lg border hover:bg-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
