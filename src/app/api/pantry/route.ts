import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getUserId();
    const items = await prisma.pantryItem.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(items);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch pantry items" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const item = await prisma.pantryItem.upsert({
      where: { userId_name: { userId, name } },
      update: {},
      create: { userId, name },
    });

    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create pantry item" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json(
        { error: "Name query param is required" },
        { status: 400 }
      );
    }

    await prisma.pantryItem.delete({
      where: { userId_name: { userId, name } },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete pantry item" },
      { status: 500 }
    );
  }
}
