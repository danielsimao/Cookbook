"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Clock, ExternalLink, BookOpen } from "lucide-react";
import { formatQuantity } from "@/lib/format";
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
  notes: string | null;
  ingredients: { id: string; name: string; quantity: number | null; unit: string | null; group: string | null; toTaste: boolean; sortOrder: number }[];
  steps: { id: string; text: string; sortOrder: number }[];
}

export default function SharedRecipePage() {
  const { token } = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/recipes/share/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setRecipe)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/recipes/share/${token}/save`, { method: "POST" });
      if (res.status === 401) {
        toast("Sign in to save this recipe", "error");
        return;
      }
      if (!res.ok) throw new Error();
      const { id } = await res.json();
      toast("Recipe saved to your cookbook!", "success");
      router.push(`/recipes/${id}`);
    } catch {
      toast("Failed to save recipe", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 max-w-3xl mx-auto">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
        <div className="h-64 bg-muted animate-pulse rounded mb-4" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="font-hand text-xl text-muted-foreground">Recipe not found</p>
          <p className="text-sm text-muted-foreground">This share link may have expired or been removed.</p>
        </div>
      </div>
    );
  }

  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header bar */}
      <header className="sticky top-0 z-30 bg-card border-b px-4 py-3 flex items-center justify-between">
        <span className="font-display text-lg font-bold text-primary">Cookbook</span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-cookbook !py-2 !px-4 !text-sm inline-flex items-center gap-2"
        >
          <BookOpen className="h-4 w-4" />
          {saving ? "Saving..." : "Save to my cookbook"}
        </button>
      </header>

      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        {/* Image */}
        {recipe.imageUrl && (
          <div className="max-w-lg mx-auto">
            <div className="photo-taped">
              <img src={recipe.imageUrl} alt={recipe.title} className="w-full" />
            </div>
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
          <div className="flex flex-wrap gap-3 mt-4">
            {recipe.mealType && <span className="stamp-badge">{recipe.mealType}</span>}
            {recipe.cuisine && <span className="stamp-badge">{recipe.cuisine}</span>}
            {totalTime > 0 && <span className="stamp-badge">{totalTime} min</span>}
            {recipe.tags.map((tag) => (
              <span key={tag} className="stamp-badge">{tag}</span>
            ))}
          </div>
        </div>

        {/* Servings */}
        <div className="paper-card p-3">
          <span className="font-hand text-lg">Servings: {recipe.servings}</span>
        </div>

        {/* Ingredients */}
        {recipe.ingredients.length > 0 && (
          <div className="paper-card lined-paper p-6">
            <h2 className="section-header">Ingredients</h2>
            <div className="flex flex-col">
              {recipe.ingredients.map((ing) => (
                <div key={ing.id} className="flex items-center gap-3 py-2 min-h-[40px]">
                  <span className="hand-check mt-0.5" />
                  <span className="text-sm">
                    {ing.toTaste ? (
                      <span className="italic text-muted-foreground">to taste </span>
                    ) : (
                      <>
                        {ing.quantity != null && (
                          <span className="font-semibold">{formatQuantity(ing.quantity)} </span>
                        )}
                        {ing.unit && <span>{ing.unit} </span>}
                      </>
                    )}
                    {ing.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Steps */}
        {recipe.steps.length > 0 && (
          <div className="paper-card p-6 space-y-4">
            <h2 className="section-header">Instructions</h2>
            <div className="space-y-5">
              {recipe.steps.map((step, i) => (
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
            <h2 className="section-header !text-[1.3rem]">Notes</h2>
            <p className="font-hand text-lg leading-relaxed text-secondary-foreground">
              {recipe.notes}
            </p>
          </div>
        )}

        {/* Save CTA at bottom */}
        <div className="text-center py-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-cookbook inline-flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            {saving ? "Saving..." : "Save to my cookbook"}
          </button>
          <p className="font-hand text-sm text-muted-foreground mt-2">
            Shared from Cookbook
          </p>
        </div>
      </div>
    </div>
  );
}
