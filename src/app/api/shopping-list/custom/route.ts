import { NextRequest, NextResponse } from "next/server";
import { startOfWeek, subWeeks } from "date-fns";
import { prisma } from "@/lib/db";

// GET — fetch custom items for a week
export async function GET(req: NextRequest) {
  const startDate = req.nextUrl.searchParams.get("startDate");
  if (!startDate) {
    return NextResponse.json({ error: "startDate required" }, { status: 400 });
  }

  const weekStart = startOfWeek(new Date(startDate), { weekStartsOn: 1 });

  // Cleanup old weeks (>2 weeks ago)
  const cutoff = subWeeks(new Date(), 2);
  await prisma.customShoppingItem.deleteMany({
    where: { weekStart: { lt: cutoff } },
  }).catch(() => {});

  const items = await prisma.customShoppingItem.findMany({
    where: { weekStart },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(items);
}

// POST — add a custom item
export async function POST(req: NextRequest) {
  const { weekStart: weekStartStr, name } = await req.json();
  if (!weekStartStr || !name?.trim()) {
    return NextResponse.json({ error: "weekStart and name required" }, { status: 400 });
  }

  const weekStart = startOfWeek(new Date(weekStartStr), { weekStartsOn: 1 });
  const trimmedName = name.trim();

  try {
    const item = await prisma.customShoppingItem.create({
      data: { weekStart, name: trimmedName },
    });
    return NextResponse.json(item);
  } catch (err: unknown) {
    // Unique constraint violation — duplicate item
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return NextResponse.json({ error: "Item already exists" }, { status: 409 });
    }
    throw err;
  }
}

// PUT — toggle checked state
export async function PUT(req: NextRequest) {
  const { weekStart: weekStartStr, name, checked } = await req.json();
  if (!weekStartStr || !name) {
    return NextResponse.json({ error: "weekStart and name required" }, { status: 400 });
  }

  const weekStart = startOfWeek(new Date(weekStartStr), { weekStartsOn: 1 });

  const item = await prisma.customShoppingItem.update({
    where: { weekStart_name: { weekStart, name } },
    data: { checked: Boolean(checked) },
  });

  return NextResponse.json(item);
}

// DELETE — remove a custom item
export async function DELETE(req: NextRequest) {
  const weekStartStr = req.nextUrl.searchParams.get("weekStart");
  const name = req.nextUrl.searchParams.get("name");
  if (!weekStartStr || !name) {
    return NextResponse.json({ error: "weekStart and name required" }, { status: 400 });
  }

  const weekStart = startOfWeek(new Date(weekStartStr), { weekStartsOn: 1 });

  await prisma.customShoppingItem.delete({
    where: { weekStart_name: { weekStart, name } },
  });

  return NextResponse.json({ ok: true });
}
