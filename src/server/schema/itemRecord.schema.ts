import { z } from "zod";
import type { inferProcedureOutput } from "@trpc/server";
import type { itemRecordRouter } from "@/server/api/routers/itemRecord";

export const itemRecordInput = z.object({
  loaned: z.boolean(),
  actionByUserId: z.uuid("Invalid user ID format"),
  itemId: z.uuid("Invalid item ID format"),
  notes: z.string().max(500, "Notes too long (max 500 characters)").default(""),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be at least 1")
    .default(1),
});

// UPDATE INPUT SCHEMA (For PATCH requests)
export const itemRecordUpdateInput = itemRecordInput.partial();

export type ItemRecordGetOutput = inferProcedureOutput<
  (typeof itemRecordRouter)["get"]
>;
export type ItemRecordCreateOutput = inferProcedureOutput<
  (typeof itemRecordRouter)["create"]
>;
export type ItemRecordUpdateOutput = inferProcedureOutput<
  (typeof itemRecordRouter)["update"]
>;
export type ItemRecordDeleteOutput = inferProcedureOutput<
  (typeof itemRecordRouter)["delete"]
>;
export type ItemRecordListOutput = inferProcedureOutput<
  (typeof itemRecordRouter)["list"]
>;
export type ItemRecordAuditTrailOutput = inferProcedureOutput<
  (typeof itemRecordRouter)["getAuditTrail"]
>;
