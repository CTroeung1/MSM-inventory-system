import { describe, it, vi, expect, beforeEach } from "vitest";
import { faker } from "@faker-js/faker";
import { DatabaseMockFactory, type Item } from "@/server/lib/dbMockFactory";
import {
  createOkValidationResponse,
  type CartValidationResponse,
} from "../../item/test/mockTestTypes";
import type { CartItem } from "../../item/item.utils";
import { consumableRestock } from "../consumable.restock";
import { validateCart } from "../../item/item.utils";
import prismaMock from "@/server/lib/__mocks__/prisma";
import { createValidationError } from "../../endpoint.utils";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

vi.mock("../../item/item.utils");

const validateCartMock = (data: CartValidationResponse[]) => {
  vi.mocked(validateCart).mockResolvedValueOnce(data);
};

const validateCartErrorMock = (error: unknown) => {
  vi.mocked(validateCart).mockRejectedValueOnce(error);
};

describe("Consumable restock tests", () => {
  let mockFactory: DatabaseMockFactory;

  beforeEach(() => {
    // Create a new factory instance for each test with consistent seed
    mockFactory = new DatabaseMockFactory(12345);

    // Ensure transaction mock properly returns callback results
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
  });

  describe("Happy path", () => {
    it("Should restock 1 consumable item", async () => {
      const consumableItem = mockFactory.createConsumableItem({
        consumable: mockFactory.createConsumable(faker.string.uuid(), {
          available: 10,
          total: 50,
        }),
      });

      const cartItem: CartItem = {
        itemId: consumableItem.id,
        quantity: 25,
      };

      const validateCartResponse = createOkValidationResponse({
        quantity: cartItem.quantity,
        data: consumableItem,
      });

      validateCartMock([validateCartResponse]);

      const response = await consumableRestock([cartItem]);

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.data).toHaveLength(1);
        expect(response.data).toEqual([
          {
            ok: true,
            itemId: consumableItem.id,
            total: 75,
            available: 35,
          },
        ]);
      }
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it("Should restock multiple consumable items", async () => {
      const consumable1 = mockFactory.createConsumableItem({
        consumable: mockFactory.createConsumable(faker.string.uuid(), {
          available: 5,
          total: 20,
        }),
      });

      const consumable2 = mockFactory.createConsumableItem({
        consumable: mockFactory.createConsumable(faker.string.uuid(), {
          available: 15,
          total: 30,
        }),
      });

      const cartItem1: CartItem = {
        itemId: consumable1.id,
        quantity: 10,
      };
      const cartItem2: CartItem = {
        itemId: consumable2.id,
        quantity: 20,
      };

      const validateCartResponses = [
        createOkValidationResponse({
          quantity: cartItem1.quantity,
          data: consumable1,
        }),
        createOkValidationResponse({
          quantity: cartItem2.quantity,
          data: consumable2,
        }),
      ];

      validateCartMock(validateCartResponses);

      const response = await consumableRestock([cartItem1, cartItem2]);

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.data).toHaveLength(2);
        expect(response.data).toEqual([
          {
            ok: true,
            itemId: consumable1.id,
            total: 30, // 20 + 10
            available: 15, // 5 + 10
          },
          {
            ok: true,
            itemId: consumable2.id,
            total: 50, // 30 + 20
            available: 35, // 15 + 20
          },
        ]);
      }
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error cases", () => {
    it("Should reject empty cart", async () => {
      const response = await consumableRestock([]);

      expect(response.ok).toBe(false);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(0);
    });

    it("Should handle not found error where the item is an asset not a consumable", async () => {
      const assetItem = mockFactory.createAssetItem();

      const cartItem: CartItem = {
        itemId: assetItem.id,
        quantity: 10,
      };

      const validateCartResponse = createOkValidationResponse({
        quantity: cartItem.quantity,
        data: assetItem,
      });

      validateCartMock([validateCartResponse]);

      prismaMock.$transaction.mockRejectedValueOnce(
        new PrismaClientKnownRequestError("Record to update not found.", {
          code: "P2025",
          clientVersion: "5.0.0",
          meta: {
            cause: `Record to update not found. Where: { itemId: "${assetItem.id}" }`,
          },
        }),
      );

      const response = await consumableRestock([cartItem]);

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.failures).toBeDefined();
      }
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it("Should handle validation errors from validateCart", async () => {
      const item = mockFactory.createItem();
      const cartItem: CartItem = {
        itemId: item.id,
        quantity: 1,
      };

      // Mock validateCart to return validation errors
      const error = createValidationError([
        { ok: false as const, error: "Item not found" },
      ]);

      validateCartErrorMock(error);

      const response = await consumableRestock([cartItem]);

      expect(response.ok).toBe(false);
    });

    it("Should handle database transaction errors", async () => {
      const consumableItem = mockFactory.createConsumableItem({
        consumable: mockFactory.createConsumable(faker.string.uuid(), {
          available: 10,
          total: 20,
        }),
      });

      const cartItem: CartItem = {
        itemId: consumableItem.id,
        quantity: 5,
      };

      const validateCartResponse = createOkValidationResponse({
        quantity: cartItem.quantity,
        data: consumableItem,
      });

      validateCartMock([validateCartResponse]);

      // Mock transaction to fail
      const dbError = new Error("Database error");
      dbError.message = "Connection failed";
      prismaMock.$transaction.mockRejectedValueOnce(dbError);

      const response = await consumableRestock([cartItem]);

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.failures).toBe("Connection failed");
      }
    });
  });

  describe("Edge cases", () => {
    it("Should handle restock with quantity of 1", async () => {
      const consumableItem = mockFactory.createConsumableItem({
        consumable: mockFactory.createConsumable(faker.string.uuid(), {
          available: 5,
          total: 20,
        }),
      });

      const cartItem: CartItem = {
        itemId: consumableItem.id,
        quantity: 1,
      };

      const validateCartResponse = createOkValidationResponse({
        quantity: cartItem.quantity,
        data: consumableItem,
      });

      validateCartMock([validateCartResponse]);

      const response = await consumableRestock([cartItem]);

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.data).toHaveLength(1);
        expect(response.data).toEqual([
          {
            ok: true,
            itemId: consumableItem.id,
            total: 21, // 20 + 1
            available: 6, // 5 + 1
          },
        ]);
      }
    });

    it("Should handle large quantity restock", async () => {
      const largeQuantity = 1000;

      const consumableItem = mockFactory.createConsumableItem({
        consumable: mockFactory.createConsumable(faker.string.uuid(), {
          available: 50,
          total: 200,
        }),
      });

      const cartItem: CartItem = {
        itemId: consumableItem.id,
        quantity: largeQuantity,
      };

      const validateCartResponse = createOkValidationResponse({
        quantity: cartItem.quantity,
        data: consumableItem,
      });

      validateCartMock([validateCartResponse]);

      const response = await consumableRestock([cartItem]);

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.data).toHaveLength(1);
        expect(response.data).toEqual([
          {
            ok: true,
            itemId: consumableItem.id,
            total: 1200, // 200 + 1000
            available: 1050, // 50 + 1000
          },
        ]);
      }
    });

    it("Should handle zero quantity restock", async () => {
      const consumableItem = mockFactory.createConsumableItem({
        consumable: mockFactory.createConsumable(faker.string.uuid(), {
          available: 10,
          total: 50,
        }),
      });

      const cartItem: CartItem = {
        itemId: consumableItem.id,
        quantity: 0,
      };

      const validateCartResponse = createOkValidationResponse({
        quantity: cartItem.quantity,
        data: consumableItem,
      });

      validateCartMock([validateCartResponse]);

      const response = await consumableRestock([cartItem]);

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.data).toHaveLength(1);
        expect(response.data).toEqual([
          {
            ok: true,
            itemId: consumableItem.id,
            total: 50, // No change
            available: 10, // No change
          },
        ]);
      }
    });

    it("Should handle multiple restocks of the same item", async () => {
      const consumableItem = mockFactory.createConsumableItem({
        consumable: mockFactory.createConsumable(faker.string.uuid(), {
          available: 10,
          total: 50,
        }),
      });

      const cartItem1: CartItem = {
        itemId: consumableItem.id,
        quantity: 10,
      };
      const cartItem2: CartItem = {
        itemId: consumableItem.id,
        quantity: 15,
      };

      const validateCartResponses = [
        createOkValidationResponse({
          quantity: cartItem1.quantity,
          data: consumableItem,
        }),
        createOkValidationResponse({
          quantity: cartItem2.quantity,
          data: consumableItem,
        }),
      ];

      validateCartMock(validateCartResponses);

      const response = await consumableRestock([cartItem1, cartItem2]);

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.data).toHaveLength(2);
        expect(response.data).toEqual([
          {
            ok: true,
            itemId: consumableItem.id,
            total: 60, // 50 + 10
            available: 20, // 10 + 10
          },
          {
            ok: true,
            itemId: consumableItem.id,
            total: 65, // 50 + 15
            available: 25, // 10 + 15
          },
        ]);
      }
    });
  });

  describe("Performance and stress tests", () => {
    it("Should handle restocking many items efficiently", async () => {
      const itemCount = 50;
      const cartItems: CartItem[] = [];
      const validateResponses: CartValidationResponse[] = [];
      const items: Item[] = [];

      // Create many items
      for (let i = 0; i < itemCount; i++) {
        const item = mockFactory.createConsumableItem({
          consumable: mockFactory.createConsumable(faker.string.uuid(), {
            available: faker.number.int({ min: 0, max: 50 }),
            total: faker.number.int({ min: 50, max: 200 }),
          }),
        });

        items.push(item);
        const quantity = faker.number.int({ min: 1, max: 20 });

        cartItems.push({
          itemId: item.id,
          quantity,
        });

        validateResponses.push(
          createOkValidationResponse({
            quantity,
            data: item,
          }),
        );
      }

      validateCartMock(validateResponses);

      const response = await consumableRestock(cartItems);

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.data).toHaveLength(itemCount);
      }
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
