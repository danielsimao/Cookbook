import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scrapeUrl } from "@/lib/scraper";
import { extractRecipeFromHtml } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    const { html, imageUrl: scrapedImageUrl } = await scrapeUrl(url);
    const parsed = await extractRecipeFromHtml(html, url);

    const recipe = await prisma.recipe.create({
      data: {
        title: parsed.title,
        description: parsed.description ?? null,
        sourceUrl: url,
        imageUrl: parsed.imageUrl ?? scrapedImageUrl ?? null,
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
    const message = error instanceof Error ? error.message : "Failed to import recipe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
