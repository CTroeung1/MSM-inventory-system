import { z } from "zod";
import type { inferProcedureOutput } from "@trpc/server";
import type { consumableRouter } from "@/server/api/routers/consumable";

export const createConsumableInput = z
  .object({
    available: z
      .number()
      .int("Available quantity must be an integer")
      .nonnegative("Available quantity cannot be negative"),
    total: z
      .number()
      .int("Total quantity must be an integer")
      .nonnegative("Total quantity cannot be negative"),
  })
  .refine((data) => data.total >= (data.available || 0), {
    message: "Total quantity cannot be less than available quantity",
    path: ["total"],
  });

export const consumableInput = createConsumableInput.safeExtend({
  itemId: z.uuid("Invalid item ID format"),
});

// UPDATE INPUT SCHEMA (For PATCH requests)
export const consumableUpdateInput = consumableInput.partial();

export type ConsumableGetOutput = inferProcedureOutput<
  (typeof consumableRouter)["get"]
>;
export type ConsumableCreateOutput = inferProcedureOutput<
  (typeof consumableRouter)["create"]
>;
export type ConsumableUpdateOutput = inferProcedureOutput<
  (typeof consumableRouter)["update"]
>;
export type ConsumableDeleteOutput = inferProcedureOutput<
  (typeof consumableRouter)["delete"]
>;
export type ConsumableListOutput = inferProcedureOutput<
  (typeof consumableRouter)["list"]
>;
