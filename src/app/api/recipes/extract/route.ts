import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { scrapeUrl } from "@/lib/scraper";
import { extractRecipeFromHtml } from "@/lib/ai";

// POST — scrape + AI extract a recipe from a URL, WITHOUT saving to DB
// Used by the bulk import flow where the user reviews before saving.
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Check for existing recipe with this URL (already imported)
    const existing = await prisma.recipe.findFirst({
      where: { sourceUrl: url, userId },
      select: { id: true, title: true },
    });
    if (existing) {
      return NextResponse.json(
        { duplicate: true, existingId: existing.id, existingTitle: existing.title },
        { status: 409 }
      );
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
    console.error("[api/recipes/extract] Extract failed:", error);
    const raw = error instanceof Error ? error.message : String(error);

    // Map internal errors to user-friendly messages
    let userMessage = "Could not extract recipe from this URL. The page may not contain a recipe, or the site may block automated access.";
    let status = 500;

    const lower = raw.toLowerCase();
    if (lower.includes("enotfound") || lower.includes("econnrefused") || lower.includes("failed to fetch")) {
      userMessage = "Could not reach this URL. Check that it is publicly accessible.";
      status = 502;
    } else if (lower.includes("rate limit")) {
      userMessage = "Too many imports right now. Please wait a minute and try again.";
      status = 429;
    } else if (lower.includes("api key") || lower.includes("unauthorized")) {
      userMessage = "Recipe extraction is temporarily unavailable.";
      status = 503;
    }

    return NextResponse.json({ error: userMessage }, { status });
  }
}
