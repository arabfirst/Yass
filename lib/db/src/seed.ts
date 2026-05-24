import { db, usersTable } from "./index";
import { eq } from "drizzle-orm";

async function seed() {
  try {
    await db.delete(usersTable).where(eq(usersTable.role, "admin"));

    await db.insert(usersTable).values({
      username: "100",
      password: "1001",
      role: "admin",
    });

    console.log("Admin user set: username=100");
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }

  process.exit(0);
}

seed();
