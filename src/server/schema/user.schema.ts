import { z } from "zod";
import type { inferProcedureOutput } from "@trpc/server";
import type { userRouter } from "@/server/api/routers/user";

export const userInput = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name too long (max 50 chars)"),
  email: z
    .email("Invalid email format")
    .max(100, "Email too long (max 100 chars)"),
  groupId: z.uuid("Invalid group ID format"),
  emailVerified: z.boolean("Boolean value required"),
});

// UPDATE INPUT SCHEMA (For PATCH requests)
export const userUpdateInput = userInput.partial();

export type UserGetOutput = inferProcedureOutput<(typeof userRouter)["get"]>;
export type UserCreateOutput = inferProcedureOutput<
  (typeof userRouter)["create"]
>;
export type UserUpdateOutput = inferProcedureOutput<
  (typeof userRouter)["update"]
>;
export type UserDeleteOutput = inferProcedureOutput<
  (typeof userRouter)["delete"]
>;
export type UserListOutput = inferProcedureOutput<(typeof userRouter)["list"]>;
