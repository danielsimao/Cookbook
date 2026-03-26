"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { formatQuantity } from "@/lib/format";
import {
  ArrowLeft,
  Heart,
  Edit,
  Trash2,
  ChefHat,
  ExternalLink,
  Minus,
  Plus,
} from "lucide-react";
import { toast } from "@/components/toaster";
import { TapedPhoto } from "@/components/scrapbook/taped-photo";
import { SectionHeader } from "@/components/scrapbook/section-header";
import { StampBadge } from "@/components/scrapbook/stamp-badge";

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
  ingredients: { id: string; name: string; quantity: number | null; unit: string | null; group: string | null; toTaste: boolean; sortOrder: number }[];
  steps: { id: string; text: string; sortOrder: number }[];
}

const SCALE_KEY_PREFIX = "cookbook-scale-";

export default function RecipeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scale, setScale] = useState(() => {
    try {
      const saved = localStorage.getItem(`${SCALE_KEY_PREFIX}${id}`);
      return saved ? parseFloat(saved) : 1;
    } catch {
      return 1;
    }
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function persistScale(newScale: number) {
    setScale(newScale);
    try {
      if (newScale === 1) {
        localStorage.removeItem(`${SCALE_KEY_PREFIX}${id}`);
      } else {
        localStorage.setItem(`${SCALE_KEY_PREFIX}${id}`, String(newScale));
      }
    } catch {
      // Storage unavailable
    }
  }

  function loadRecipe() {
    setLoading(true);
    setError(false);
    fetch(`/api/recipes/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setRecipe)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadRecipe();
  }, [id]);

  async function toggleFavorite() {
    if (!recipe) return;
    const prev = recipe.isFavorite;
    setRecipe({ ...recipe, isFavorite: !prev });
    try {
      const res = await fetch(`/api/recipes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !prev }),
      });
      if (!res.ok) {
        setRecipe({ ...recipe, isFavorite: prev });
        toast("Failed to update", "error");
      }
    } catch {
      setRecipe({ ...recipe, isFavorite: prev });
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
        <div className="h-64 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto text-center py-16 space-y-4">
        <p className="text-muted-foreground font-hand text-lg">Recipe not found</p>
        <button
          onClick={loadRecipe}
          className="btn-cookbook inline-flex items-center gap-2"
          aria-label="Retry"
        >
          Retry
        </button>
        <div>
          <Link href="/recipes" className="text-primary hover:underline mt-2 inline-block font-hand">
            Back to recipes
          </Link>
        </div>
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
          className="p-2 hover:bg-secondary transition-colors rounded"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1" />
        <button
          onClick={toggleFavorite}
          className="p-2 hover:bg-secondary transition-colors rounded"
          aria-label={recipe.isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            className={`h-5 w-5 ${
              recipe.isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
            }`}
          />
        </button>
        <Link
          href={`/recipes/${id}/edit`}
          className="p-2 hover:bg-secondary transition-colors rounded"
        >
          <Edit className="h-5 w-5 text-muted-foreground" />
        </Link>
        <Link
          href={`/recipes/${id}/cook`}
          className="p-2 hover:bg-secondary transition-colors rounded"
          title="Cooking mode"
        >
          <ChefHat className="h-5 w-5 text-muted-foreground" />
        </Link>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-2 hover:bg-secondary transition-colors rounded"
        >
          <Trash2 className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Image */}
      {recipe.imageUrl && (
        <div className="max-w-lg mx-auto">
          <TapedPhoto src={recipe.imageUrl} alt={recipe.title} />
        </div>
      )}

      {/* Title & Meta */}
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold hand-underline">
          {recipe.title}
        </h1>
        {recipe.description && (
          <p className="text-muted-foreground mt-4 italic leading-relaxed">
            {recipe.description}
          </p>
        )}

        {/* Stamp badges for metadata */}
        <div className="flex flex-wrap gap-3 mt-4">
          {recipe.mealType && <StampBadge>{recipe.mealType}</StampBadge>}
          {recipe.cuisine && <StampBadge>{recipe.cuisine}</StampBadge>}
          {totalTime > 0 && <StampBadge>{totalTime} min</StampBadge>}
          {recipe.tags.map((tag) => (
            <StampBadge key={tag}>{tag}</StampBadge>
          ))}
        </div>

        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-sm text-primary hover:underline font-hand text-base"
          >
            <ExternalLink className="h-3 w-3" />
            View original
          </a>
        )}
      </div>

      {/* Scale */}
      <div className="paper-card flex items-center gap-3 p-3">
        <span className="font-hand text-lg">
          Servings: {scaledServings}
          {scale !== 1 && (
            <span className="text-sm text-muted-foreground ml-1">(original: {recipe.servings})</span>
          )}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => persistScale(Math.max(0.25, scale - 0.25))}
            className="w-8 h-8 rounded-full border-2 border-border bg-card flex items-center justify-center hover:bg-secondary"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="font-hand text-lg min-w-[3rem] text-center">
            {scale}x
          </span>
          <button
            onClick={() => persistScale(scale + 0.25)}
            className="w-8 h-8 rounded-full border-2 border-border bg-card flex items-center justify-center hover:bg-secondary"
          >
            <Plus className="h-3 w-3" />
          </button>
          {scale !== 1 && (
            <button
              onClick={() => persistScale(1)}
              className="text-sm text-primary hover:underline ml-1 font-hand"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Ingredients */}
      {sortedIngredients.length > 0 && (
        <div className="paper-card lined-paper p-6 relative z-[2] -mb-2">
          <SectionHeader>Ingredients</SectionHeader>
          <div className="flex flex-col">
            {sortedIngredients.map((ing) => {
              const scaledQty = !ing.toTaste && ing.quantity ? Math.round(ing.quantity * scale * 100) / 100 : null;
              return (
                <div key={ing.id} className="flex items-center gap-3 py-2 min-h-[40px]">
                  <span className="hand-check mt-0.5" />
                  <span className="text-sm">
                    {ing.toTaste ? (
                      <span className="italic text-muted-foreground">to taste </span>
                    ) : (
                      <>
                        {scaledQty != null && (
                          <span className="font-semibold">{formatQuantity(scaledQty)} </span>
                        )}
                        {ing.unit && <span>{ing.unit} </span>}
                      </>
                    )}
                    {ing.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Steps */}
      {sortedSteps.length > 0 && (
        <div className="paper-card p-6 space-y-4">
          <SectionHeader>Instructions</SectionHeader>
          <div className="space-y-5">
            {sortedSteps.map((step, i) => (
              <div key={step.id} className="flex gap-4">
                <div className="step-circle">{i + 1}</div>
                <p className="text-sm leading-relaxed pt-1.5">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {recipe.notes && (
        <div className="sticky-note">
          <SectionHeader className="!text-[1.3rem]">Notes</SectionHeader>
          <p className="font-hand text-lg leading-relaxed text-secondary-foreground">
            {recipe.notes}
          </p>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="paper-card p-6 max-w-sm w-full space-y-4">
            <h3 className="font-display font-bold">Delete recipe?</h3>
            <p className="text-sm text-muted-foreground">
              This will permanently delete &quot;{recipe.title}&quot; and remove it from any meal plans.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 border hover:bg-secondary text-sm font-hand text-lg rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-destructive text-destructive-foreground text-sm font-medium rounded"
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
