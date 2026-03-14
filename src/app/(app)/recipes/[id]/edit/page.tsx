"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/components/toaster";
import { SortableStepList } from "@/components/sortable-step-list";
import { ImageField } from "@/components/image-field";
import { ComboboxField, MultiComboboxField } from "@/components/combobox-field";

import { UNIT_GROUPS } from "@/lib/units";
import { IngredientInput, MEAL_TYPES, emptyIngredient } from "@/lib/recipe-form";

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
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [ingredients, setIngredients] = useState<IngredientInput[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [cuisineOptions, setCuisineOptions] = useState<string[]>([]);
  const [tagOptions, setTagOptions] = useState<string[]>([]);

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
        setTags(recipe.tags);
        setNotes(recipe.notes || "");
        setIsFavorite(recipe.isFavorite);
        setIngredients(
          recipe.ingredients
            .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder)
            .map((i: { name: string; quantity: number | null; unit: string | null; group: string | null; toTaste?: boolean }) => ({
              name: i.name,
              quantity: i.quantity != null ? String(i.quantity) : "",
              unit: i.unit || "",
              group: i.group || "",
              toTaste: i.toTaste ?? false,
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

  useEffect(() => {
    fetch("/api/suggestions")
      .then((r) => {
        if (!r.ok) throw new Error(`Suggestions API returned ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setCuisineOptions(data.cuisines ?? []);
        setTagOptions(data.tags ?? []);
      })
      .catch((err) => console.error("Failed to load suggestions:", err));
  }, []);

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
          tags,
          notes: notes || null,
          isFavorite,
          ingredients: ingredients
            .filter((i) => i.name.trim())
            .map((i) => ({
              name: i.name,
              quantity: i.toTaste ? null : (i.quantity ? parseFloat(i.quantity) : null),
              unit: i.unit || null,
              group: i.group || null,
              toTaste: i.toTaste,
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
        <h1 className="font-display text-2xl font-bold hand-underline">Edit Recipe</h1>
      </div>

      {/* Basic Info */}
      <div className="paper-card watercolor-wash p-6 space-y-4">
        <h2 className="section-header">Basic Info</h2>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-cookbook w-full mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="input-cookbook w-full mt-1 resize-none"
          />
        </div>
        <ImageField value={imageUrl} onChange={setImageUrl} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Servings</label>
            <input type="number" value={servings} onChange={(e) => setServings(e.target.value)} className="input-cookbook w-full mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Prep (min)</label>
            <input type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} className="input-cookbook w-full mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Cook (min)</label>
            <input type="number" value={cookTime} onChange={(e) => setCookTime(e.target.value)} className="input-cookbook w-full mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Meal Type</label>
            <select value={mealType} onChange={(e) => setMealType(e.target.value)} className="input-cookbook w-full mt-1">
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
            <ComboboxField
              value={cuisine}
              onChange={setCuisine}
              options={cuisineOptions}
              placeholder="Select cuisine..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Tags</label>
            <MultiComboboxField
              values={tags}
              onChange={setTags}
              options={tagOptions}
              placeholder="Add tags..."
            />
          </div>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isFavorite} onChange={(e) => setIsFavorite(e.target.checked)} className="accent-primary" />
          <span className="text-sm font-hand font-medium">Favorite</span>
        </label>
      </div>

      {/* Ingredients */}
      <div className="paper-card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-header">Ingredients</h2>
          <button onClick={() => setIngredients([...ingredients, emptyIngredient()])} className="font-hand text-base text-primary hover:underline inline-flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        {ingredients.map((ing, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2 py-1 border-b border-border/40">
              <input type="text" value={ing.quantity} onChange={(e) => { const u = [...ingredients]; u[i] = { ...u[i], quantity: e.target.value }; setIngredients(u); }} placeholder="Qty" disabled={ing.toTaste} className="input-cookbook w-14 !border-b-0 text-center disabled:opacity-40" />
              <select value={ing.unit} onChange={(e) => { const u = [...ingredients]; u[i] = { ...u[i], unit: e.target.value }; setIngredients(u); }} className="input-cookbook w-20 !border-b-0 text-center text-sm text-muted-foreground">
                <option value="">Unit</option>
                {UNIT_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.units.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <input type="text" value={ing.name} onChange={(e) => { const u = [...ingredients]; u[i] = { ...u[i], name: e.target.value }; setIngredients(u); }} placeholder="Ingredient" className="input-cookbook flex-1 !border-b-0" />
              <button onClick={() => setIngredients(ingredients.filter((_, j) => j !== i))} className="p-2 text-muted-foreground hover:text-destructive transition-colors opacity-40 hover:opacity-100">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <label className="flex items-center gap-1.5 ml-1">
              <input type="checkbox" checked={ing.toTaste} onChange={(e) => { const u = [...ingredients]; u[i] = { ...u[i], toTaste: e.target.checked, quantity: e.target.checked ? "" : u[i].quantity }; setIngredients(u); }} className="accent-primary" />
              <span className="text-xs font-hand text-muted-foreground">To taste</span>
            </label>
          </div>
        ))}
      </div>

      {/* Steps */}
      <SortableStepList steps={steps} onChange={setSteps} />

      {/* Notes */}
      <div className="sticky-note">
        <h2 className="section-header">Notes</h2>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input-cookbook w-full lined-paper resize-none" />
      </div>

      <div className="flex gap-3">
        <Link href={`/recipes/${id}`} className="flex-1 py-3 border-2 border-border text-center hover:bg-secondary font-hand text-lg rounded transition-colors">
          Cancel
        </Link>
        <button onClick={handleSave} disabled={saving || !title.trim()} className="flex-1 btn-cookbook disabled:opacity-50 flex items-center justify-center gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
