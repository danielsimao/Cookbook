import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Manual migration to add multi-user support.
 * 1. Create User table
 * 2. Create admin user
 * 3. Add nullable userId columns to existing tables
 * 4. Backfill all rows with admin userId
 * 5. Make userId non-nullable
 * 6. Add foreign keys and indexes
 */

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@cookbook.local";
  const adminPassword = process.env.ADMIN_PASSWORD || process.env.APP_PASSWORD || "cookbook123";
  const adminName = process.env.ADMIN_NAME || "Admin";

  if (!process.env.ADMIN_PASSWORD && !process.env.APP_PASSWORD) {
    console.warn("WARNING: No ADMIN_PASSWORD or APP_PASSWORD set. Using default password. Change this immediately!");
  }

  console.log("Step 1: Create User table...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'member',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "User_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")
  `);

  console.log("Step 2: Create admin user...");
  const adminId = `admin_${Date.now()}`;
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // Check if admin already exists
  const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT "id" FROM "User" WHERE "email" = $1`, adminEmail
  );

  let userId: string;
  if (existing.length > 0) {
    userId = existing[0].id;
    console.log(`  Admin already exists: ${userId}`);
  } else {
    userId = adminId;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "User" ("id", "name", "email", "passwordHash", "role") VALUES ($1, $2, $3, $4, 'admin')`,
      userId, adminName, adminEmail, passwordHash
    );
    console.log(`  Created admin: ${userId} (${adminEmail})`);
  }

  console.log("Step 3: Add nullable userId columns...");
  const tables = ["Recipe", "MealPlanItem", "PantryItem", "ShoppingListCache", "CustomShoppingItem"];
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "userId" TEXT`);
      console.log(`  Added userId to ${table}`);
    } catch (e) {
      console.log(`  userId already exists on ${table}`);
    }
  }

  console.log("Step 4: Backfill userId...");
  for (const table of tables) {
    const result = await prisma.$executeRawUnsafe(
      `UPDATE "${table}" SET "userId" = $1 WHERE "userId" IS NULL OR "userId" = ''`, userId
    );
    console.log(`  Backfilled ${table}: ${result} rows`);
  }

  console.log("Step 5: Make userId non-nullable...");
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN "userId" SET NOT NULL`);
  }

  console.log("Step 6: Add foreign keys and update indexes...");

  // Add FKs (ignore if they already exist)
  const fks = [
    { table: "Recipe", name: "Recipe_userId_fkey" },
    { table: "MealPlanItem", name: "MealPlanItem_userId_fkey" },
    { table: "PantryItem", name: "PantryItem_userId_fkey" },
    { table: "ShoppingListCache", name: "ShoppingListCache_userId_fkey" },
    { table: "CustomShoppingItem", name: "CustomShoppingItem_userId_fkey" },
  ];
  for (const fk of fks) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "${fk.table}" ADD CONSTRAINT "${fk.name}" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`
      );
    } catch { /* already exists */ }
  }

  // Add indexes
  try { await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Recipe_userId_idx" ON "Recipe"("userId")`); } catch { /* */ }
  try { await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MealPlanItem_userId_idx" ON "MealPlanItem"("userId")`); } catch { /* */ }

  // Update unique constraints for PantryItem
  try { await prisma.$executeRawUnsafe(`ALTER TABLE "PantryItem" DROP CONSTRAINT IF EXISTS "PantryItem_name_key"`); } catch { /* */ }
  try { await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "PantryItem_userId_name_key" ON "PantryItem"("userId", "name")`); } catch { /* */ }

  // Update unique constraints for ShoppingListCache
  try { await prisma.$executeRawUnsafe(`ALTER TABLE "ShoppingListCache" DROP CONSTRAINT IF EXISTS "ShoppingListCache_weekStart_key"`); } catch { /* */ }
  try { await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "ShoppingListCache_userId_weekStart_key" ON "ShoppingListCache"("userId", "weekStart")`); } catch { /* */ }

  // Update unique constraints for CustomShoppingItem
  try { await prisma.$executeRawUnsafe(`ALTER TABLE "CustomShoppingItem" DROP CONSTRAINT IF EXISTS "CustomShoppingItem_weekStart_name_key"`); } catch { /* */ }
  try { await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "CustomShoppingItem_userId_weekStart_name_key" ON "CustomShoppingItem"("userId", "weekStart", "name")`); } catch { /* */ }

  // Create SharedRecipe table
  console.log("Step 7: Create SharedRecipe table...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SharedRecipe" (
      "id" TEXT NOT NULL,
      "token" TEXT NOT NULL,
      "recipeId" TEXT NOT NULL,
      "createdBy" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SharedRecipe_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "SharedRecipe_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  try { await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "SharedRecipe_token_key" ON "SharedRecipe"("token")`); } catch { /* */ }

  console.log("\nMigration complete!");
  console.log(`Admin email: ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
