import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const items = await prisma.mealPlanItem.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        recipe: {
          include: { ingredients: true },
        },
      },
      orderBy: [{ date: "asc" }, { mealType: "asc" }],
    });

    return NextResponse.json(items);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch meal plan" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { date, mealType, recipeId } = await request.json();

    if (!date || !mealType || !recipeId) {
      return NextResponse.json(
        { error: "date, mealType, and recipeId are required" },
        { status: 400 }
      );
    }

    const item = await prisma.mealPlanItem.create({
      data: {
        date: new Date(date),
        mealType,
        recipeId,
      },
      include: {
        recipe: true,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create meal plan item" },
      { status: 500 }
    );
  }
}
