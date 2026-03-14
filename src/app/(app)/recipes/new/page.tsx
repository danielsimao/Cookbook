"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Link as LinkIcon,
  Upload,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/toaster";

interface IngredientInput {
  name: string;
  quantity: string;
  unit: string;
  group: string;
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "dessert"];

export default function NewRecipePageWrapper() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <NewRecipePage />
    </Suspense>
  );
}

function NewRecipePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const [activeTab, setActiveTab] = useState<"manual" | "url" | "photo">(
    mode === "import" ? "url" : "manual"
  );

  // Import states
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);

  // Form states
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
  const [ingredients, setIngredients] = useState<IngredientInput[]>([
    { name: "", quantity: "", unit: "", group: "" },
  ]);
  const [steps, setSteps] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);

  async function handleImportUrl() {
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      const res = await fetch("/api/recipes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl }),
      });
      if (!res.ok) throw new Error("Import failed");
      const recipe = await res.json();
      toast("Recipe imported successfully!", "success");
      router.push(`/recipes/${recipe.id}`);
    } catch {
      toast("Failed to import recipe. Try a different URL.", "error");
    } finally {
      setImporting(false);
    }
  }

  async function handleImportPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/recipes/import-image", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Import failed");
      const recipe = await res.json();
      toast("Recipe extracted from photo!", "success");
      router.push(`/recipes/${recipe.id}`);
    } catch {
      toast("Failed to extract recipe from photo", "error");
    } finally {
      setImporting(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      toast("Recipe title is required", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
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
      if (!res.ok) throw new Error("Save failed");
      const recipe = await res.json();
      toast("Recipe saved!", "success");
      router.push(`/recipes/${recipe.id}`);
    } catch {
      toast("Failed to save recipe", "error");
    } finally {
      setSaving(false);
    }
  }

  function addIngredient() {
    setIngredients([...ingredients, { name: "", quantity: "", unit: "", group: "" }]);
  }

  function removeIngredient(index: number) {
    setIngredients(ingredients.filter((_, i) => i !== index));
  }

  function updateIngredient(index: number, field: keyof IngredientInput, value: string) {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  }

  function addStep() {
    setSteps([...steps, ""]);
  }

  function removeStep(index: number) {
    setSteps(steps.filter((_, i) => i !== index));
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/recipes"
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">Add Recipe</h1>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted">
        <button
          onClick={() => setActiveTab("manual")}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "manual"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          Manual
        </button>
        <button
          onClick={() => setActiveTab("url")}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "url"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          From URL
        </button>
        <button
          onClick={() => setActiveTab("photo")}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "photo"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          From Photo
        </button>
      </div>

      {/* URL Import */}
      {activeTab === "url" && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="text-center">
            <LinkIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <h2 className="font-semibold">Import from URL</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Paste a recipe link from Pinterest, blogs, or any recipe site
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://pinterest.com/pin/..."
              className="flex-1 px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              onKeyDown={(e) => e.key === "Enter" && handleImportUrl()}
            />
            <button
              onClick={handleImportUrl}
              disabled={importing || !importUrl.trim()}
              className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Loader2 className="h-4 w-4" />
              )}
              {importing ? "Importing..." : "Import"}
            </button>
          </div>
          {importing && (
            <p className="text-sm text-muted-foreground text-center">
              AI is extracting the recipe... This may take a few seconds.
            </p>
          )}
        </div>
      )}

      {/* Photo Import */}
      {activeTab === "photo" && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="text-center">
            <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <h2 className="font-semibold">Import from Photo</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Take a photo of a recipe card or page
            </p>
          </div>
          <label className="flex flex-col items-center gap-3 p-8 rounded-lg border-2 border-dashed cursor-pointer hover:border-primary transition-colors">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {importing ? "Extracting recipe..." : "Click to upload or take a photo"}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImportPhoto}
              className="hidden"
              disabled={importing}
            />
          </label>
        </div>
      )}

      {/* Manual Form */}
      {activeTab === "manual" && (
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Basic Info</h2>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Recipe name"
                className="w-full mt-1 px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description..."
                rows={2}
                className="w-full mt-1 px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Image URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full mt-1 px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Servings
                </label>
                <input
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Prep (min)
                </label>
                <input
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Cook (min)
                </label>
                <input
                  type="number"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Meal Type
                </label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select...</option>
                  {MEAL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Cuisine
                </label>
                <input
                  type="text"
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  placeholder="Italian, Mexican..."
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Tags
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="quick, healthy, pasta..."
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Ingredients</h2>
              <button
                onClick={addIngredient}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            </div>

            {ingredients.map((ing, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={ing.quantity}
                  onChange={(e) => updateIngredient(i, "quantity", e.target.value)}
                  placeholder="Qty"
                  className="w-16 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="text"
                  value={ing.unit}
                  onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                  placeholder="Unit"
                  className="w-20 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="text"
                  value={ing.name}
                  onChange={(e) => updateIngredient(i, "name", e.target.value)}
                  placeholder="Ingredient name"
                  className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={() => removeIngredient(i)}
                  className="p-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Steps */}
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Instructions</h2>
              <button
                onClick={addStep}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Plus className="h-3 w-3" />
                Add Step
              </button>
            </div>

            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-2.5 text-sm font-medium text-muted-foreground w-6 text-right shrink-0">
                  {i + 1}.
                </span>
                <textarea
                  value={step}
                  onChange={(e) => {
                    const updated = [...steps];
                    updated[i] = e.target.value;
                    setSteps(updated);
                  }}
                  placeholder="Describe this step..."
                  rows={2}
                  className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <button
                  onClick={() => removeStep(i)}
                  className="mt-2 p-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <h2 className="font-semibold">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Personal notes, modifications, tips..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Save */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : "Save Recipe"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
