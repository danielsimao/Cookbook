import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_CUISINES, DEFAULT_TAGS } from "@/lib/suggestions";

export async function GET() {
  try {
    const [cuisineRows, tagRows] = await Promise.all([
      prisma.recipe.findMany({
        where: { cuisine: { not: null } },
        select: { cuisine: true },
        distinct: ["cuisine"],
      }),
      prisma.recipe.findMany({
        select: { tags: true },
      }),
    ]);

    const dbCuisines = cuisineRows
      .map((r) => r.cuisine!)
      .filter(Boolean);

    const dbTags = tagRows.flatMap((r) => r.tags);

    const cuisines = [...new Set([...DEFAULT_CUISINES, ...dbCuisines])].sort(
      (a, b) => a.localeCompare(b)
    );
    const tags = [...new Set([...DEFAULT_TAGS, ...dbTags])].sort(
      (a, b) => a.localeCompare(b)
    );

    return NextResponse.json({ cuisines, tags });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}
