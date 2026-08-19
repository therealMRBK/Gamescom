import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PUBLISHER_SEED } from "./publisher-data";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "gamescom2026!";
  const adminName = process.env.ADMIN_NAME || "Admin";

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
      color: "#6366f1",
    },
    update: {},
  });
  console.log(`Admin-Login bereit: ${adminEmail}`);

  const existingCount = await prisma.publisherEntry.count();
  if (existingCount > 0) {
    console.log(
      `Es existieren bereits ${existingCount} Publisher-Einträge – Seed-Daten werden übersprungen.`,
    );
  } else {
    for (const entry of PUBLISHER_SEED) {
      const created = await prisma.publisherEntry.create({
        data: {
          publisher: entry.publisher,
          games: entry.games,
          hall: entry.hall || null,
          category: entry.category,
          priority: entry.priority,
          contactChannel: "SONSTIGE",
          contactStatus: "NICHT_KONTAKTIERT",
        },
      });
      await prisma.statusHistory.create({
        data: {
          entryId: created.id,
          oldStatus: null,
          newStatus: "NICHT_KONTAKTIERT",
        },
      });
    }
    console.log(`${PUBLISHER_SEED.length} Publisher-Einträge angelegt.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
