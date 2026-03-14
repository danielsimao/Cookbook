"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/components/toaster";

interface IngredientInput {
  name: string;
  quantity: string;
  unit: string;
  group: string;
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "dessert"];

export default function EditRecipePage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [servings, setServings] = useState("4");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [mealType, setMealType] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [ingredients, setIngredients] = useState<IngredientInput[]>([]);
  const [steps, setSteps] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => r.json())
      .then((recipe) => {
        setTitle(recipe.title);
        setDescription(recipe.description || "");
        setImageUrl(recipe.imageUrl || "");
        setServings(String(recipe.servings));
        setPrepTime(recipe.prepTime ? String(recipe.prepTime) : "");
        setCookTime(recipe.cookTime ? String(recipe.cookTime) : "");
        setCuisine(recipe.cuisine || "");
        setMealType(recipe.mealType || "");
        setTags(recipe.tags.join(", "));
        setNotes(recipe.notes || "");
        setIsFavorite(recipe.isFavorite);
        setIngredients(
          recipe.ingredients
            .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder)
            .map((i: { name: string; quantity: number | null; unit: string | null; group: string | null }) => ({
              name: i.name,
              quantity: i.quantity != null ? String(i.quantity) : "",
              unit: i.unit || "",
              group: i.group || "",
            }))
        );
        setSteps(
          recipe.steps
            .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder)
            .map((s: { text: string }) => s.text)
        );
        setLoading(false);
      })
      .catch(() => {
        toast("Failed to load recipe", "error");
        setLoading(false);
      });
  }, [id]);

  async function handleSave() {
    if (!title.trim()) {
      toast("Title is required", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/recipes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          imageUrl: imageUrl || null,
          servings: parseInt(servings) || 4,
          prepTime: prepTime ? parseInt(prepTime) : null,
          cookTime: cookTime ? parseInt(cookTime) : null,
          cuisine: cuisine || null,
          mealType: mealType || null,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          notes: notes || null,
          isFavorite,
          ingredients: ingredients
            .filter((i) => i.name.trim())
            .map((i) => ({
              name: i.name,
              quantity: i.quantity ? parseFloat(i.quantity) : null,
              unit: i.unit || null,
              group: i.group || null,
            })),
          steps: steps.filter((s) => s.trim()),
        }),
      });
      if (!res.ok) throw new Error();
      toast("Recipe updated!", "success");
      router.push(`/recipes/${id}`);
    } catch {
      toast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="h-96 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/recipes/${id}`}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">Edit Recipe</h1>
      </div>

      {/* Basic Info */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Basic Info</h2>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mt-1 px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full mt-1 px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Image URL</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full mt-1 px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Servings</label>
            <input type="number" value={servings} onChange={(e) => setServings(e.target.value)} className="w-full mt-1 px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Prep (min)</label>
            <input type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} className="w-full mt-1 px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Cook (min)</label>
            <input type="number" value={cookTime} onChange={(e) => setCookTime(e.target.value)} className="w-full mt-1 px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Meal Type</label>
            <select value={mealType} onChange={(e) => setMealType(e.target.value)} className="w-full mt-1 px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select...</option>
              {MEAL_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Cuisine</label>
            <input type="text" value={cuisine} onChange={(e) => setCuisine(e.target.value)} className="w-full mt-1 px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Tags (comma separated)</label>
            <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} className="w-full mt-1 px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isFavorite} onChange={(e) => setIsFavorite(e.target.checked)} className="rounded" />
          <span className="text-sm font-medium">Favorite</span>
        </label>
      </div>

      {/* Ingredients */}
      <div className="rounded-xl border bg-card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Ingredients</h2>
          <button onClick={() => setIngredients([...ingredients, { name: "", quantity: "", unit: "", group: "" }])} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        {ingredients.map((ing, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="text" value={ing.quantity} onChange={(e) => { const u = [...ingredients]; u[i] = { ...u[i], quantity: e.target.value }; setIngredients(u); }} placeholder="Qty" className="w-16 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input type="text" value={ing.unit} onChange={(e) => { const u = [...ingredients]; u[i] = { ...u[i], unit: e.target.value }; setIngredients(u); }} placeholder="Unit" className="w-20 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input type="text" value={ing.name} onChange={(e) => { const u = [...ingredients]; u[i] = { ...u[i], name: e.target.value }; setIngredients(u); }} placeholder="Ingredient" className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <button onClick={() => setIngredients(ingredients.filter((_, j) => j !== i))} className="p-2 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Steps */}
      <div className="rounded-xl border bg-card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Instructions</h2>
          <button onClick={() => setSteps([...steps, ""])} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <Plus className="h-3 w-3" /> Add Step
          </button>
        </div>
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-2.5 text-sm font-medium text-muted-foreground w-6 text-right shrink-0">{i + 1}.</span>
            <textarea value={step} onChange={(e) => { const u = [...steps]; u[i] = e.target.value; setSteps(u); }} rows={2} className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            <button onClick={() => setSteps(steps.filter((_, j) => j !== i))} className="mt-2 p-2 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="rounded-xl border bg-card p-6 space-y-3">
        <h2 className="font-semibold">Notes</h2>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
      </div>

      <div className="flex gap-3">
        <Link href={`/recipes/${id}`} className="flex-1 py-3 rounded-lg border text-center hover:bg-secondary text-sm font-medium">
          Cancel
        </Link>
        <button onClick={handleSave} disabled={saving || !title.trim()} className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
