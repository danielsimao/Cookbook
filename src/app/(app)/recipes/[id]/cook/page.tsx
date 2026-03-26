"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatQuantity } from "@/lib/format";

interface Recipe {
  id: string;
  title: string;
  servings: number;
  ingredients: { id: string; name: string; quantity: number | null; unit: string | null; toTaste: boolean }[];
  steps: { id: string; text: string; sortOrder: number }[];
}

const COOK_STEP_KEY_PREFIX = "cookbook-cook-step-";
const COOK_CHECKED_KEY_PREFIX = "cookbook-cook-checked-";

export default function CookingModePage() {
  const { id } = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStep, setCurrentStep] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`${COOK_STEP_KEY_PREFIX}${id}`);
      return saved ? parseInt(saved, 10) : -1;
    } catch {
      return -1;
    }
  });
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(() => {
    try {
      const saved = sessionStorage.getItem(`${COOK_CHECKED_KEY_PREFIX}${id}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [wakeLockFailed, setWakeLockFailed] = useState(false);
  const isDoneRef = useRef(false);

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setRecipe)
      .catch(() => {
        router.push(`/recipes/${id}`);
      });
  }, [id, router]);

  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    if ("wakeLock" in navigator) {
      navigator.wakeLock.request("screen").then((wl) => {
        wakeLock = wl;
      }).catch(() => {
        setWakeLockFailed(true);
      });
    }
    return () => {
      wakeLock?.release();
    };
  }, []);

  // Persist step and checked state to sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`${COOK_STEP_KEY_PREFIX}${id}`, String(currentStep));
    }
  }, [currentStep, id]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        `${COOK_CHECKED_KEY_PREFIX}${id}`,
        JSON.stringify(Array.from(checkedIngredients))
      );
    }
  }, [checkedIngredients, id]);

  // Mark recipe as cooked when reaching done screen
  const cookedRef = useRef(false);
  useEffect(() => {
    if (isDoneRef.current && !cookedRef.current) {
      cookedRef.current = true;
      fetch(`/api/recipes/${id}/cook`, { method: "POST" }).catch(() => {});
    }
  });

  // Arrow key navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!recipe) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const totalSteps = recipe.steps.length;
    if (e.key === "ArrowRight") {
      setCurrentStep((prev) => Math.min(totalSteps, prev + 1));
    } else if (e.key === "ArrowLeft") {
      setCurrentStep((prev) => Math.max(-1, prev - 1));
    }
  }, [recipe]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  const sortedSteps = [...recipe.steps].sort((a, b) => a.sortOrder - b.sortOrder);
  const totalSteps = sortedSteps.length;
  const isIngredients = currentStep === -1;
  const isDone = currentStep >= totalSteps;
  isDoneRef.current = isDone;

  function toggleIngredient(ingId: string) {
    const next = new Set(checkedIngredients);
    if (next.has(ingId)) next.delete(ingId);
    else next.add(ingId);
    setCheckedIngredients(next);
  }

  function goToStep(step: number) {
    setCurrentStep(step);
  }

  const checkedCount = checkedIngredients.size;
  const totalIngredients = recipe.ingredients.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <button
          onClick={() => router.push(`/recipes/${id}`)}
          className="p-2 hover:bg-secondary rounded"
        >
          <X className="h-5 w-5" />
        </button>
        <h1 className="font-display font-bold text-sm truncate max-w-[60%]">
          {recipe.title}
        </h1>
        <span className="font-hand text-base text-muted-foreground">
          {isIngredients ? "Ingredients" : isDone ? "Done!" : `Step ${currentStep + 1}/${totalSteps}`}
        </span>
      </div>

      {/* Torn edge + progress with clickable step indicators */}
      <div className="torn-edge h-px bg-border" />
      <div className="flex items-center gap-1 px-4 mt-2">
        {/* Step indicators */}
        {Array.from({ length: totalSteps + 1 }, (_, i) => {
          const stepIdx = i - 1; // -1 = ingredients, 0..n-1 = steps
          const isActive = stepIdx === currentStep;
          const isCompleted = stepIdx < currentStep;
          return (
            <button
              key={i}
              onClick={() => goToStep(stepIdx)}
              className={cn(
                "flex-1 h-1.5 rounded-full transition-all cursor-pointer",
                isActive ? "bg-primary" : isCompleted ? "bg-primary/60" : "bg-muted"
              )}
              aria-label={stepIdx === -1 ? "Ingredients" : `Step ${stepIdx + 1}`}
            />
          );
        })}
      </div>

      {/* Wake lock warning */}
      {wakeLockFailed && (
        <p className="text-xs text-muted-foreground text-center px-4 mt-2">
          Screen may turn off — keep your screen on manually
        </p>
      )}

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-6">
        {isIngredients ? (
          <div className="w-full max-w-lg space-y-4 watercolor-wash p-4 rounded">
            <h2 className="font-display text-xl md:text-2xl font-bold text-center mb-2">
              Gather your ingredients
            </h2>
            <p className="text-sm text-muted-foreground text-center">
              {checkedCount} of {totalIngredients} ingredients ready
            </p>
            <ul className="space-y-3">
              {recipe.ingredients.map((ing) => (
                <li
                  key={ing.id}
                  onClick={() => toggleIngredient(ing.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors",
                    checkedIngredients.has(ing.id)
                      ? "bg-accent/20 border-accent"
                      : "bg-card hover:bg-secondary"
                  )}
                >
                  <div
                    className={cn(
                      "h-6 w-6 flex items-center justify-center shrink-0 transition-colors",
                      checkedIngredients.has(ing.id)
                        ? "bg-accent border-accent-foreground hand-check border-2"
                        : "hand-check"
                    )}
                  >
                    {checkedIngredients.has(ing.id) && (
                      <Check className="h-3.5 w-3.5 text-accent-foreground" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-base md:text-lg",
                      checkedIngredients.has(ing.id) && "line-through text-muted-foreground"
                    )}
                  >
                    {ing.toTaste ? (
                      <span className="italic text-muted-foreground">to taste </span>
                    ) : (
                      <>
                        {ing.quantity != null && <span className="font-semibold">{formatQuantity(ing.quantity)} </span>}
                        {ing.unit && <span>{ing.unit} </span>}
                      </>
                    )}
                    {ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : isDone ? (
          <div className="text-center space-y-4 watercolor-wash p-8 rounded">
            <span className="text-6xl block">🎉</span>
            <h2 className="font-display text-3xl font-bold">All done!</h2>
            <p className="text-muted-foreground font-hand text-xl">Enjoy your meal</p>
            <button
              onClick={() => router.push(`/recipes/${id}`)}
              className="btn-cookbook"
            >
              Back to recipe
            </button>
          </div>
        ) : (
          <div className="w-full max-w-lg text-center space-y-6 watercolor-wash p-6 md:p-8 rounded">
            <div className="step-circle mx-auto" style={{ width: 72, height: 72, fontSize: "2rem", borderWidth: 3 }}>
              {currentStep + 1}
            </div>
            <p className="text-lg md:text-xl leading-relaxed">
              {sortedSteps[currentStep].text}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      {!isDone && (
        <>
          <div className="torn-edge h-px bg-border" />
          <div className="flex items-center justify-between p-4 mt-2">
            <button
              onClick={() => setCurrentStep(Math.max(-1, currentStep - 1))}
              disabled={isIngredients}
              className="flex items-center gap-2 px-4 py-3 border bg-card hover:bg-secondary disabled:opacity-30 font-hand text-base rounded"
            >
              <ArrowLeft className="h-4 w-4" />
              {currentStep === 0 ? "Ingredients" : "Previous"}
            </button>
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="btn-cookbook flex items-center gap-2"
            >
              {currentStep === totalSteps - 1 ? "Finish" : isIngredients ? "Start Cooking" : "Next"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
