import { createItem, type Item } from "@/server/lib/dbMockFactory";

interface CartItemMock extends Item {
  quantity: number;
}

interface CartValidationResponse {
  ok: true;
  quantity: number;
  data: Item;
}

export const createCartItem = (overrides = {}): CartItemMock => {
  return {
    ...createItem(),
    quantity: 1,
    ...overrides,
  };
};

export const createOkValidationResponse = (
  overrides: Partial<CartValidationResponse> = {},
): CartValidationResponse => {
  return {
    ok: true as const,
    data: createItem({
      isConsumable: true,
    }),
    quantity: 1,
    ...overrides,
  };
};

export type { CartItemMock, CartValidationResponse };
