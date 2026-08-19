import { PrismaClient } from "@prisma/client";
import { NEW_PUBLISHERS_2026 } from "./publisher-data";

const prisma = new PrismaClient();

/**
 * Trägt nachträglich bestätigte Aussteller (NEW_PUBLISHERS_2026 in seed.ts) in eine
 * bereits laufende Datenbank ein, ohne bestehende Publisher-Einträge zu verändern.
 * Aufruf: npx tsx prisma/add-new-publishers.ts
 */
async function main() {
  let created = 0;
  for (const entry of NEW_PUBLISHERS_2026) {
    const existing = await prisma.publisherEntry.findFirst({
      where: { publisher: entry.publisher },
    });
    if (existing) {
      console.log(`Übersprungen (existiert bereits): ${entry.publisher}`);
      continue;
    }
    const createdEntry = await prisma.publisherEntry.create({
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
        entryId: createdEntry.id,
        oldStatus: null,
        newStatus: "NICHT_KONTAKTIERT",
      },
    });
    console.log(`Angelegt: ${entry.publisher}`);
    created++;
  }
  console.log(`Fertig. ${created} neue(r) Publisher-Eintrag/Einträge angelegt.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
