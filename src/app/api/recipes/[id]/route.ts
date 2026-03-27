import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;

    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: { ingredients: true, steps: true },
    });

    if (!recipe || recipe.userId !== userId) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(recipe);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch recipe" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const data = await request.json();

    // Verify ownership
    const existing = await prisma.recipe.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    // Delete old ingredients and steps
    await prisma.ingredient.deleteMany({ where: { recipeId: id } });
    await prisma.step.deleteMany({ where: { recipeId: id } });

    const recipe = await prisma.recipe.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description ?? null,
        sourceUrl: data.sourceUrl ?? null,
        imageUrl: data.imageUrl ?? null,
        servings: data.servings ?? 4,
        prepTime: data.prepTime ?? null,
        cookTime: data.cookTime ?? null,
        cuisine: data.cuisine ?? null,
        mealType: data.mealType ?? null,
        tags: data.tags ?? [],
        notes: data.notes ?? null,
        isFavorite: data.isFavorite ?? false,
        ingredients: {
          create: (data.ingredients ?? []).map(
            (
              ing: { name: string; quantity?: number; unit?: string; group?: string; toTaste?: boolean },
              index: number
            ) => ({
              name: ing.name,
              quantity: ing.quantity ?? null,
              unit: ing.unit ?? null,
              group: ing.group ?? null,
              toTaste: ing.toTaste ?? false,
              sortOrder: index,
            })
          ),
        },
        steps: {
          create: (data.steps ?? []).map((text: string, index: number) => ({
            text,
            sortOrder: index,
          })),
        },
      },
      include: { ingredients: true, steps: true },
    });

    return NextResponse.json(recipe);
  } catch {
    return NextResponse.json(
      { error: "Failed to update recipe" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;

    // Verify ownership
    const existing = await prisma.recipe.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    await prisma.recipe.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete recipe" },
      { status: 500 }
    );
  }
}
