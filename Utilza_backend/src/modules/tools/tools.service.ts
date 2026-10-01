import { prisma } from "../../lib/prisma.js";
import { registryTools } from "./tool-registry.js";

export interface ListToolsQuery {
  category?: string;
  search?: string;
  page: number;
  limit: number;
}

export async function listTools(q: ListToolsQuery) {
  const { category, search, page, limit } = q;
  try {
    const where: { isActive: boolean; category?: { slug: string }; OR?: object[] } = {
      isActive: true,
    };
    if (category) where.category = { slug: category };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }
    const [total, items] = await Promise.all([
      prisma.tool.count({ where }),
      prisma.tool.findMany({
        where,
        include: { category: { select: { slug: true, name: true } } },
        orderBy: { sortOrder: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { items, page, limit, total };
  } catch {
    let items = registryTools.filter((t) => t.isActive);
    if (category) items = items.filter((t) => t.categorySlug === category);
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(
        (t) =>
          t.name.toLowerCase().includes(s) ||
          t.description.toLowerCase().includes(s) ||
          t.slug.includes(s),
      );
    }
    const total = items.length;
    const paged = items.slice((page - 1) * limit, page * limit);
    return { items: paged, page, limit, total };
  }
}

export async function getToolBySlug(slug: string) {
  try {
    const row = await prisma.tool.findUnique({
      where: { slug },
      include: { category: { select: { slug: true, name: true } } },
    });
    if (row) return row;
  } catch {
    // fall through
  }
  return registryTools.find((t) => t.slug === slug) ?? null;
}
