import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export async function DELETE(request: NextRequest) {
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

    const userId = await getUserId();

    const result = await prisma.mealPlanItem.deleteMany({
      where: {
        userId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    return NextResponse.json({ deleted: result.count });
  } catch {
    return NextResponse.json(
      { error: "Failed to clear meal plan" },
      { status: 500 }
    );
  }
}
