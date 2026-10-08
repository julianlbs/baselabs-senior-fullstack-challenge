"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import {
  Alert,
  Button,
  Card,
  CardContent,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useFieldArray, useForm, useWatch, type FieldErrors } from "react-hook-form";
import { createReservationSchema, type CreateReservationInput } from "@/schemas/create-reservation";

export interface LocationOption {
  id: string;
  name: string;
  equipment: Array<{
    id: string;
    name: string;
    totalQuantity: number;
  }>;
}

interface ApiErrorBody {
  error?: string;
}

function quantityFromInput(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function clampQuantity(value: unknown, max?: number): number {
  let next = Math.trunc(quantityFromInput(value));
  if (next < 1) next = 1;
  if (typeof max === "number" && next > max) next = max;
  return next;
}

function itemsErrorMessage(errors: FieldErrors<CreateReservationInput>): string | undefined {
  const items = errors.items;
  if (!items) return undefined;
  if (typeof items.message === "string") return items.message;
  if (items.root && typeof items.root.message === "string") return items.root.message;
  return undefined;
}

export function CreateReservationForm({
  locations,
  reservationId,
  initialValues,
}: {
  locations: LocationOption[];
  reservationId?: string;
  initialValues?: CreateReservationInput;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<CreateReservationInput>({
    resolver: zodResolver(createReservationSchema),
    defaultValues: initialValues ?? {
      locationId: "",
      startAt: "",
      endAt: "",
      status: "DRAFT",
      items: [{ equipmentId: "", quantity: 1 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const locationId = useWatch({ control, name: "locationId" }) ?? "";
  const itemValues = useWatch({ control, name: "items" }) ?? [];
  const selectedLocation = locations.find((location) => location.id === locationId);
  const equipmentOptions = selectedLocation?.equipment ?? [];
  const itemsMessage = itemsErrorMessage(errors);

  function capQuantityToEquipment(index: number, totalQuantity: number) {
    const current = getValues(`items.${index}.quantity`);
    const next = clampQuantity(current, totalQuantity);
    if (next !== current) {
      setValue(`items.${index}.quantity`, next, {
        shouldDirty: true,
        shouldValidate: isSubmitted,
      });
    }
  }

  function clearEquipmentOutsideLocation(nextLocationId: string) {
    const allowed = new Set(
      locations
        .find((location) => location.id === nextLocationId)
        ?.equipment.map((equipment) => equipment.id) ?? [],
    );
    getValues("items").forEach((item, index) => {
      if (!allowed.has(item.equipmentId)) {
        setValue(`items.${index}.equipmentId`, "", {
          shouldDirty: true,
          shouldValidate: isSubmitted,
        });
      }
    });
  }

  async function onSubmit(input: CreateReservationInput) {
    setServerError(null);

    try {
      const response = await fetch(
        reservationId ? `/api/reservations/${encodeURIComponent(reservationId)}` : "/api/reservations",
        {
          method: reservationId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );

      let body: ApiErrorBody = {};
      try {
        body = (await response.json()) as ApiErrorBody;
      } catch {
        setServerError("The reservation could not be saved. Please try again.");
        return;
      }

      if (!response.ok) {
        setServerError(body.error ?? "The reservation could not be saved.");
        return;
      }

      router.refresh();
      router.push("/");
    } catch {
      setServerError("The server could not be reached. Please try again.");
    }
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2.5}>
            {serverError ? <Alert severity="error">{serverError}</Alert> : null}

            <Controller
              name="locationId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Location"
                  required
                  fullWidth
                  disabled={isSubmitting}
                  error={Boolean(errors.locationId)}
                  helperText={errors.locationId?.message ?? "Equipment choices follow the selected location."}
                  onChange={(event) => {
                    field.onChange(event);
                    clearEquipmentOutsideLocation(event.target.value);
                  }}
                  slotProps={{
                    inputLabel: { shrink: true },
                    select: { displayEmpty: true },
                  }}
                >
                  <MenuItem value="" disabled>
                    Select a location
                  </MenuItem>
                  {locations.map((location) => (
                    <MenuItem key={location.id} value={location.id}>
                      {location.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                {...register("startAt")}
                type="datetime-local"
                label="Start (UTC)"
                required
                fullWidth
                disabled={isSubmitting}
                error={Boolean(errors.startAt)}
                helperText={errors.startAt?.message ?? "Enter the start in UTC."}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 60 } }}
              />
              <TextField
                {...register("endAt")}
                type="datetime-local"
                label="End (UTC)"
                required
                fullWidth
                disabled={isSubmitting}
                error={Boolean(errors.endAt)}
                helperText={errors.endAt?.message ?? "Must be after the start time."}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 60 } }}
              />
            </Stack>

            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Status"
                  required
                  fullWidth
                  disabled={isSubmitting}
                  error={Boolean(errors.status)}
                  helperText={
                    errors.status?.message ??
                    "Drafts do not consume stock. Confirmed reservations are checked against availability."
                  }
                >
                  <MenuItem value="DRAFT">Draft</MenuItem>
                  <MenuItem value="CONFIRMED">Confirmed</MenuItem>
                </TextField>
              )}
            />

            <Stack spacing={1.5}>
              <Typography component="h2" variant="h2">
                Equipment
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add at least one item. The number beside each name is the location&apos;s total stock,
                not the amount still free.
              </Typography>
              {itemsMessage ? <Alert severity="error">{itemsMessage}</Alert> : null}
              {selectedLocation && equipmentOptions.length === 0 ? (
                <Alert severity="info">This location has no equipment.</Alert>
              ) : null}

              {fields.map((field, index) => {
                const equipmentError = errors.items?.[index]?.equipmentId?.message;
                const quantityError = errors.items?.[index]?.quantity?.message;
                const selectedEquipment = equipmentOptions.find(
                  (equipment) => equipment.id === itemValues[index]?.equipmentId,
                );
                const removeLabel = selectedEquipment
                  ? `Remove ${selectedEquipment.name}`
                  : "Remove equipment";

                return (
                  <Stack
                    key={field.id}
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    sx={{ alignItems: { xs: "stretch", sm: "flex-start" } }}
                  >
                    <Controller
                      name={`items.${index}.equipmentId`}
                      control={control}
                      render={({ field: equipmentField }) => (
                        <TextField
                          {...equipmentField}
                          select
                          label="Equipment"
                          required
                          fullWidth
                          disabled={isSubmitting || !selectedLocation || equipmentOptions.length === 0}
                          error={Boolean(equipmentError)}
                          helperText={
                            equipmentError ??
                            (selectedLocation
                              ? "Choose equipment at this location."
                              : "Select a location first.")
                          }
                          sx={{ flex: 1, minWidth: 0 }}
                          onChange={(event) => {
                            equipmentField.onChange(event);
                            const nextEquipment = equipmentOptions.find(
                              (equipment) => equipment.id === event.target.value,
                            );
                            if (nextEquipment) {
                              capQuantityToEquipment(index, nextEquipment.totalQuantity);
                            }
                          }}
                          slotProps={{
                            inputLabel: { shrink: true },
                            select: { displayEmpty: true },
                          }}
                        >
                          <MenuItem value="" disabled>
                            Select equipment
                          </MenuItem>
                          {equipmentOptions.map((equipment) => (
                            <MenuItem key={equipment.id} value={equipment.id}>
                              {equipment.name} ({equipment.totalQuantity} total)
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    />
                    <Controller
                      name={`items.${index}.quantity`}
                      control={control}
                      render={({ field: quantityField }) => {
                        const quantityMax = selectedEquipment?.totalQuantity;
                        return (
                          <TextField
                            name={quantityField.name}
                            inputRef={quantityField.ref}
                            value={quantityField.value}
                            onBlur={quantityField.onBlur}
                            type="number"
                            label="Quantity"
                            required
                            disabled={isSubmitting}
                            error={Boolean(quantityError)}
                            helperText={
                              quantityError ??
                              (typeof quantityMax === "number"
                                ? `Maximum ${quantityMax}.`
                                : "Greater than zero.")
                            }
                            onChange={(event) => {
                              const next = clampQuantity(event.target.value, quantityMax);
                              event.target.value = String(next);
                              quantityField.onChange(next);
                            }}
                            slotProps={{
                              htmlInput: {
                                min: 1,
                                step: 1,
                                inputMode: "numeric",
                                ...(typeof quantityMax === "number" ? { max: quantityMax } : {}),
                              },
                            }}
                            sx={{ width: { xs: "100%", sm: 160 }, flexShrink: 0 }}
                          />
                        );
                      }}
                    />
                    <IconButton
                      type="button"
                      aria-label={removeLabel}
                      onClick={() => remove(index)}
                      disabled={isSubmitting || fields.length === 1}
                      sx={{ mt: { sm: 1 }, alignSelf: { xs: "flex-start", sm: "flex-start" } }}
                    >
                      <DeleteOutlinedIcon />
                    </IconButton>
                  </Stack>
                );
              })}

              <Button
                type="button"
                variant="outlined"
                startIcon={<AddIcon />}
                aria-label="Add equipment"
                disabled={isSubmitting || !selectedLocation || equipmentOptions.length === 0}
                onClick={() => append({ equipmentId: "", quantity: 1 })}
                sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}
              >
                Add equipment
              </Button>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "flex-end" }}>
              <Button href="/" disabled={isSubmitting} sx={{ width: { xs: "100%", sm: "auto" } }}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                {isSubmitting ? "Saving…" : "Save reservation"}
              </Button>
            </Stack>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}
