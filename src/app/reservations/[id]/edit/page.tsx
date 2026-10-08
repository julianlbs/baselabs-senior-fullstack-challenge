import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { notFound } from "next/navigation";
import { CreateReservationForm } from "@/features/reservations/create-reservation-form";
import { getReservation } from "@/server/reservations/get-reservation";
import { listLocations } from "@/server/reservations/list-locations";

export const dynamic = "force-dynamic";

export default async function EditReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [locations, reservation] = await Promise.all([listLocations(), getReservation(id)]);

  if (!reservation) {
    notFound();
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Button href="/" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
          Back to reservations
        </Button>
        <Typography component="h1" variant="h1" gutterBottom>
          Edit Reservation
        </Typography>
        <Typography color="text.secondary">
          Times are entered in UTC, matching the reservation list. Only a confirmed reservation
          consumes availability, and this reservation is not counted against itself.
        </Typography>
      </Box>

      {locations.length === 0 ? (
        <Alert severity="info">No locations are available yet.</Alert>
      ) : (
        <CreateReservationForm
          key={reservation.id}
          locations={locations}
          reservationId={reservation.id}
          initialValues={{
            locationId: reservation.locationId,
            startAt: reservation.startAt,
            endAt: reservation.endAt,
            status: reservation.status,
            items: reservation.items,
          }}
        />
      )}
    </Stack>
  );
}
