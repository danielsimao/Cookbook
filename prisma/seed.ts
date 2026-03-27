import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@cookbook.local";
  const adminPassword = process.env.ADMIN_PASSWORD || process.env.APP_PASSWORD || "cookbook123";
  const adminName = process.env.ADMIN_NAME || "Admin";

  if (!process.env.ADMIN_PASSWORD && !process.env.APP_PASSWORD) {
    console.warn("WARNING: No ADMIN_PASSWORD or APP_PASSWORD set. Using default password. Change this immediately!");
  }

  console.log(`Seeding admin user: ${adminEmail}`);

  // Create or find admin user
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: "admin",
    },
  });

  console.log(`Admin user: ${admin.id} (${admin.email})`);

  // Backfill existing data with admin userId
  const recipesUpdated = await prisma.recipe.updateMany({
    where: { userId: "" },
    data: { userId: admin.id },
  });
  console.log(`Backfilled ${recipesUpdated.count} recipes`);

  const mealPlanUpdated = await prisma.mealPlanItem.updateMany({
    where: { userId: "" },
    data: { userId: admin.id },
  });
  console.log(`Backfilled ${mealPlanUpdated.count} meal plan items`);

  const pantryUpdated = await prisma.pantryItem.updateMany({
    where: { userId: "" },
    data: { userId: admin.id },
  });
  console.log(`Backfilled ${pantryUpdated.count} pantry items`);

  const cacheUpdated = await prisma.shoppingListCache.updateMany({
    where: { userId: "" },
    data: { userId: admin.id },
  });
  console.log(`Backfilled ${cacheUpdated.count} shopping list caches`);

  const customUpdated = await prisma.customShoppingItem.updateMany({
    where: { userId: "" },
    data: { userId: admin.id },
  });
  console.log(`Backfilled ${customUpdated.count} custom shopping items`);

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
