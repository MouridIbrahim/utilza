import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { name: "Calculators", slug: "calculators", description: "Everyday calculators", sortOrder: 1 },
  { name: "Date & Time", slug: "date-time", description: "Date and time utilities", sortOrder: 2 },
  { name: "Text", slug: "text", description: "Text and counting tools", sortOrder: 3 },
  { name: "Generators", slug: "generators", description: "Random generators", sortOrder: 4 },
];

const tools: Array<{
  name: string;
  slug: string;
  description: string;
  categorySlug: string;
  icon: string;
  sortOrder: number;
  // New-architecture classification; all 10 MVP tools are frontend tools.
  // Optional here — the upsert below defaults them to frontend values.
  implementation?: "frontend" | "backend";
  platforms?: string[];
  requiresFile?: boolean;
  requiresAuth?: boolean;
  supportsOffline?: boolean;
}> = [
  {
    name: "Percentage Calculator",
    slug: "percentage-calculator",
    description: "Calculate percentages quickly.",
    categorySlug: "calculators",
    icon: "percent",
    sortOrder: 1,
  },
  {
    name: "Discount Calculator",
    slug: "discount-calculator",
    description: "Calculate discounts and final price.",
    categorySlug: "calculators",
    icon: "tag",
    sortOrder: 2,
  },
  {
    name: "Age Calculator",
    slug: "age-calculator",
    description: "Calculate age from birth date.",
    categorySlug: "date-time",
    icon: "cake",
    sortOrder: 3,
  },
  {
    name: "Date Difference Calculator",
    slug: "date-difference",
    description: "Days between two dates.",
    categorySlug: "date-time",
    icon: "calendar",
    sortOrder: 4,
  },
  {
    name: "Unit Converter",
    slug: "unit-converter",
    description: "Convert common units.",
    categorySlug: "calculators",
    icon: "ruler",
    sortOrder: 5,
  },
  {
    name: "Word Counter",
    slug: "word-counter",
    description: "Count words, sentences and lines.",
    categorySlug: "text",
    icon: "type",
    sortOrder: 6,
  },
  {
    name: "Character Counter",
    slug: "character-counter",
    description: "Count characters with/without spaces.",
    categorySlug: "text",
    icon: "text",
    sortOrder: 7,
  },
  {
    name: "Case Converter",
    slug: "case-converter",
    description: "Upper, lower and title case.",
    categorySlug: "text",
    icon: "case",
    sortOrder: 8,
  },
  {
    name: "Password Generator",
    slug: "password-generator",
    description: "Generate strong random passwords.",
    categorySlug: "generators",
    icon: "key",
    sortOrder: 9,
  },
  {
    name: "QR Code Generator",
    slug: "qr-generator",
    description: "Generate QR codes from text or URLs.",
    categorySlug: "generators",
    icon: "qr",
    sortOrder: 10,
  },
];

async function main() {
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, sortOrder: c.sortOrder },
      create: c,
    });
  }
  for (const t of tools) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: t.categorySlug } });
    await prisma.tool.upsert({
      where: { slug: t.slug },
      update: {
        name: t.name,
        description: t.description,
        icon: t.icon,
        sortOrder: t.sortOrder,
        categoryId: category.id,
        isActive: true,
        implementation: t.implementation ?? "frontend",
        platforms: t.platforms ?? ["web", "mobile"],
        requiresFile: t.requiresFile ?? false,
        requiresAuth: t.requiresAuth ?? false,
        supportsOffline: t.supportsOffline ?? true,
      },
      create: {
        name: t.name,
        slug: t.slug,
        description: t.description,
        icon: t.icon,
        sortOrder: t.sortOrder,
        categoryId: category.id,
        isActive: true,
        implementation: t.implementation ?? "frontend",
        platforms: t.platforms ?? ["web", "mobile"],
        requiresFile: t.requiresFile ?? false,
        requiresAuth: t.requiresAuth ?? false,
        supportsOffline: t.supportsOffline ?? true,
      },
    });
  }
  // eslint-disable-next-line no-console
  console.log("Seed complete: categories + 10 MVP tools");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
