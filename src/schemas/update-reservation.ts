import { z } from "zod";
import { createReservationSchema } from "@/schemas/create-reservation";

export const updateReservationSchema = createReservationSchema.safeExtend({
  id: z.string().trim().min(1, "Reservation id is required."),
});

export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;
