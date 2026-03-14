import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
    const { date, mealType } = await request.json();

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
