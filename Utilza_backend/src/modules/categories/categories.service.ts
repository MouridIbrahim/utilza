import { prisma } from "../../lib/prisma.js";
import { registryCategories } from "../tools/tool-registry.js";

export async function listCategories() {
  try {
    const rows = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return rows;
  } catch {
    return registryCategories.filter((c) => c.isActive);
  }
}

export async function getCategoryBySlug(slug: string) {
  try {
    const row = await prisma.category.findUnique({ where: { slug } });
    if (row) return row;
  } catch {
    // fall through to registry
  }
  return registryCategories.find((c) => c.slug === slug) ?? null;
}
