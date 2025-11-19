import { z } from "zod";
import type { inferProcedureOutput } from "@trpc/server";
import type { groupRouter } from "@/server/api/routers/group";

export const groupInput = z.object({
  name: z
    .string()
    .min(1, "Group name is required")
    .max(100, "Name too long (max 100 chars)"),
  parentId: z.uuid("Invalid parent group ID format").optional().nullable(),
});

// UPDATE INPUT SCHEMA (For PATCH requests)
export const groupUpdateInput = groupInput.partial();

export type GroupGetOutput = inferProcedureOutput<(typeof groupRouter)["get"]>;
export type GroupCreateOutput = inferProcedureOutput<
  (typeof groupRouter)["create"]
>;
export type GroupUpdateOutput = inferProcedureOutput<
  (typeof groupRouter)["update"]
>;
export type GroupDeleteOutput = inferProcedureOutput<
  (typeof groupRouter)["delete"]
>;
export type GroupListOutput = inferProcedureOutput<
  (typeof groupRouter)["list"]
>;
