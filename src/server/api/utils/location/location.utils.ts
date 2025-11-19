import { z } from "zod";

// Created a schema for the uuid
export const uuidSchema = z.uuid();
export type UUID = z.infer<typeof uuidSchema>;
