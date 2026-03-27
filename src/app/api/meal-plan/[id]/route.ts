import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId();

    // Verify ownership before deleting
    const item = await prisma.mealPlanItem.findFirst({
      where: { id, userId },
    });
    if (!item) {
      return NextResponse.json(
        { error: "Meal plan item not found" },
        { status: 404 }
      );
    }

    await prisma.mealPlanItem.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete meal plan item" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    const { date, mealType } = await request.json();

    // Verify ownership before updating
    const existing = await prisma.mealPlanItem.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Meal plan item not found" },
        { status: 404 }
      );
    }

    const item = await prisma.mealPlanItem.update({
      where: { id },
      data: {
        ...(date && { date: new Date(date) }),
        ...(mealType && { mealType }),
      },
      include: { recipe: true },
    });

    return NextResponse.json(item);
  } catch {
    return NextResponse.json(
      { error: "Failed to update meal plan item" },
      { status: 500 }
    );
  }
}
