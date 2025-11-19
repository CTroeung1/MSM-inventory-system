import { router, userProcedure } from "@/server/trpc";
import { prisma } from "@/server/lib/prisma";
import { z } from "zod";
import { userInput, userUpdateInput } from "@/server/schema/user.schema";

export const userRouter = router({
  create: userProcedure.input(userInput).mutation(async ({ input }) => {
    return prisma.user.create({
      data: input,
    });
  }),

  get: userProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ input }) => {
      return prisma.user.findUnique({
        where: { id: input.id },
        include: {
          group: true,
          ItemRecords: true,
        },
      });
    }),

  update: userProcedure
    .input(z.object({ id: z.uuid(), data: userUpdateInput }))
    .mutation(async ({ input }) => {
      return prisma.user.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  delete: userProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ input }) => {
      return prisma.user.delete({
        where: { id: input.id },
      });
    }),

  list: userProcedure.query(async () => {
    return prisma.user.findMany({
      include: {
        group: true,
        ItemRecords: true,
      },
    });
  }),
});
