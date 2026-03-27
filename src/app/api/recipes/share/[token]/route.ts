import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET — public: fetch a shared recipe by token
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
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

  return NextResponse.json(shared.recipe);
}
