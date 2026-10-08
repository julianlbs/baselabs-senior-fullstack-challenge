import { DomainError } from "@/lib/domain-error";
import { prisma } from "@/lib/prisma";
import type { UpdateReservationInput } from "@/schemas/update-reservation";
import {
  assertReservationCanBeSaved,
  parseReservationWindow,
} from "@/server/reservations/reservation-write";

export async function updateReservation(input: UpdateReservationInput): Promise<{ id: string }> {
  const existing = await prisma.reservation.findUnique({
    where: { id: input.id },
    select: { id: true },
  });

  if (!existing) {
    throw new DomainError("Reservation not found.", 404, "RESERVATION_NOT_FOUND");
  }

  const { startAt, endAt } = parseReservationWindow(input);

  return prisma.$transaction(async (tx) => {
    const current = await tx.reservation.findUnique({
      where: { id: input.id },
      select: { id: true },
    });

    if (!current) {
      throw new DomainError("Reservation not found.", 404, "RESERVATION_NOT_FOUND");
    }

    const location = await tx.location.findUnique({
      where: { id: input.locationId },
      select: { id: true },
    });

    if (!location) {
      throw new DomainError("Location was not found.", 404, "LOCATION_NOT_FOUND");
    }

    await tx.reservationItem.deleteMany({ where: { reservationId: input.id } });

    const updated = await tx.reservation.update({
      where: { id: input.id },
      data: {
        locationId: input.locationId,
        startAt,
        endAt,
        status: input.status,
        items: {
          create: input.items.map((item) => ({
            equipmentId: item.equipmentId,
            quantity: item.quantity,
          })),
        },
      },
      select: { id: true },
    });

    await assertReservationCanBeSaved(tx, {
      locationId: input.locationId,
      status: input.status,
      startAt,
      endAt,
      items: input.items,
      excludeReservationId: input.id,
    });

    return updated;
  });
}
