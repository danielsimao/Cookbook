import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { extractRecipeFromImage } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Image file is required" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const userId = await getUserId();
    const parsed = await extractRecipeFromImage(base64, mimeType);

    const recipe = await prisma.recipe.create({
      data: {
        userId,
        title: parsed.title,
        description: parsed.description ?? null,
        sourceUrl: null,
        imageUrl: parsed.imageUrl ?? null,
        servings: parsed.servings ?? 4,
        prepTime: parsed.prepTime ?? null,
        cookTime: parsed.cookTime ?? null,
        cuisine: parsed.cuisine ?? null,
        mealType: parsed.mealType ?? null,
        tags: parsed.tags ?? [],
        ingredients: {
          create: (parsed.ingredients ?? []).map((ing, index) => ({
            name: ing.name,
            quantity: ing.quantity ?? null,
            unit: ing.unit ?? null,
            group: ing.group ?? null,
            sortOrder: index,
          })),
        },
        steps: {
          create: (parsed.steps ?? []).map((text, index) => ({
            text,
            sortOrder: index,
          })),
        },
      },
      include: { ingredients: true, steps: true },
    });

    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import recipe from image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
