import { NextResponse } from "next/server";
import { DomainError } from "@/lib/domain-error";
import { updateReservationSchema } from "@/schemas/update-reservation";
import { updateReservation } from "@/server/reservations/update-reservation";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { id } = await context.params;
    const payload =
      body !== null && typeof body === "object" && !Array.isArray(body)
        ? { ...(body as Record<string, unknown>), id }
        : { id };
    const parsed = updateReservationSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Invalid request.",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    const reservation = await updateReservation(parsed.data);
    return NextResponse.json({ reservation });
  } catch (error: unknown) {
    if (error instanceof DomainError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Request body must be valid JSON.", code: "INVALID_JSON" },
        { status: 400 },
      );
    }

    console.error("Unexpected reservation update error", error);
    return NextResponse.json(
      {
        error: "The reservation could not be saved. Please try again.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
