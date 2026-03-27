import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";

// POST — authenticated: copy a shared recipe into the user's cookbook
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const userId = await getUserId();
  const { token } = await params;

  const shared = await prisma.sharedRecipe.findUnique({
    where: { token },
    include: {
      recipe: {
        include: {
          ingredients: { orderBy: { sortOrder: "asc" } },
          steps: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  if (!shared) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const source = shared.recipe;

  const copy = await prisma.recipe.create({
    data: {
      title: source.title,
      description: source.description,
      sourceUrl: `/recipes/share/${token}`,
      imageUrl: source.imageUrl,
      servings: source.servings,
      prepTime: source.prepTime,
      cookTime: source.cookTime,
      cuisine: source.cuisine,
      mealType: source.mealType,
      tags: source.tags,
      notes: source.notes,
      userId,
      ingredients: {
        create: source.ingredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          group: ing.group,
          toTaste: ing.toTaste,
          sortOrder: ing.sortOrder,
        })),
      },
      steps: {
        create: source.steps.map((step) => ({
          text: step.text,
          sortOrder: step.sortOrder,
        })),
      },
    },
  });

  return NextResponse.json({ id: copy.id });
}
