import { prisma } from "@/server/lib/prisma";
import { validateSchema } from "../endpoint.utils";
import { type UUID, uuidSchema } from "./location.utils.ts";
import type { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

type CurrentId = string | null;

interface CurrentLocation {
  id: string;
  name: string;
  parentId: string | null;
}

export const collectParent = async (locationUUID: UUID) => {
  // Check that we have a valid uuid:
  const validUuid = validateSchema(uuidSchema, locationUUID);
  let currentId: CurrentId = validUuid;
  const locationPath = [];

  while (currentId) {
    try {
      const currentLocation: CurrentLocation =
        await prisma.location.findUniqueOrThrow({
          where: { id: currentId },
          select: {
            id: true,
            name: true,
            parentId: true,
          },
        });

      // Add current location's name to path
      locationPath.push(currentLocation.name);

      // Move to parent for next iteration
      currentId = currentLocation.parentId;
    } catch (error) {
      const prismaError = error as PrismaClientKnownRequestError;
      if (prismaError.code == "P2025") {
        return { ok: false, message: "Location is invalid" };
      }
      return { ok: false, message: prismaError.message };
    }
  }

  return locationPath.reverse().join("/");
};
