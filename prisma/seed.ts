import { PrismaClient, Category, Priority } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type SeedEntry = {
  publisher: string;
  games: string[];
  hall?: string;
  category: Category;
  priority: Priority;
};

const PUBLISHER_SEED: SeedEntry[] = [
  { publisher: "Nintendo", games: ["Line-up noch offen"], hall: "9", category: "AAA", priority: "HOCH" },
  { publisher: "Xbox / Microsoft", games: ["Gears of War: E-Day", "Xbox FanFest"], hall: "7", category: "AAA", priority: "HOCH" },
  {
    publisher: "Capcom",
    games: [
      "Onimusha: Way of the Sword",
      "Dragon's Dogma 2: Dark Arisen",
      "Mega Man: Dual Override",
      "Street Fighter 6",
    ],
    hall: "9",
    category: "AAA",
    priority: "HOCH",
  },
  {
    publisher: "Ubisoft",
    games: ["Line-up offen (ggf. Division 3, AC Codename Hexe, Splinter Cell Remake, Beyond Good & Evil 2)"],
    hall: "6",
    category: "AAA",
    priority: "HOCH",
  },
  { publisher: "Electronic Arts", games: ["vermutlich EA Sports FC 27"], hall: "6", category: "AAA", priority: "HOCH" },
  { publisher: "Bandai Namco", games: ["Line-up offen"], hall: "6", category: "AAA", priority: "HOCH" },
  { publisher: "CD Projekt Red", games: ["Line-up offen"], category: "AAA", priority: "HOCH" },
  { publisher: "Krafton", games: ["unveröffentlichte PUBG-Studios-Weltpremiere"], category: "AAA", priority: "HOCH" },
  { publisher: "Konami", games: ["Line-up offen"], hall: "7", category: "AAA", priority: "HOCH" },
  {
    publisher: "SEGA",
    games: [
      "Alien: Isolation 2",
      "Crazy Taxi: World Tour",
      "Sonic Racing: CrossWorlds",
      "Metaphor: ReFantazio",
    ],
    hall: "7",
    category: "AAA",
    priority: "HOCH",
  },
  { publisher: "Gryphline", games: ["Arknights: Endfield"], hall: "8", category: "AAA", priority: "HOCH" },
  {
    publisher: "Aerosoft",
    games: ["Winter Resort 3", "Professional Ship Simulator", "+5 unangekündigte Sims"],
    category: "SIMULATION",
    priority: "HOCH",
  },
  {
    publisher: "Microsoft Flight Simulator",
    games: ["eigener gamescom-Auftritt bestätigt"],
    category: "SIMULATION",
    priority: "HOCH",
  },
  {
    publisher: "GIANTS Software",
    games: ["vermutlich Farming Simulator Content"],
    category: "SIMULATION",
    priority: "HOCH",
  },
  {
    publisher: "Astragon Entertainment",
    games: [
      "Firefighting Simulator: Ignite",
      "Seafarer: The Ship Sim",
      "Bau-Simulator Evolution",
      "Bus-Simulator 27",
    ],
    hall: "6",
    category: "SIMULATION",
    priority: "HOCH",
  },
  {
    publisher: "SCS Software",
    games: ["Euro Truck Simulator 2 / American Truck Simulator"],
    category: "SIMULATION",
    priority: "HOCH",
  },
  { publisher: "Team17", games: ["mehrere Indie-Titel"], category: "INDIE", priority: "MITTEL" },
  { publisher: "Level Infinite", games: ["Line-up offen"], category: "SONSTIGE", priority: "MITTEL" },
  { publisher: "Tencent Games", games: ["Line-up offen"], category: "SONSTIGE", priority: "MITTEL" },
  { publisher: "HoYoverse", games: ["Line-up offen"], category: "SONSTIGE", priority: "MITTEL" },
  { publisher: "Pearl Abyss", games: ["Line-up offen"], category: "SONSTIGE", priority: "MITTEL" },
  { publisher: "Plaion", games: ["Line-up offen"], category: "SONSTIGE", priority: "MITTEL" },
  { publisher: "Headup", games: ["Line-up offen"], category: "SONSTIGE", priority: "MITTEL" },
  { publisher: "Deep Silver", games: ["Line-up offen"], category: "SONSTIGE", priority: "MITTEL" },
  { publisher: "Focus Entertainment", games: ["Line-up offen"], category: "SONSTIGE", priority: "MITTEL" },
];

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
