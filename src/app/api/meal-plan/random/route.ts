import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate, mealTypes } = await request.json();

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const recipes = await prisma.recipe.findMany();

    if (recipes.length === 0) {
      return NextResponse.json(
        { error: "No recipes available" },
        { status: 400 }
      );
    }

    const types = mealTypes ?? ["breakfast", "lunch", "dinner"];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const items: { date: Date; mealType: string; recipeId: string }[] = [];

    for (
      let d = new Date(start);
      d <= end;
      d.setDate(d.getDate() + 1)
    ) {
      for (const type of types) {
        const randomRecipe =
          recipes[Math.floor(Math.random() * recipes.length)];
        items.push({
          date: new Date(d),
          mealType: type,
          recipeId: randomRecipe.id,
        });
      }
    }

    const created = await prisma.$transaction(
      items.map((item) =>
        prisma.mealPlanItem.create({
          data: item,
          include: { recipe: true },
        })
      )
    );

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate random meal plan" },
      { status: 500 }
    );
  }
}
