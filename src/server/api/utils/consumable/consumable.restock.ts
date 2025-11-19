import {
  filterErrors,
  type ExtendedTransactionClient,
} from "../endpoint.utils";
import { prisma } from "@/server/lib/prisma";
import type { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { validateCart, type CartItem } from "../item/item.utils";

export const consumableRestock = async (restocks: CartItem[]) => {
  try {
    const validCart = await validateCart(restocks);
    filterErrors(validCart);

    await prisma.$transaction(async (tx) => {
      const validationAttempt = await Promise.all(
        restocks.map(async (restock) => await updateConsumable(tx, restock)),
      );
      filterErrors(validationAttempt);
    });

    return {
      ok: true as const,
      data: validCart.map((restock) => ({
        ok: true,
        itemId: restock.data!.id,
        total: restock.data!.consumable!.total + restock.quantity,
        available: restock.data!.consumable!.available + restock.quantity,
      })),
    };
  } catch (error) {
    if (error instanceof Error && "items" in error) {
      return { ok: false as const, failures: error.items };
    }
    const prismaError = error as PrismaClientKnownRequestError;
    return {
      ok: false as const,
      failures: prismaError.message,
    };
  }
};

const updateConsumable = async (
  tx: ExtendedTransactionClient,
  restock: CartItem,
) => {
  try {
    await tx.consumable.update({
      where: { itemId: restock.itemId },
      data: {
        available: { increment: restock.quantity },
        total: { increment: restock.quantity },
      },
    });

    return {
      ok: true as const,
      itemId: restock.itemId,
    };
  } catch (error) {
    const prismaError = error as PrismaClientKnownRequestError;

    if (prismaError.code === "P2025") {
      return {
        ok: false as const,
        itemId: restock.itemId,
        message: `Consumable Not Found with itemId ${restock.itemId} not found`,
      };
    }

    return {
      ok: false as const,
      itemId: restock.itemId,
      message: prismaError.message,
    };
  }
};
