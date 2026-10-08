import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { CreateReservationForm } from "@/features/reservations/create-reservation-form";
import { listLocations } from "@/server/reservations/list-locations";

export const dynamic = "force-dynamic";

export default async function NewReservationPage() {
  const locations = await listLocations();

  return (
    <Stack spacing={3}>
      <Box>
        <Button href="/" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
          Back to reservations
        </Button>
        <Typography component="h1" variant="h1" gutterBottom>
          New Reservation
        </Typography>
        <Typography color="text.secondary">
          Times are entered in UTC, matching the reservation list. Only a confirmed reservation
          consumes availability.
        </Typography>
      </Box>

      {locations.length === 0 ? (
        <Alert severity="info">No locations are available yet.</Alert>
      ) : (
        <CreateReservationForm locations={locations} />
      )}
    </Stack>
  );
}
