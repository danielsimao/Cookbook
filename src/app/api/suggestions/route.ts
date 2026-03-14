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
      prisma.$queryRaw<{ tag: string }[]>`
        SELECT DISTINCT unnest(tags) as tag FROM "Recipe"
      `,
    ]);

    const dbCuisines = cuisineRows.map((r) => r.cuisine!);

    const dbTags = tagRows.map((r) => r.tag);

    const cuisines = [...new Set([...DEFAULT_CUISINES, ...dbCuisines])].sort(
      (a, b) => a.localeCompare(b)
    );
    const tags = [...new Set([...DEFAULT_TAGS, ...dbTags])].sort(
      (a, b) => a.localeCompare(b)
    );

    return NextResponse.json({ cuisines, tags });
  } catch (error) {
    console.error("Failed to fetch suggestions:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}
