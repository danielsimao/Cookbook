import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { scrapeUrl } from "@/lib/scraper";
import { extractRecipeFromHtml } from "@/lib/ai";

// POST — scrape + AI extract a recipe from a URL, WITHOUT saving to DB
// Used by the bulk import flow where the user reviews before saving.
export async function POST(request: NextRequest) {
  try {
    await getUserId();
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const { html, imageUrl: scrapedImageUrl } = await scrapeUrl(url);
    const parsed = await extractRecipeFromHtml(html, url);

    return NextResponse.json({
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
      ingredients: parsed.ingredients ?? [],
      steps: parsed.steps ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to extract recipe";
    console.error("[api/recipes/extract] Extract failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
