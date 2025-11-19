import { z } from "zod";
import type { inferProcedureOutput } from "@trpc/server";
import type { locationRouter } from "@/server/api/routers/location";

export const locationInput = z.object({
  name: z
    .string()
    .min(1, "Location name is required")
    .max(100, "Name too long (max 100 chars)"),
  parentId: z.uuid("Invalid parent location ID format").optional().nullable(),
});

// Input schema for location_get procedure
export const locationGetInput = z
  .object({
    id: z.uuid("Invalid location ID format").optional().nullable(),
    name: locationInput.shape.name.optional().nullable(),
  })
  .partial()
  .refine(
    (data) => data.id ?? data.name,
    "Either id or name should be filled in.",
  );

// UPDATE INPUT SCHEMA (For PATCH requests)
export const locationUpdateInput = locationInput.partial();

export type LocationGetOutput = inferProcedureOutput<
  (typeof locationRouter)["get"]
>;
export type LocationCreateOutput = inferProcedureOutput<
  (typeof locationRouter)["create"]
>;
export type LocationUpdateOutput = inferProcedureOutput<
  (typeof locationRouter)["update"]
>;
export type LocationDeleteOutput = inferProcedureOutput<
  (typeof locationRouter)["delete"]
>;
export type LocationListOutput = inferProcedureOutput<
  (typeof locationRouter)["list"]
>;
