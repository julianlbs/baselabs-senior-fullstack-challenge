import { DomainError } from "@/lib/domain-error";
import { prisma } from "@/lib/prisma";
import type { CreateReservationInput } from "@/schemas/create-reservation";
import { getAvailableQuantity } from "@/server/reservations/availability";

function pluralEquipmentName(name: string): string {
  if (name.endsWith("s") || name.endsWith("S")) {
    return name;
  }
  return `${name}s`;
}

function parseUtcDateTimeLocal(value: string): Date {
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  const iso = withSeconds.endsWith("Z") ? withSeconds : `${withSeconds}.000Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new DomainError("Enter a valid date and time.", 400, "INVALID_INTERVAL");
  }
  return date;
}

export async function createReservation(input: CreateReservationInput) {
  const startAt = parseUtcDateTimeLocal(input.startAt);
  const endAt = parseUtcDateTimeLocal(input.endAt);

  if (endAt <= startAt) {
    throw new DomainError("End time must be after start time.", 400, "INVALID_INTERVAL");
  }

  if (input.items.length === 0) {
    throw new DomainError("Add at least one equipment item.", 400, "VALIDATION_ERROR");
  }

  const equipmentIds = input.items.map((item) => item.equipmentId);
  if (new Set(equipmentIds).size !== equipmentIds.length) {
    throw new DomainError("Each equipment type can only be added once.", 400, "DUPLICATE_EQUIPMENT");
  }

  for (const item of input.items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new DomainError("Quantity must be a positive whole number.", 400, "INVALID_QUANTITY");
    }
  }

  return prisma.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id: input.locationId },
      select: { id: true },
    });

    if (!location) {
      throw new DomainError("Location was not found.", 404, "LOCATION_NOT_FOUND");
    }

    if (input.status === "CONFIRMED") {
      for (const item of input.items) {
        const { availableQuantity, equipmentName } = await getAvailableQuantity(
          {
            locationId: input.locationId,
            equipmentId: item.equipmentId,
            startAt,
            endAt,
          },
          tx,
        );

        if (item.quantity > availableQuantity) {
          const label =
            availableQuantity === 1 ? equipmentName : pluralEquipmentName(equipmentName);
          const verb = availableQuantity === 1 ? "is" : "are";
          throw new DomainError(
            `Only ${availableQuantity} ${label} ${verb} available for the selected period.`,
            409,
            "AVAILABILITY_CONFLICT",
          );
        }
      }
    } else {
      for (const item of input.items) {
        const equipment = await tx.equipment.findFirst({
          where: { id: item.equipmentId, locationId: input.locationId },
          select: { id: true },
        });

        if (!equipment) {
          throw new DomainError(
            "Equipment was not found at the selected location.",
            404,
            "EQUIPMENT_NOT_FOUND",
          );
        }
      }
    }

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
