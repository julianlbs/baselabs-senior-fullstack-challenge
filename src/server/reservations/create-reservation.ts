import { prisma } from "@/lib/prisma";
import type { CreateReservationInput } from "@/schemas/create-reservation";
import {
  assertReservationCanBeSaved,
  parseReservationWindow,
} from "@/server/reservations/reservation-write";

export async function createReservation(input: CreateReservationInput) {
  const { startAt, endAt } = parseReservationWindow(input);

  return prisma.$transaction(async (tx) => {
    await assertReservationCanBeSaved(tx, {
      locationId: input.locationId,
      status: input.status,
      startAt,
      endAt,
      items: input.items,
    });

    return tx.reservation.create({
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
  });
}
