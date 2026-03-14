import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mergeIngredients } from "@/lib/ai";

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

    const mealPlanItems = await prisma.mealPlanItem.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        recipe: {
          include: { ingredients: true },
        },
      },
    });

    type MealPlanWithRecipe = (typeof mealPlanItems)[number];
    type IngredientRecord = MealPlanWithRecipe["recipe"]["ingredients"][number];

    const allIngredients = mealPlanItems.flatMap((item: MealPlanWithRecipe) =>
      item.recipe.ingredients.map((ing: IngredientRecord) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
      }))
    );

    const pantryItems = await prisma.pantryItem.findMany();
    type PantryRecord = (typeof pantryItems)[number];
    const pantryNames = pantryItems.map((p: PantryRecord) => p.name.toLowerCase());

    let merged = await mergeIngredients(allIngredients);

    merged = merged.map((ing) => ({
      ...ing,
      checked: pantryNames.some(
        (p: string) => ing.name.toLowerCase().includes(p) || p.includes(ing.name.toLowerCase())
      ),
    }));

    return NextResponse.json({
      ingredients: merged,
      pantryItems: pantryItems.map((p: PantryRecord) => p.name),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate shopping list" },
      { status: 500 }
    );
  }
}
