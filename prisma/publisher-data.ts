import { Category, Priority } from "@prisma/client";

export type SeedEntry = {
  publisher: string;
  games: string[];
  hall?: string;
  category: Category;
  priority: Priority;
};

/**
 * Neu bestätigte Aussteller der gamescom 2026 (Stand: Presseberichte Juli/Aug. 2026,
 * u.a. Gematsu "books up all exhibitor space"). Separat gehalten, damit
 * add-new-publishers.ts sie auch nachträglich in bereits geseedete Datenbanken
 * einspielen kann, ohne bestehende Einträge zu berühren.
 */
export const NEW_PUBLISHERS_2026: SeedEntry[] = [
  { publisher: "Embark Studios", games: ["ARC Raiders"], category: "AAA", priority: "MITTEL" },
  { publisher: "NCsoft", games: ["Line-up offen"], category: "SONSTIGE", priority: "MITTEL" },
  { publisher: "NetEase Games", games: ["Line-up offen"], category: "SONSTIGE", priority: "MITTEL" },
  { publisher: "Daybreak Games", games: ["Line-up offen"], category: "SONSTIGE", priority: "MITTEL" },
  { publisher: "Bilibili", games: ["Line-up offen"], category: "SONSTIGE", priority: "MITTEL" },
];

export const PUBLISHER_SEED: SeedEntry[] = [
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
  ...NEW_PUBLISHERS_2026,
];
