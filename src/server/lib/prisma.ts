import { PrismaClient, Prisma } from "@prisma/client";

function getFourCharHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash += str.charCodeAt(i) * (i + 1);
  }
  hash = (hash * 31) % 65536;
  return hash.toString(16).padStart(4, "0").toUpperCase().slice(-4);
}

type ItemCreateSerialInput = Omit<Prisma.ItemCreateInput, "serial"> & {
  serial?: never; // Explicitly disallow serial in the input
};
type ItemUncheckedCreateSerialInput = Omit<
  Prisma.ItemUncheckedCreateInput,
  "serial"
> & {
  serial?: never; // Explicitly disallow serial in the input
};

// Initialize base Prisma Client
const basePrisma = new PrismaClient();

export const prisma = basePrisma.$extends({
  model: {
    item: {
      async createSerial(
        args: Omit<Prisma.ItemCreateArgs, "data"> & {
          data: Prisma.XOR<
            ItemCreateSerialInput,
            ItemUncheckedCreateSerialInput
          >;
        },
      ) {
        return await prisma.item.count().then(
          async (x) =>
            await prisma.item.create({
              ...args,
              data: {
                ...args.data,
                serial: `${getFourCharHash(args.data.name)}${(x + 1).toString().padStart(4, "0")}`,
              },
            }),
        );
      },
    },
  },
});
