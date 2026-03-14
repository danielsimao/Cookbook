import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mergeIngredients } from "@/lib/ai";
import { startOfWeek } from "date-fns";
import { createHash } from "crypto";

function computeHash(ids: string[]): string {
  return createHash("md5").update(ids.sort().join(",")).digest("hex");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const weekStart = startOfWeek(start, { weekStartsOn: 1 });

    // Fetch meal plan items for this date range
    const mealPlanItems = await prisma.mealPlanItem.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      include: {
        recipe: {
          include: { ingredients: true },
        },
      },
    });

    // Empty week — no cache needed
    if (mealPlanItems.length === 0) {
      return NextResponse.json({ ingredients: [], pantryItems: [], cached: false });
    }

    // Compute hash of current meal plan state
    const mealPlanHash = computeHash(mealPlanItems.map((item) => item.id));

    // Check cache
    const cached = await prisma.shoppingListCache.findUnique({
      where: { weekStart },
    });

    let merged: { name: string; quantity: string; category: string }[];

    if (cached && cached.mealPlanHash === mealPlanHash) {
      // Cache hit — skip AI
      merged = cached.items as typeof merged;
    } else {
      // Cache miss — run AI merge
      type MealPlanWithRecipe = (typeof mealPlanItems)[number];
      type IngredientRecord = MealPlanWithRecipe["recipe"]["ingredients"][number];

      const allIngredients = mealPlanItems.flatMap((item: MealPlanWithRecipe) =>
        item.recipe.ingredients.map((ing: IngredientRecord) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          toTaste: ing.toTaste,
        }))
      );

      merged = await mergeIngredients(allIngredients);

      // Upsert cache
      await prisma.shoppingListCache.upsert({
        where: { weekStart },
        update: { mealPlanHash, items: JSON.parse(JSON.stringify(merged)) },
        create: { weekStart, mealPlanHash, items: JSON.parse(JSON.stringify(merged)) },
      });
    }

    // Pantry check — always fresh
    const pantryItems = await prisma.pantryItem.findMany();
    type PantryRecord = (typeof pantryItems)[number];
    const pantryNames = pantryItems.map((p: PantryRecord) => p.name.toLowerCase());

    const ingredients = merged.map((ing) => ({
      ...ing,
      checked: pantryNames.some(
        (p: string) => ing.name.toLowerCase().includes(p) || p.includes(ing.name.toLowerCase())
      ),
    }));

    return NextResponse.json({
      ingredients,
      pantryItems: pantryItems.map((p: PantryRecord) => p.name),
      cached: !!(cached && cached.mealPlanHash === mealPlanHash),
    });
  } catch (error) {
    console.error("Failed to generate shopping list:", error);
    return NextResponse.json(
      { error: "Failed to generate shopping list" },
      { status: 500 }
    );
  }
}
