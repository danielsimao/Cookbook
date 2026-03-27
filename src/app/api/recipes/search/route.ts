import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { smartSearch } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    const recipes = await prisma.recipe.findMany({
      where: { userId },
      include: { ingredients: true, steps: true },
    });

    type RecipeWithRelations = (typeof recipes)[number];

    const recipeSummaries = recipes.map((r: RecipeWithRelations) => ({
      id: r.id,
      title: r.title,
      tags: r.tags,
      cuisine: r.cuisine,
      mealType: r.mealType,
      ingredientNames: r.ingredients.map((i: RecipeWithRelations["ingredients"][number]) => i.name),
    }));

    const rankedIds = await smartSearch(query, recipeSummaries);

    const rankedRecipes = rankedIds
      .map((id: string) => recipes.find((r: RecipeWithRelations) => r.id === id))
      .filter(Boolean);

    return NextResponse.json(rankedRecipes);
  } catch {
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
