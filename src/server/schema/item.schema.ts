import { z } from "zod";
import type { inferProcedureOutput } from "@trpc/server";
import type { itemRouter } from "@/server/api/routers/item";
import { consumableInput, createConsumableInput } from "./consumable.schema";
import { tagInput } from "./tag.schema";

export const itemInput = z.object({
  serial: z
    .string()
    .min(1, "Serial number is required")
    .max(100, "Serial number too long (max 100 chars)")
    .optional(),
  name: z
    .string()
    .min(1, "Item name is required")
    .max(200, "Name too long (max 200 chars)"),
  locationId: z.uuid("Invalid location ID format"),
  stored: z.boolean().optional(),
  tags: z.array(tagInput),
  cost: z
    .number()
    .int("Must be an integer")
    .nonnegative("Cost cannot be negative")
    .optional(),
  consumable: consumableInput.optional(),
});

// NOTE: THIS IS A QUICK PATCH
export const createItemInput = z.object({
  serial: z
    .string()
    .min(1, "Serial number is required")
    .max(100, "Serial number too long (max 100 chars)")
    .optional(),
  name: z
    .string()
    .min(1, "Item name is required")
    .max(200, "Name too long (max 200 chars)"),
  locationId: z.uuid("Invalid location ID format"),
  stored: z.boolean().optional(),
  tags: z.array(tagInput),
  cost: z
    .number()
    .int("Must be an integer")
    .nonnegative("Cost cannot be negative")
    .optional(),
  consumable: createConsumableInput.optional(),
});

export const updateItemInput = itemInput.extend({
  id: z.string().nonempty(),
});

// UPDATE INPUT SCHEMA (For PATCH requests)
export const itemUpdateInput = itemInput.partial();

export type ItemGetOutput = inferProcedureOutput<(typeof itemRouter)["get"]>;
export type ItemCreateOutput = inferProcedureOutput<
  (typeof itemRouter)["create"]
>;
export type ItemUpdateOutput = inferProcedureOutput<
  (typeof itemRouter)["update"]
>;
export type ItemDeleteOutput = inferProcedureOutput<
  (typeof itemRouter)["delete"]
>;
export type ItemListOutput = inferProcedureOutput<(typeof itemRouter)["list"]>;
