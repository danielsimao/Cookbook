"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Recipe {
  id: string;
  title: string;
  servings: number;
  ingredients: { id: string; name: string; quantity: number | null; unit: string | null; toTaste: boolean }[];
  steps: { id: string; text: string; sortOrder: number }[];
}

export default function CookingModePage() {
  const { id } = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStep, setCurrentStep] = useState(-1);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => r.json())
      .then(setRecipe);
  }, [id]);

  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    if ("wakeLock" in navigator) {
      navigator.wakeLock.request("screen").then((wl) => {
        wakeLock = wl;
      }).catch(() => {});
    }
    return () => {
      wakeLock?.release();
    };
  }, []);

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

  function toggleIngredient(id: string) {
    const next = new Set(checkedIngredients);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCheckedIngredients(next);
  }

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

      {/* Torn edge + progress */}
      <div className="torn-edge h-px bg-border" />
      <div className="h-1 bg-muted mt-2">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{
            width: `${isDone ? 100 : ((currentStep + 1) / (totalSteps + 1)) * 100}%`,
            backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 6px, rgba(255,255,255,0.3) 6px, rgba(255,255,255,0.3) 10px)",
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-6">
        {isIngredients ? (
          <div className="w-full max-w-lg space-y-4 watercolor-wash p-4 rounded">
            <h2 className="font-display text-xl md:text-2xl font-bold text-center mb-6">
              Gather your ingredients
            </h2>
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
                        {ing.quantity && <span className="font-semibold">{ing.quantity} </span>}
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
