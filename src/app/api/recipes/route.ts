import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const cuisine = searchParams.get("cuisine");
    const mealType = searchParams.get("mealType");
    const tag = searchParams.get("tag");
    const favorite = searchParams.get("favorite");

    const where: Record<string, unknown> = { userId };

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }
    if (cuisine) {
      where.cuisine = cuisine;
    }
    if (mealType) {
      where.mealType = mealType;
    }
    if (tag) {
      where.tags = { has: tag };
    }
    if (favorite === "true") {
      where.isFavorite = true;
    }

    const recipes = await prisma.recipe.findMany({
      where,
      include: { ingredients: true, steps: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(recipes);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const data = await request.json();

    const recipe = await prisma.recipe.create({
      data: {
        userId,
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

    return NextResponse.json(recipe, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create recipe" },
      { status: 500 }
    );
  }
}
