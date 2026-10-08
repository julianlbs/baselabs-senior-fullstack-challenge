import { z } from "zod";

export const createReservationSchema = z
  .object({
    locationId: z.string().trim().min(1, "Select a location."),
    startAt: z.string().trim().min(1, "Enter a start time."),
    endAt: z.string().trim().min(1, "Enter an end time."),
    status: z.enum(["DRAFT", "CONFIRMED"]),
    items: z
      .array(
        z.object({
          equipmentId: z.string().trim().min(1, "Select equipment."),
          quantity: z.number().int().positive("Quantity must be greater than zero."),
        }),
      )
      .min(1, "Add at least one equipment item."),
  })
  .superRefine((value, ctx) => {
    if (value.endAt <= value.startAt) {
      ctx.addIssue({
        code: "custom",
        message: "End time must be after start time.",
        path: ["endAt"],
      });
    }

    const equipmentIds = value.items.map((item) => item.equipmentId);
    if (new Set(equipmentIds).size !== equipmentIds.length) {
      ctx.addIssue({
        code: "custom",
        message: "Each equipment type can only be added once.",
        path: ["items"],
      });
    }
  });

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
