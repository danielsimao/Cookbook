"use client";

import { Suspense, useEffect, useState } from "react";
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
import { SortableStepList } from "@/components/sortable-step-list";
import { ImageField } from "@/components/image-field";
import { ComboboxField, MultiComboboxField } from "@/components/combobox-field";

import { UNIT_GROUPS } from "@/lib/units";
import { IngredientInput, MEAL_TYPES, emptyIngredient } from "@/lib/recipe-form";

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
  const [duplicate, setDuplicate] = useState<{ id: string; title: string } | null>(null);

  // Form states
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
  const [ingredients, setIngredients] = useState<IngredientInput[]>([
    emptyIngredient(),
  ]);
  const [steps, setSteps] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [cuisineOptions, setCuisineOptions] = useState<string[]>([]);
  const [tagOptions, setTagOptions] = useState<string[]>([]);

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

  async function handleImportUrl(force = false) {
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      const res = await fetch("/api/recipes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl, force }),
      });
      if (res.status === 409) {
        const data = await res.json();
        if (data.existingId && data.existingTitle) {
          setDuplicate({ id: data.existingId, title: data.existingTitle });
        } else {
          toast("This URL may already be imported.", "error");
        }
        return;
      }
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
          tags,
          notes: notes || null,
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
    setIngredients([...ingredients, emptyIngredient()]);
  }

  function removeIngredient(index: number) {
    setIngredients(ingredients.filter((_, i) => i !== index));
  }

  function updateIngredient(index: number, field: keyof IngredientInput, value: string) {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
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
        <h1 className="font-display text-2xl font-bold hand-underline">Add Recipe</h1>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("manual")}
          className={`washi-tape flex-1 text-center transition-opacity ${
            activeTab === "manual"
              ? "washi-tape-pink opacity-100 font-bold"
              : "bg-muted opacity-60"
          }`}
        >
          Manual
        </button>
        <button
          onClick={() => setActiveTab("url")}
          className={`washi-tape flex-1 text-center transition-opacity ${
            activeTab === "url"
              ? "washi-tape-blue opacity-100 font-bold"
              : "bg-muted opacity-60"
          }`}
        >
          From URL
        </button>
        <button
          onClick={() => setActiveTab("photo")}
          className={`washi-tape flex-1 text-center transition-opacity ${
            activeTab === "photo"
              ? "washi-tape-yellow opacity-100 font-bold"
              : "bg-muted opacity-60"
          }`}
        >
          From Photo
        </button>
      </div>

      {/* URL Import */}
      {activeTab === "url" && (
        <div className="paper-card p-6 space-y-4">
          <div className="text-center">
            <LinkIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <h2 className="section-header">Import from URL</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Paste a recipe link from Pinterest, blogs, or any recipe site
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              value={importUrl}
              onChange={(e) => { setImportUrl(e.target.value); setDuplicate(null); }}
              placeholder="https://pinterest.com/pin/..."
              className="input-cookbook flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleImportUrl()}
            />
            <button
              onClick={() => handleImportUrl()}
              disabled={importing || !importUrl.trim()}
              className="btn-cookbook disabled:opacity-50"
            >
              {importing && <Loader2 className="h-4 w-4 animate-spin" />}
              {importing ? "Importing..." : "Import"}
            </button>
          </div>
          {duplicate && (
            <div className="sticky-note space-y-2">
              <p className="font-hand text-base">
                You already imported this URL as <Link href={`/recipes/${duplicate.id}`} className="text-primary font-bold hover:underline">&ldquo;{duplicate.title}&rdquo;</Link>
              </p>
              <div className="flex gap-2">
                <Link href={`/recipes/${duplicate.id}`} className="btn-cookbook !bg-secondary !text-secondary-foreground !text-sm">
                  View Existing
                </Link>
                <button
                  onClick={() => { setDuplicate(null); handleImportUrl(true); }}
                  className="btn-cookbook !text-sm !bg-muted-foreground"
                >
                  Import Again
                </button>
              </div>
            </div>
          )}
          {importing && (
            <p className="text-sm text-muted-foreground text-center font-hand">
              AI is extracting the recipe... This may take a few seconds.
            </p>
          )}
        </div>
      )}

      {/* Photo Import */}
      {activeTab === "photo" && (
        <div className="paper-card p-6 space-y-4">
          <div className="text-center">
            <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <h2 className="section-header">Import from Photo</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Take a photo of a recipe card or page
            </p>
          </div>
          <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-border rounded cursor-pointer hover:border-primary transition-colors">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="font-hand text-muted-foreground">
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
          <div className="paper-card watercolor-wash p-6 space-y-4">
            <h2 className="section-header">Basic Info</h2>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Recipe name"
                className="input-cookbook w-full mt-1"
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
                className="input-cookbook w-full mt-1 resize-none"
              />
            </div>

            <ImageField value={imageUrl} onChange={setImageUrl} />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Servings
                </label>
                <input
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  className="input-cookbook w-full mt-1"
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
                  className="input-cookbook w-full mt-1"
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
                  className="input-cookbook w-full mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Meal Type
                </label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  className="input-cookbook w-full mt-1"
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
                <ComboboxField
                  value={cuisine}
                  onChange={setCuisine}
                  options={cuisineOptions}
                  placeholder="Select cuisine..."
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Tags
                </label>
                <MultiComboboxField
                  values={tags}
                  onChange={setTags}
                  options={tagOptions}
                  placeholder="Add tags..."
                />
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div className="paper-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="section-header">Ingredients</h2>
              <button
                onClick={addIngredient}
                className="font-hand text-base text-primary hover:underline inline-flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>

            {ingredients.map((ing, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2 py-1 border-b border-border/40">
                  <input
                    type="text"
                    value={ing.quantity}
                    onChange={(e) => updateIngredient(i, "quantity", e.target.value)}
                    placeholder="Qty"
                    disabled={ing.toTaste}
                    className="input-cookbook w-14 !border-b-0 text-center disabled:opacity-40"
                  />
                  <select
                    value={ing.unit}
                    onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                    className="input-cookbook w-20 !border-b-0 text-center text-sm text-muted-foreground"
                  >
                    <option value="">Unit</option>
                    {UNIT_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.units.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => updateIngredient(i, "name", e.target.value)}
                    placeholder="Ingredient name"
                    className="input-cookbook flex-1 !border-b-0"
                  />
                  <button
                    onClick={() => removeIngredient(i)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors opacity-40 hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <label className="flex items-center gap-1.5 ml-1">
                  <input
                    type="checkbox"
                    checked={ing.toTaste}
                    onChange={(e) => {
                      const updated = [...ingredients];
                      updated[i] = { ...updated[i], toTaste: e.target.checked, quantity: e.target.checked ? "" : updated[i].quantity };
                      setIngredients(updated);
                    }}
                    className="accent-primary"
                  />
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
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Personal notes, modifications, tips..."
              rows={3}
              className="input-cookbook w-full lined-paper resize-none"
            />
          </div>

          {/* Save */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="flex-1 btn-cookbook disabled:opacity-50 flex items-center justify-center gap-2"
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
