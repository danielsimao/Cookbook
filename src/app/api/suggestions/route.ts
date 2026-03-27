import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { DEFAULT_CUISINES, DEFAULT_TAGS } from "@/lib/suggestions";

export async function GET() {
  try {
    const userId = await getUserId();
    const [cuisineRows, tagRows, ingredientRows] = await Promise.all([
      prisma.recipe.findMany({
        where: { userId, cuisine: { not: null } },
        select: { cuisine: true },
        distinct: ["cuisine"],
      }),
      prisma.$queryRaw<{ tag: string }[]>`
        SELECT DISTINCT unnest(tags) as tag FROM "Recipe" WHERE "userId" = ${userId}
      `,
      prisma.$queryRaw<{ name: string }[]>`
        SELECT DISTINCT "Ingredient".name FROM "Ingredient"
        JOIN "Recipe" ON "Ingredient"."recipeId" = "Recipe".id
        WHERE "Recipe"."userId" = ${userId}
        ORDER BY "Ingredient".name
      `,
    ]);

    const dbCuisines = cuisineRows.map((r) => r.cuisine!);

    const dbTags = tagRows.map((r) => r.tag);

    // Deduplicate ingredient names case-insensitively, keeping first-seen casing
    const seenIngredients = new Map<string, string>();
    for (const row of ingredientRows) {
      const key = row.name.toLowerCase();
      if (!seenIngredients.has(key)) {
        seenIngredients.set(key, row.name);
      }
    }
    const ingredients = [...seenIngredients.values()].sort((a, b) =>
      a.localeCompare(b)
    );

    const cuisines = [...new Set([...DEFAULT_CUISINES, ...dbCuisines])].sort(
      (a, b) => a.localeCompare(b)
    );
    const tags = [...new Set([...DEFAULT_TAGS, ...dbTags])].sort(
      (a, b) => a.localeCompare(b)
    );

    return NextResponse.json({ cuisines, tags, ingredients });
  } catch (error) {
    console.error("Failed to fetch suggestions:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}
