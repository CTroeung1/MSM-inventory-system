import { router, userProcedure } from "@/server/trpc";
import { prisma } from "@/server/lib/prisma";
import { z } from "zod";
import { getBaseUrl } from "@/lib/utils";

export const qrRouter = router({
  generateUrl: userProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ input }) => {
      //TODO: Make this generate location qr codes
      const item = await prisma.item.findUnique({ where: { id: input.id } });
      if (item) return `${getBaseUrl()}qr/${item.id}`;
      else
        return {
          ok: false as const,
          error: `Item not found`,
        };
    }),
  translatePath: userProcedure
    .input(z.object({ path: z.string() }))
    .query(({ input }) => {
      //TODO: Make this handle location qr codes
      return `/item/${input.path.split("/")[0]}`;
    }),

  scan: userProcedure
    .input(z.object({ url: z.string() }))
    .query(async ({ input }) => {
      const arr = input.url.split("/");
      const item = await prisma.item.findUnique({
        where: { id: arr[arr.length - 1] },
        include: {
          location: true,
          tags: true,
          consumable: true,
          ItemRecords: true,
        },
      });
      console.log(item);
      if (item) {
        console.log("Item sent");
        return item;
      } else
        return {
          ok: false as const,
          error: `Item not found`,
        };
    }),
});
