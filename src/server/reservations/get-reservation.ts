import { prisma } from "@/lib/prisma";
import type { CreateReservationInput } from "@/schemas/create-reservation";

export interface ReservationForEdit extends CreateReservationInput {
  id: string;
}

function toUtcDateTimeLocal(date: Date): string {
  return date.toISOString().slice(0, 16);
}

export async function getReservation(id: string): Promise<ReservationForEdit | null> {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    select: {
      id: true,
      locationId: true,
      startAt: true,
      endAt: true,
      status: true,
      items: {
        orderBy: { equipment: { name: "asc" } },
        select: { equipmentId: true, quantity: true },
      },
    },
  });

  if (!reservation) {
    return null;
  }

  return {
    id: reservation.id,
    locationId: reservation.locationId,
    startAt: toUtcDateTimeLocal(reservation.startAt),
    endAt: toUtcDateTimeLocal(reservation.endAt),
    status: reservation.status,
    items: reservation.items.map((item) => ({
      equipmentId: item.equipmentId,
      quantity: item.quantity,
    })),
  };
}
