import { prisma } from "@/lib/prisma";

export function listLocations() {
  return prisma.location.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      equipment: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, totalQuantity: true },
      },
    },
  });
}
