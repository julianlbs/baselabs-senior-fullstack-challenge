import { DomainError } from "@/lib/domain-error";
import { prisma } from "@/lib/prisma";

interface AvailabilityInput {
  locationId: string;
  equipmentId: string;
  startAt: Date;
  endAt: Date;
  /** Confirmed items on this reservation are left out of the sum. Omit it for create. */
  excludeReservationId?: string;
}

interface AvailabilityCheckInput extends AvailabilityInput {
  requestedQuantity: number;
}

export type ReservationDb = typeof prisma | Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function getAvailableQuantity(
  input: AvailabilityInput,
  db: ReservationDb = prisma,
): Promise<{ availableQuantity: number; equipmentName: string }> {
  if (input.endAt <= input.startAt) {
    throw new DomainError("End time must be after start time.", 400, "INVALID_INTERVAL");
  }

  const equipment = await db.equipment.findFirst({
    where: { id: input.equipmentId, locationId: input.locationId },
    select: { totalQuantity: true, name: true },
  });

  if (!equipment) {
    throw new DomainError(
      "Equipment was not found at the selected location.",
      404,
      "EQUIPMENT_NOT_FOUND",
    );
  }

  // Half-open intervals [start, end): a booking that ends when another starts does not overlap.
  const reservations = await db.reservation.findMany({
    where: {
      locationId: input.locationId,
      status: "CONFIRMED",
      startAt: { lt: input.endAt },
      endAt: { gt: input.startAt },
      ...(input.excludeReservationId ? { id: { not: input.excludeReservationId } } : {}),
      items: { some: { equipmentId: input.equipmentId } },
    },
    select: {
      items: {
        where: { equipmentId: input.equipmentId },
        select: { quantity: true },
      },
    },
  });

  const reservedQuantity = reservations.reduce(
    (sum, reservation) => sum + reservation.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  );

  return {
    availableQuantity: Math.max(0, equipment.totalQuantity - reservedQuantity),
    equipmentName: equipment.name,
  };
}

export async function checkAvailability(
  input: AvailabilityCheckInput,
): Promise<{ available: boolean; availableQuantity: number }> {
  if (!Number.isInteger(input.requestedQuantity) || input.requestedQuantity <= 0) {
    throw new DomainError("Quantity must be a positive whole number.", 400, "INVALID_QUANTITY");
  }

  const { availableQuantity } = await getAvailableQuantity(input);
  return {
    available: input.requestedQuantity <= availableQuantity,
    availableQuantity,
  };
}
