"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Recipe {
  id: string;
  title: string;
  servings: number;
  ingredients: { id: string; name: string; quantity: number | null; unit: string | null }[];
  steps: { id: string; text: string; sortOrder: number }[];
}

export default function CookingModePage() {
  const { id } = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStep, setCurrentStep] = useState(-1); // -1 = ingredients view
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => r.json())
      .then(setRecipe);
  }, [id]);

  useEffect(() => {
    // Keep screen awake during cooking
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
      <div className="flex items-center justify-between p-4 border-b">
        <button
          onClick={() => router.push(`/recipes/${id}`)}
          className="p-2 rounded-lg hover:bg-secondary"
        >
          <X className="h-5 w-5" />
        </button>
        <h1 className="font-semibold text-sm truncate max-w-[60%]">
          {recipe.title}
        </h1>
        <span className="text-xs text-muted-foreground">
          {isIngredients ? "Ingredients" : isDone ? "Done!" : `Step ${currentStep + 1}/${totalSteps}`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{
            width: `${isDone ? 100 : ((currentStep + 1) / (totalSteps + 1)) * 100}%`,
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        {isIngredients ? (
          <div className="w-full max-w-lg space-y-4">
            <h2 className="text-2xl font-bold text-center mb-6">
              Gather your ingredients
            </h2>
            <ul className="space-y-3">
              {recipe.ingredients.map((ing) => (
                <li
                  key={ing.id}
                  onClick={() => toggleIngredient(ing.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    checkedIngredients.has(ing.id)
                      ? "bg-primary/10 border-primary/30"
                      : "hover:bg-secondary"
                  )}
                >
                  <div
                    className={cn(
                      "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                      checkedIngredients.has(ing.id)
                        ? "bg-primary border-primary"
                        : "border-muted-foreground"
                    )}
                  >
                    {checkedIngredients.has(ing.id) && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-lg",
                      checkedIngredients.has(ing.id) && "line-through text-muted-foreground"
                    )}
                  >
                    {ing.quantity && <span className="font-medium">{ing.quantity} </span>}
                    {ing.unit && <span>{ing.unit} </span>}
                    {ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : isDone ? (
          <div className="text-center space-y-4">
            <span className="text-6xl block">🎉</span>
            <h2 className="text-3xl font-bold">All done!</h2>
            <p className="text-muted-foreground text-lg">Enjoy your meal</p>
            <button
              onClick={() => router.push(`/recipes/${id}`)}
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium"
            >
              Back to recipe
            </button>
          </div>
        ) : (
          <div className="w-full max-w-lg text-center space-y-6">
            <span className="text-6xl font-bold text-primary">
              {currentStep + 1}
            </span>
            <p className="text-xl md:text-2xl leading-relaxed">
              {sortedSteps[currentStep].text}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      {!isDone && (
        <div className="flex items-center justify-between p-4 border-t">
          <button
            onClick={() => setCurrentStep(Math.max(-1, currentStep - 1))}
            disabled={isIngredients}
            className="flex items-center gap-2 px-4 py-3 rounded-lg border hover:bg-secondary disabled:opacity-30 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            {currentStep === 0 ? "Ingredients" : "Previous"}
          </button>
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            {currentStep === totalSteps - 1 ? "Finish" : isIngredients ? "Start Cooking" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
