import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";
import { collectParent } from "../location.path.ts";
import prismaMock from "@/server/lib/__mocks__/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

describe("collectParent", () => {
  // Set seed for consistent test results
  faker.seed(12345);

  // Generate UUIDs
  const ROOT_ID = faker.string.uuid();
  const PARENT_ID = faker.string.uuid();
  const CHILD_ID = faker.string.uuid();
  const GRANDCHILD_ID = faker.string.uuid();
  const WAREHOUSE_ID = faker.string.uuid();
  const ZONE_ID = faker.string.uuid();
  const AISLE_ID = faker.string.uuid();
  const RACK_ID = faker.string.uuid();
  const SHELF_ID = faker.string.uuid();
  const BIN_ID = faker.string.uuid();

  // Happy Path Tests
  describe("Happy Path", () => {
    it("should return single name for root location", async () => {
      // Generate test data
      const rootName = faker.word.noun();

      prismaMock.location.findUniqueOrThrow.mockResolvedValueOnce({
        id: ROOT_ID,
        name: rootName,
        parentId: null,
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
      });

      const result = await collectParent(ROOT_ID);

      expect(result).toBe(rootName);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaMock.location.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: ROOT_ID },
        select: {
          id: true,
          name: true,
          parentId: true,
        },
      });
    });

    it("should return two-level path", async () => {
      // Generate test data
      const rootName = faker.word.noun();
      const childName = faker.word.noun();

      prismaMock.location.findUniqueOrThrow
        .mockResolvedValueOnce({
          id: CHILD_ID,
          name: childName,
          parentId: ROOT_ID,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        })
        .mockResolvedValueOnce({
          id: ROOT_ID,
          name: rootName,
          parentId: null,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        });

      const result = await collectParent(CHILD_ID);

      expect(result).toBe(`${rootName}/${childName}`);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaMock.location.findUniqueOrThrow).toHaveBeenCalledTimes(2);
    });

    it("should return three-level path", async () => {
      // Generate test data
      const rootName = faker.word.noun();
      const parentName = faker.word.noun();
      const grandchildName = faker.word.noun();

      prismaMock.location.findUniqueOrThrow
        .mockResolvedValueOnce({
          id: GRANDCHILD_ID,
          name: grandchildName,
          parentId: PARENT_ID,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        })
        .mockResolvedValueOnce({
          id: PARENT_ID,
          name: parentName,
          parentId: ROOT_ID,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        })
        .mockResolvedValueOnce({
          id: ROOT_ID,
          name: rootName,
          parentId: null,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        });

      const result = await collectParent(GRANDCHILD_ID);

      expect(result).toBe(`${rootName}/${parentName}/${grandchildName}`);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaMock.location.findUniqueOrThrow).toHaveBeenCalledTimes(3);
    });

    it("should handle deep hierarchy (6 levels)", async () => {
      // Generate test data
      const warehouseName = faker.word.noun();
      const zoneName = `zone-${faker.string.alpha({ length: 1, casing: "lower" })}`;
      const aisleName = `aisle-${faker.number.int({ min: 1, max: 10 })}`;
      const rackName = `rack-${faker.number.int({ min: 1, max: 10 })}`;
      const shelfName = `shelf-${faker.number.int({ min: 1, max: 10 })}`;
      const binName = `bin-${faker.number.int({ min: 1, max: 10 })}`;

      prismaMock.location.findUniqueOrThrow
        .mockResolvedValueOnce({
          id: BIN_ID,
          name: binName,
          parentId: SHELF_ID,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        })
        .mockResolvedValueOnce({
          id: SHELF_ID,
          name: shelfName,
          parentId: RACK_ID,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        })
        .mockResolvedValueOnce({
          id: RACK_ID,
          name: rackName,
          parentId: AISLE_ID,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        })
        .mockResolvedValueOnce({
          id: AISLE_ID,
          name: aisleName,
          parentId: ZONE_ID,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        })
        .mockResolvedValueOnce({
          id: ZONE_ID,
          name: zoneName,
          parentId: WAREHOUSE_ID,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        })
        .mockResolvedValueOnce({
          id: WAREHOUSE_ID,
          name: warehouseName,
          parentId: null,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        });

      const result = await collectParent(BIN_ID);

      expect(result).toBe(
        `${warehouseName}/${zoneName}/${aisleName}/${rackName}/${shelfName}/${binName}`,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaMock.location.findUniqueOrThrow).toHaveBeenCalledTimes(6);
    });

    it("should handle special characters in names", async () => {
      const SPECIAL_WAREHOUSE_ID = faker.string.uuid();
      const SPECIAL_ZONE_ID = faker.string.uuid();
      const SPECIAL_AISLE_ID = faker.string.uuid();

      // Generate test data with special characters
      const warehouseName = `${faker.word.adjective()}-warehouse`;
      const zoneName = `zone_${faker.string.alpha({ length: 1, casing: "lower" })}`;
      const aisleName = `aisle-${faker.number.float({ min: 1, max: 10, fractionDigits: 1 })}`;

      prismaMock.location.findUniqueOrThrow
        .mockResolvedValueOnce({
          id: SPECIAL_AISLE_ID,
          name: aisleName,
          parentId: SPECIAL_ZONE_ID,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        })
        .mockResolvedValueOnce({
          id: SPECIAL_ZONE_ID,
          name: zoneName,
          parentId: SPECIAL_WAREHOUSE_ID,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        })
        .mockResolvedValueOnce({
          id: SPECIAL_WAREHOUSE_ID,
          name: warehouseName,
          parentId: null,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        });

      const result = await collectParent(SPECIAL_AISLE_ID);

      expect(result).toBe(`${warehouseName}/${zoneName}/${aisleName}`);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaMock.location.findUniqueOrThrow).toHaveBeenCalledTimes(3);
    });

    it("should handle single character names", async () => {
      const A_ID = faker.string.uuid();
      const B_ID = faker.string.uuid();
      const C_ID = faker.string.uuid();

      // Generate single character names
      const nameA = faker.string.alpha({ length: 1, casing: "upper" });
      const nameB = faker.string.alpha({ length: 1, casing: "upper" });
      const nameC = faker.string.alpha({ length: 1, casing: "upper" });

      prismaMock.location.findUniqueOrThrow
        .mockResolvedValueOnce({
          id: C_ID,
          name: nameC,
          parentId: B_ID,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        })
        .mockResolvedValueOnce({
          id: B_ID,
          name: nameB,
          parentId: A_ID,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        })
        .mockResolvedValueOnce({
          id: A_ID,
          name: nameA,
          parentId: null,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        });

      const result = await collectParent(C_ID);

      expect(result).toBe(`${nameA}/${nameB}/${nameC}`);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaMock.location.findUniqueOrThrow).toHaveBeenCalledTimes(3);
    });

    it("should handle long location names", async () => {
      const LONG_WAREHOUSE_ID = faker.string.uuid();
      const LONG_ZONE_ID = faker.string.uuid();
      const LEAF_ID = faker.string.uuid();

      // Generate long names
      const warehouseName = `${faker.word.adjective()}-${faker.word.adjective()}-${faker.word.noun()}-name`;
      const zoneName = `extremely-${faker.word.adjective()}-${faker.word.noun()}-name`;
      const leafName = faker.word.noun();

      prismaMock.location.findUniqueOrThrow
        .mockResolvedValueOnce({
          id: LEAF_ID,
          name: leafName,
          parentId: LONG_ZONE_ID,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        })
        .mockResolvedValueOnce({
          id: LONG_ZONE_ID,
          name: zoneName,
          parentId: LONG_WAREHOUSE_ID,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        })
        .mockResolvedValueOnce({
          id: LONG_WAREHOUSE_ID,
          name: warehouseName,
          parentId: null,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        });

      const result = await collectParent(LEAF_ID);

      expect(result).toBe(`${warehouseName}/${zoneName}/${leafName}`);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaMock.location.findUniqueOrThrow).toHaveBeenCalledTimes(3);
    });
  });

  // Error Handling Tests
  describe("Error Handling", () => {
    it("should handle location not found (P2025 error)", async () => {
      const INVALID_ID = faker.string.uuid();

      const notFoundError = new PrismaClientKnownRequestError(
        "Record to find not found",
        {
          code: "P2025",
          clientVersion: "5.0.0",
        },
      );

      prismaMock.location.findUniqueOrThrow.mockRejectedValueOnce(
        notFoundError,
      );

      const result = await collectParent(INVALID_ID);

      expect(result).toEqual({
        ok: false,
        message: "Location is invalid",
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaMock.location.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: INVALID_ID },
        select: {
          id: true,
          name: true,
          parentId: true,
        },
      });
    });

    it("should handle database connection error (P1001 error)", async () => {
      const connectionError = new PrismaClientKnownRequestError(
        "Can't reach database server",
        {
          code: "P1001",
          clientVersion: "5.0.0",
        },
      );

      prismaMock.location.findUniqueOrThrow.mockRejectedValueOnce(
        connectionError,
      );

      const result = await collectParent(ROOT_ID);

      expect(result).toEqual({
        ok: false,
        message: "Can't reach database server",
      });
    });

    it("should handle foreign key constraint error (P2003 error)", async () => {
      const constraintError = new PrismaClientKnownRequestError(
        "Foreign key constraint failed on the field: `parentId`",
        {
          code: "P2003",
          clientVersion: "5.0.0",
        },
      );

      prismaMock.location.findUniqueOrThrow.mockRejectedValueOnce(
        constraintError,
      );

      const result = await collectParent(ROOT_ID);

      expect(result).toEqual({
        ok: false,
        message: "Foreign key constraint failed on the field: `parentId`",
      });
    });

    it("should handle error during traversal of valid hierarchy", async () => {
      // Generate test data
      const childName = faker.word.noun();

      // First call succeeds, second call fails
      prismaMock.location.findUniqueOrThrow
        .mockResolvedValueOnce({
          id: CHILD_ID,
          name: childName,
          parentId: ROOT_ID,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        })
        .mockRejectedValueOnce(
          new PrismaClientKnownRequestError("Database connection lost", {
            code: "P1017",
            clientVersion: "5.0.0",
          }),
        );

      const result = await collectParent(CHILD_ID);

      expect(result).toEqual({
        ok: false,
        message: "Database connection lost",
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaMock.location.findUniqueOrThrow).toHaveBeenCalledTimes(2);
    });

    it("should handle timeout error (P1008 error)", async () => {
      const timeoutError = new PrismaClientKnownRequestError(
        "Operations timed out",
        {
          code: "P1008",
          clientVersion: "5.0.0",
        },
      );

      prismaMock.location.findUniqueOrThrow.mockRejectedValueOnce(timeoutError);

      const result = await collectParent(ROOT_ID);

      expect(result).toEqual({
        ok: false,
        message: "Operations timed out",
      });
    });
  });
});
