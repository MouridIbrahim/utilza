// Static fallback registry. Mirrors prisma/seed.ts so the API stays usable
// without a live DB (dev/test). DB is source of truth when reachable.

export interface RegistryCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

export type ToolImplementation = "frontend" | "backend";

export interface RegistryTool {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  isActive: boolean;
  sortOrder: number;
  categoryId: string;
  categorySlug: string;
  implementation: ToolImplementation;
  platforms: string[];
  requiresFile: boolean;
  requiresAuth: boolean;
  supportsOffline: boolean;
}

const frontendDefaults: {
  implementation: ToolImplementation;
  platforms: string[];
  requiresFile: boolean;
  requiresAuth: boolean;
  supportsOffline: boolean;
} = {
  implementation: "frontend",
  platforms: ["web", "mobile"],
  requiresFile: false,
  requiresAuth: false,
  supportsOffline: true,
};

export const registryCategories: RegistryCategory[] = [
  {
    id: "cat-calculators",
    name: "Calculators",
    slug: "calculators",
    description: "Everyday calculators",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "cat-date-time",
    name: "Date & Time",
    slug: "date-time",
    description: "Date and time utilities",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "cat-text",
    name: "Text",
    slug: "text",
    description: "Text and counting tools",
    sortOrder: 3,
    isActive: true,
  },
  {
    id: "cat-generators",
    name: "Generators",
    slug: "generators",
    description: "Random generators",
    sortOrder: 4,
    isActive: true,
  },
];

export const registryTools: RegistryTool[] = [
  {
    id: "tool-percentage",
    name: "Percentage Calculator",
    slug: "percentage-calculator",
    description: "Calculate percentages quickly.",
    icon: "percent",
    isActive: true,
    sortOrder: 1,
    categoryId: "cat-calculators",
    categorySlug: "calculators",
    ...frontendDefaults,
  },
  {
    id: "tool-discount",
    name: "Discount Calculator",
    slug: "discount-calculator",
    description: "Calculate discounts and final price.",
    icon: "tag",
    isActive: true,
    sortOrder: 2,
    categoryId: "cat-calculators",
    categorySlug: "calculators",
    ...frontendDefaults,
  },
  {
    id: "tool-age",
    name: "Age Calculator",
    slug: "age-calculator",
    description: "Calculate age from birth date.",
    icon: "cake",
    isActive: true,
    sortOrder: 3,
    categoryId: "cat-date-time",
    categorySlug: "date-time",
    ...frontendDefaults,
  },
  {
    id: "tool-date-diff",
    name: "Date Difference Calculator",
    slug: "date-difference",
    description: "Days between two dates.",
    icon: "calendar",
    isActive: true,
    sortOrder: 4,
    categoryId: "cat-date-time",
    categorySlug: "date-time",
    ...frontendDefaults,
  },
  {
    id: "tool-unit",
    name: "Unit Converter",
    slug: "unit-converter",
    description: "Convert common units.",
    icon: "ruler",
    isActive: true,
    sortOrder: 5,
    categoryId: "cat-calculators",
    categorySlug: "calculators",
    ...frontendDefaults,
  },
  {
    id: "tool-word",
    name: "Word Counter",
    slug: "word-counter",
    description: "Count words, sentences and lines.",
    icon: "type",
    isActive: true,
    sortOrder: 6,
    categoryId: "cat-text",
    categorySlug: "text",
    ...frontendDefaults,
  },
  {
    id: "tool-char",
    name: "Character Counter",
    slug: "character-counter",
    description: "Count characters with/without spaces.",
    icon: "text",
    isActive: true,
    sortOrder: 7,
    categoryId: "cat-text",
    categorySlug: "text",
    ...frontendDefaults,
  },
  {
    id: "tool-case",
    name: "Case Converter",
    slug: "case-converter",
    description: "Upper, lower and title case.",
    icon: "case",
    isActive: true,
    sortOrder: 8,
    categoryId: "cat-text",
    categorySlug: "text",
    ...frontendDefaults,
  },
  {
    id: "tool-pass",
    name: "Password Generator",
    slug: "password-generator",
    description: "Generate strong random passwords.",
    icon: "key",
    isActive: true,
    sortOrder: 9,
    categoryId: "cat-generators",
    categorySlug: "generators",
    ...frontendDefaults,
  },
  {
    id: "tool-qr",
    name: "QR Code Generator",
    slug: "qr-generator",
    description: "Generate QR codes from text or URLs.",
    icon: "qr",
    isActive: true,
    sortOrder: 10,
    categoryId: "cat-generators",
    categorySlug: "generators",
    ...frontendDefaults,
  },
];
