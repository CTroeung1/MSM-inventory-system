import { z } from "zod";
import type { inferProcedureOutput } from "@trpc/server";
import type { tagRouter } from "@/server/api/routers/tag";

export const tagInput = z.object({
  id: z.string().nonempty(),
  name: z
    .string()
    .min(1, "Tag name is required")
    .max(50, "Tag name too long (max 50 chars)"),
  type: z
    .string()
    .min(1, "Tag type is required")
    .max(30, "Tag type too long (max 30 chars)"),
  colour: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Invalid color format")
    .default("#000000")
    .optional(),
});

// UPDATE INPUT SCHEMA (For PATCH requests)
export const tagUpdateInput = tagInput.partial();

export type TagGetOutput = inferProcedureOutput<(typeof tagRouter)["get"]>;
export type TagCreateOutput = inferProcedureOutput<
  (typeof tagRouter)["create"]
>;
export type TagUpdateOutput = inferProcedureOutput<
  (typeof tagRouter)["update"]
>;
export type TagDeleteOutput = inferProcedureOutput<
  (typeof tagRouter)["delete"]
>;
export type TagListOutput = inferProcedureOutput<(typeof tagRouter)["list"]>;
