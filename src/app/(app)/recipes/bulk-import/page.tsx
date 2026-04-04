"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Check, X, AlertCircle, RotateCw } from "lucide-react";
import { toast } from "@/components/toaster";

interface ExtractedRecipe {
  title: string;
  description: string | null;
  sourceUrl: string;
  imageUrl: string | null;
  servings: number;
  prepTime: number | null;
  cookTime: number | null;
  cuisine: string | null;
  mealType: string | null;
  tags: string[];
  ingredients: Array<{
    name: string;
    quantity: number | null;
    unit: string | null;
    group: string | null;
    toTaste: boolean;
  }>;
  steps: string[];
}

type ItemStatus = "queued" | "processing" | "done" | "failed" | "skipped";

interface BulkItem {
  url: string;
  status: ItemStatus;
  recipe?: ExtractedRecipe;
  error?: string;
  expanded?: boolean;
}

const MAX_URLS = 20;

function isValidUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

export default function BulkImportPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [items, setItems] = useState<BulkItem[]>([]);
  const [phase, setPhase] = useState<"input" | "processing" | "review">("input");
  const [validationError, setValidationError] = useState("");
  const [saving, setSaving] = useState(false);
  const stopRef = useRef(false);

  // Warn on close during processing or saving
  useEffect(() => {
    if (phase !== "processing" && !saving) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase, saving]);

  const processedCount = items.filter(
    (i) => i.status === "done" || i.status === "failed" || i.status === "skipped"
  ).length;
  const readyCount = items.filter((i) => i.status === "done").length;

  async function extractOne(url: string): Promise<
    | { ok: true; recipe: ExtractedRecipe }
    | { ok: false; error: string }
    | { duplicate: true; existingTitle: string }
  > {
    try {
      const res = await fetch("/api/recipes/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        return { duplicate: true, existingTitle: data.existingTitle || "existing recipe" };
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.error || "Failed to extract" };
      }
      const raw = await res.json();
      // Defensive validation — AI responses can be malformed
      const recipe: ExtractedRecipe = {
        ...raw,
        ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
        steps: Array.isArray(raw.steps) ? raw.steps : [],
        tags: Array.isArray(raw.tags) ? raw.tags : [],
        servings: typeof raw.servings === "number" ? raw.servings : 4,
      };
      return { ok: true, recipe };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Network error" };
    }
  }

  async function handleStart() {
    setValidationError("");

    const lines = input
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length > MAX_URLS) {
      setValidationError(`Maximum ${MAX_URLS} URLs allowed. You pasted ${lines.length}.`);
      return;
    }

    const invalid = lines.filter((l) => !isValidUrl(l));
    if (invalid.length > 0) {
      setValidationError(`Invalid URLs detected (must start with http:// or https://): ${invalid.slice(0, 3).join(", ")}`);
      return;
    }

    // Dedupe
    const unique = Array.from(new Set(lines));

    const initial: BulkItem[] = unique.map((url) => ({ url, status: "queued" }));
    setItems(initial);
    setPhase("processing");
    stopRef.current = false;

    // Process sequentially
    for (let i = 0; i < initial.length; i++) {
      if (stopRef.current) break;

      setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, status: "processing" } : item)));

      const result = await extractOne(initial[i].url);

      setItems((prev) =>
        prev.map((item, idx) => {
          if (idx !== i) return item;
          if ("duplicate" in result) {
            return { ...item, status: "skipped", error: `Already imported as "${result.existingTitle}"` };
          }
          return result.ok
            ? { ...item, status: "done", recipe: result.recipe }
            : { ...item, status: "failed", error: result.error };
        })
      );
    }

    setPhase("review");
  }

  function handleStop() {
    stopRef.current = true;
    setItems((prev) =>
      prev.map((item) =>
        item.status === "queued"
          ? { ...item, status: "failed", error: "Cancelled by user" }
          : item
      )
    );
    setPhase("review");
  }

  async function handleRetry(index: number) {
    const url = items[index].url;
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, status: "processing", error: undefined } : item)));
    const result = await extractOne(url);
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        if ("duplicate" in result) {
          return { ...it, status: "skipped", error: `Already imported as "${result.existingTitle}"` };
        }
        return result.ok
          ? { ...it, status: "done", recipe: result.recipe }
          : { ...it, status: "failed", error: result.error };
      })
    );
  }

  function handleSkip(index: number) {
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, status: "skipped" } : item)));
  }

  function handleUnskip(index: number) {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        // Skip is only reachable from "done", so item.recipe is always set
        if (!item.recipe) return item;
        return { ...item, status: "done" };
      })
    );
  }

  function handleToggleExpand(index: number) {
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, expanded: !item.expanded } : item)));
  }

  function updateRecipe(index: number, updates: Partial<ExtractedRecipe>) {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index || !item.recipe) return item;
        return { ...item, recipe: { ...item.recipe, ...updates } };
      })
    );
  }

  async function handleSaveAll() {
    setSaving(true);
    const toSaveIndices = items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.status === "done" && item.recipe);

    let successes = 0;
    const failures: number[] = [];

    for (const { item, idx } of toSaveIndices) {
      const r = item.recipe!;
      try {
        const res = await fetch("/api/recipes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: r.title,
            description: r.description,
            sourceUrl: r.sourceUrl,
            imageUrl: r.imageUrl,
            servings: r.servings,
            prepTime: r.prepTime,
            cookTime: r.cookTime,
            cuisine: r.cuisine,
            mealType: r.mealType,
            tags: r.tags,
            ingredients: r.ingredients,
            steps: r.steps,
          }),
        });
        if (!res.ok) {
          failures.push(idx);
        } else {
          successes++;
        }
      } catch {
        failures.push(idx);
      }
    }

    // Mark failed saves back to a visible state so the user can retry
    if (failures.length > 0) {
      setItems((prev) =>
        prev.map((item, idx) =>
          failures.includes(idx)
            ? { ...item, status: "failed", error: "Failed to save — try again" }
            : item
        )
      );
    }

    setSaving(false);

    if (failures.length === 0) {
      toast(`Saved ${successes} recipe${successes === 1 ? "" : "s"}`, "success");
      router.push("/recipes");
    } else if (successes > 0) {
      toast(`Saved ${successes}, ${failures.length} failed`, "error");
    } else {
      toast("Failed to save recipes", "error");
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/recipes/new" className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-display text-2xl font-bold hand-underline">Bulk Import</h1>
      </div>

      {/* Input phase — textarea + Start button */}
      <div className="paper-card p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">
            Recipe URLs (one per line, max {MAX_URLS})
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={phase === "processing"}
            placeholder="Paste recipe URLs here, one per line..."
            rows={6}
            className="input-cookbook w-full mt-1 font-mono text-sm resize-y disabled:opacity-60"
          />
          {validationError && (
            <p className="text-sm text-destructive mt-1">{validationError}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleStart}
            disabled={!input.trim() || phase === "processing"}
            className="btn-cookbook disabled:opacity-50"
          >
            Start Import
          </button>
          {phase === "processing" && (
            <>
              <span className="font-hand text-base text-muted-foreground">
                {processedCount} of {items.length} processed
              </span>
              <button onClick={handleStop} className="font-hand text-base text-muted-foreground hover:text-destructive underline">
                Stop
              </button>
            </>
          )}
        </div>
      </div>

      {/* Review list */}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, index) => (
            <RecipeRow
              key={index}
              item={item}
              index={index}
              onRetry={() => handleRetry(index)}
              onSkip={() => handleSkip(index)}
              onUnskip={() => handleUnskip(index)}
              onToggle={() => handleToggleExpand(index)}
              onUpdate={(updates) => updateRecipe(index, updates)}
            />
          ))}
        </div>
      )}

      {/* Save all */}
      {phase === "review" && readyCount > 0 && (
        <div className="sticky bottom-4 bg-card border-2 border-primary rounded-lg p-4 shadow-lg">
          <button
            onClick={handleSaveAll}
            disabled={saving || readyCount === 0}
            className="btn-cookbook w-full disabled:opacity-50"
          >
            {saving ? "Saving..." : `Save ${readyCount} Recipe${readyCount === 1 ? "" : "s"}`}
          </button>
        </div>
      )}
    </div>
  );
}

function RecipeRow({
  item,
  index,
  onRetry,
  onSkip,
  onUnskip,
  onToggle,
  onUpdate,
}: {
  item: BulkItem;
  index: number;
  onRetry: () => void;
  onSkip: () => void;
  onUnskip: () => void;
  onToggle: () => void;
  onUpdate: (updates: Partial<ExtractedRecipe>) => void;
}) {
  const statusIcon =
    item.status === "queued" ? null :
    item.status === "processing" ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> :
    item.status === "done" ? <Check className="h-4 w-4 text-accent-foreground" /> :
    item.status === "failed" ? <AlertCircle className="h-4 w-4 text-destructive" /> :
    <X className="h-4 w-4 text-muted-foreground" />;

  if (item.status === "skipped") {
    return (
      <div className="paper-card p-3 flex items-center gap-3 opacity-60">
        <X className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-muted-foreground truncate block">{item.recipe?.title || item.url}</span>
          {item.error && (
            <span className="text-xs text-muted-foreground/70">{item.error}</span>
          )}
        </div>
        {item.recipe && (
          <button onClick={onUnskip} className="font-hand text-sm text-primary hover:underline shrink-0">
            Undo
          </button>
        )}
      </div>
    );
  }

  if (item.status === "failed") {
    return (
      <div className="paper-card p-3 space-y-2 border-l-2 border-l-destructive">
        <div className="flex items-center gap-3">
          {statusIcon}
          <span className="text-sm truncate flex-1">{item.url}</span>
          <span className="font-hand text-xs text-destructive">Failed</span>
        </div>
        <p className="text-xs text-muted-foreground pl-7">{item.error}</p>
        <div className="flex gap-2 pl-7">
          <button onClick={onRetry} className="inline-flex items-center gap-1 font-hand text-sm text-primary hover:underline">
            <RotateCw className="h-3 w-3" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (item.status === "queued" || item.status === "processing") {
    return (
      <div className="paper-card p-3 flex items-center gap-3">
        <div className="w-4 flex justify-center">{statusIcon}</div>
        <span className="text-sm truncate flex-1 text-muted-foreground">{item.url}</span>
        <span className="font-hand text-xs text-muted-foreground capitalize">{item.status}</span>
      </div>
    );
  }

  // done
  const recipe = item.recipe!;
  return (
    <div className="paper-card border-l-2 border-l-primary">
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center gap-3 text-left"
      >
        {recipe.imageUrl ? (
          <img src={recipe.imageUrl} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
        ) : (
          <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0 text-lg">🍽️</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-display font-bold truncate">{recipe.title}</p>
          <p className="font-hand text-xs text-muted-foreground">
            {recipe.ingredients.length} ingredients · {recipe.steps.length} steps
          </p>
        </div>
        <Check className="h-4 w-4 text-accent-foreground shrink-0" />
      </button>
      {item.expanded && (
        <div className="p-3 border-t space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <input
              type="text"
              value={recipe.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="input-cookbook w-full mt-1 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Servings</label>
              <input
                type="number"
                value={recipe.servings}
                onChange={(e) => onUpdate({ servings: parseInt(e.target.value) || 4 })}
                className="input-cookbook w-full mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Cuisine</label>
              <input
                type="text"
                value={recipe.cuisine || ""}
                onChange={(e) => onUpdate({ cuisine: e.target.value })}
                className="input-cookbook w-full mt-1 text-sm"
              />
            </div>
          </div>
        </div>
      )}
      <div className="p-3 border-t flex justify-end">
        <button onClick={onSkip} className="font-hand text-sm text-muted-foreground hover:text-destructive">
          Skip
        </button>
      </div>
    </div>
  );
}
