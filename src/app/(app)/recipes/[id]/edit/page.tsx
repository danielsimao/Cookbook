"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/components/toaster";
import { ResponsiveModal } from "@/components/responsive-modal";
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
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [showGroupFor, setShowGroupFor] = useState<Set<number>>(new Set());

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

  // Track original values for dirty checking
  const originalRef = useRef<string>("");
  const [titleError, setTitleError] = useState("");

  function getCurrentFormData() {
    return JSON.stringify({ title, description, imageUrl, servings, prepTime, cookTime, cuisine, mealType, tags, notes, isFavorite, ingredients, steps });
  }

  function isDirty() {
    return originalRef.current !== "" && originalRef.current !== getCurrentFormData();
  }

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
        // Defer setting original so state is settled
        setTimeout(() => {
          originalRef.current = JSON.stringify({
            title: recipe.title,
            description: recipe.description || "",
            imageUrl: recipe.imageUrl || "",
            servings: String(recipe.servings),
            prepTime: recipe.prepTime ? String(recipe.prepTime) : "",
            cookTime: recipe.cookTime ? String(recipe.cookTime) : "",
            cuisine: recipe.cuisine || "",
            mealType: recipe.mealType || "",
            tags: recipe.tags,
            notes: recipe.notes || "",
            isFavorite: recipe.isFavorite,
            ingredients: recipe.ingredients
              .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder)
              .map((i: { name: string; quantity: number | null; unit: string | null; group: string | null; toTaste?: boolean }) => ({
                name: i.name,
                quantity: i.quantity != null ? String(i.quantity) : "",
                unit: i.unit || "",
                group: i.group || "",
                toTaste: i.toTaste ?? false,
              })),
            steps: recipe.steps
              .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder)
              .map((s: { text: string }) => s.text),
          });
        }, 0);
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

  function handleCancelClick(e: React.MouseEvent) {
    if (isDirty()) {
      e.preventDefault();
      setPendingNavigation(`/recipes/${id}`);
      setShowDiscardConfirm(true);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      setTitleError("Title is required");
      toast("Title is required", "error");
      return;
    }
    setTitleError("");
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
            onChange={(e) => { setTitle(e.target.value); if (e.target.value.trim()) setTitleError(""); }}
            className="input-cookbook w-full mt-1"
          />
          {titleError && (
            <p className="text-sm text-destructive mt-1">{titleError}</p>
          )}
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
          <div key={i} className="bg-background border border-border/50 border-l-[3px] border-l-primary rounded-sm p-3 pb-2 mb-2 space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="font-hand text-base font-bold text-primary w-5 shrink-0 text-center">{i + 1}.</span>
              <input type="text" value={ing.name} onChange={(e) => { const u = [...ingredients]; u[i] = { ...u[i], name: e.target.value }; setIngredients(u); }} placeholder="Ingredient name" className="input-cookbook flex-1 font-medium" />
              <button onClick={() => setIngredients(ingredients.filter((_, j) => j !== i))} className="p-1.5 shrink-0 text-muted-foreground hover:text-destructive transition-colors opacity-40 hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-3 pl-[30px] min-h-[36px]">
              {!ing.toTaste && (
                <>
                  <input type="text" value={ing.quantity} onChange={(e) => { const u = [...ingredients]; u[i] = { ...u[i], quantity: e.target.value }; setIngredients(u); }} placeholder="Qty" className="input-cookbook shrink-0 text-center text-sm py-1.5" style={{ width: 52 }} />
                  <select value={ing.unit} onChange={(e) => { const u = [...ingredients]; u[i] = { ...u[i], unit: e.target.value }; setIngredients(u); }} className="input-cookbook shrink-0 text-sm text-muted-foreground py-1.5" style={{ width: 76 }}>
                    <option value="">Unit</option>
                    {UNIT_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.units.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </>
              )}
              <span className="flex-1" />
              <button type="button" onClick={() => { const u = [...ingredients]; u[i] = { ...u[i], toTaste: !ing.toTaste, quantity: !ing.toTaste ? "" : u[i].quantity }; setIngredients(u); }} className={ing.toTaste ? "stamp-badge !text-[0.72rem] !py-0.5 !px-2.5 cursor-pointer hover:opacity-60 transition-opacity" : "font-hand text-xs text-muted-foreground/50 hover:text-[var(--stamp-red)] hover:border-[var(--stamp-red)] border border-border/60 rounded-[1px] px-2 py-0.5 hover:opacity-90 transition-all cursor-pointer uppercase tracking-wide"} style={ing.toTaste ? undefined : { transform: "rotate(-1deg)" }} title={ing.toTaste ? "Click to switch to quantity" : "Mark as 'to taste'"}>
                {ing.toTaste ? "To taste" : "to taste"}
              </button>
            </div>
            {ing.group || showGroupFor.has(i) ? (
              <div className="flex items-center gap-2 pl-[30px] mt-1">
                {ing.group && !showGroupFor.has(i) ? (
                  <button type="button" onClick={() => setShowGroupFor((prev) => { const next = new Set(prev); next.add(i); return next; })} className="washi-tape washi-tape-blue !py-0.5 !px-2.5 !text-[0.7rem] cursor-pointer hover:opacity-80 transition-opacity" style={{ transform: "rotate(-1.5deg)" }}>
                    {ing.group}
                  </button>
                ) : (
                  <input type="text" value={ing.group} onChange={(e) => { const u = [...ingredients]; u[i] = { ...u[i], group: e.target.value }; setIngredients(u); }} onBlur={() => { if (!ing.group) setShowGroupFor((prev) => { const next = new Set(prev); next.delete(i); return next; }); }} placeholder="Group (e.g., For the sauce)" autoFocus={showGroupFor.has(i) && !ing.group} className="input-cookbook text-xs !border-b-0 py-0.5 text-muted-foreground/70 placeholder:text-muted-foreground/30 flex-1" />
                )}
              </div>
            ) : (
              <div className="pl-[30px] mt-0.5">
                <button type="button" onClick={() => setShowGroupFor((prev) => { const next = new Set(prev); next.add(i); return next; })} className="font-hand text-[0.7rem] text-muted-foreground/40 hover:text-primary/60 transition-colors cursor-pointer">
                  + group
                </button>
              </div>
            )}
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
        <Link
          href={`/recipes/${id}`}
          onClick={handleCancelClick}
          className="flex-1 py-3 border-2 border-border text-center hover:bg-secondary font-hand text-lg rounded transition-colors"
        >
          Cancel
        </Link>
        <button onClick={handleSave} disabled={saving || !title.trim()} className="flex-1 btn-cookbook disabled:opacity-50 flex items-center justify-center gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Discard changes confirmation */}
      <ResponsiveModal open={showDiscardConfirm} onClose={() => setShowDiscardConfirm(false)}>
        <h3 className="font-display font-bold">Discard unsaved changes?</h3>
        <p className="text-sm text-muted-foreground">
          You have unsaved changes that will be lost.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setShowDiscardConfirm(false)} className="flex-1 py-2 border hover:bg-secondary font-hand text-base rounded">Keep editing</button>
          <button onClick={() => { setShowDiscardConfirm(false); if (pendingNavigation) router.push(pendingNavigation); }} className="flex-1 py-2 bg-destructive text-destructive-foreground font-hand text-base font-bold rounded">Discard</button>
        </div>
      </ResponsiveModal>
    </div>
  );
}
