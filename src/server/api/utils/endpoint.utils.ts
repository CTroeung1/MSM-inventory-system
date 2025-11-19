import { z, type ZodType } from "zod";
import { prisma } from "@/server/lib/prisma";

export const validateSchema = <T extends ZodType>(
  schema: T,
  input: unknown,
): z.infer<T> => {
  const valid = schema.safeParse(input);
  if (!valid.success) {
    const errorString = z.prettifyError(valid.error);
    throw new Error(`Schema validation failed: ${errorString}`);
  }
  return valid.data;
};

export type ExtendedTransactionClient = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];

// filter out the validation errors
type ValidationAttempt<T = object> = T & { ok: boolean };
// Error structure to propogate the errors through the try{} catch block
export interface ValidationError<T = object> extends Error {
  items: ValidationAttempt<T>[];
}

export const filterErrors = <T = object>(
  validations: ValidationAttempt<T>[],
) => {
  const failures = validations.filter((validation) => !validation.ok);

  if (failures.length > 0) {
    const error = new Error(
      `${failures.length} validation(s) failed`,
    ) as ValidationError<T>;
    error.items = failures;
    throw error;
  }
  return validations;
};

export const createValidationError = <T = object>(
  items: ValidationAttempt<T>[],
): ValidationError<T> => {
  const error = new Error("Validation failed") as ValidationError<T>;
  error.items = items;
  return error;
};
