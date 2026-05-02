import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

async function seedUsers() {
  const existingAdmin = await db.select().from(usersTable).where(eq(usersTable.username, "admin")).limit(1);
  if (existingAdmin.length === 0) {
    const passwordHash = await bcrypt.hash("123456", 10);
    await db.insert(usersTable).values({ username: "admin", passwordHash, role: "admin" });
    console.log("Admin user created: admin / 123456");
  } else {
    console.log("Admin user already exists, skipping.");
  }

  const existingKitchen = await db.select().from(usersTable).where(eq(usersTable.username, "kitchen")).limit(1);
  if (existingKitchen.length === 0) {
    const passwordHash = await bcrypt.hash("123456", 10);
    await db.insert(usersTable).values({ username: "kitchen", passwordHash, role: "kitchen" });
    console.log("Kitchen user created: kitchen / 123456");
  } else {
    console.log("Kitchen user already exists, skipping.");
  }

  process.exit(0);
}

seedUsers().catch((err) => {
  console.error(err);
  process.exit(1);
});
