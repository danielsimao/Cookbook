import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";

// POST — create a share link for a recipe
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  const { id } = await params;

  const recipe = await prisma.recipe.findUnique({ where: { id } });
  if (!recipe || recipe.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Reuse existing share link if one exists
  const existing = await prisma.sharedRecipe.findFirst({
    where: { recipeId: id, createdBy: userId },
  });

  if (existing) {
    return NextResponse.json({ token: existing.token });
  }

  const shared = await prisma.sharedRecipe.create({
    data: { recipeId: id, createdBy: userId },
  });

  return NextResponse.json({ token: shared.token });
}
