import { Card, CardContent, Skeleton, Stack } from "@mui/material";

export default function LoadingNewReservation() {
  return (
    <Stack spacing={2} aria-label="Loading reservation form">
      <Skeleton variant="text" width={200} height={36} />
      <Skeleton variant="text" width={280} height={52} />
      <Skeleton variant="text" width="70%" />
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Skeleton variant="rectangular" height={56} />
            <Skeleton variant="rectangular" height={56} />
            <Skeleton variant="rectangular" height={56} />
            <Skeleton variant="rectangular" height={120} />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
