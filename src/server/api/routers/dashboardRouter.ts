// server/trpc/routers/dashboard.ts
import { z } from "zod";
import { userProcedure, router } from "@/server/trpc";
import { prisma } from "@/server/lib/prisma";

export const dashboardRouter = router({
  getLoanHistory: userProcedure
    .input(
      z.object({
        range: z.enum(["week", "month", "year"]),
      }),
    )
    .query(async ({ input }) => {
      const startDate = new Date();
      switch (input.range) {
        case "week":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case "year":
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      const records = await prisma.itemRecord.groupBy({
        by: ["createdAt"],
        _count: { id: true },
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      return records.map((r) => ({
        date: r.createdAt.toISOString().split("T")[0],
        count: r._count.id,
      }));
    }),

  getInventoryByLocation: userProcedure.query(async () => {
    const locations = await prisma.location.findMany({
      include: {
        items: {
          where: { deleted: false },
        },
      },
    });

    return locations.map((location) => ({
      locationName: location.name,
      itemCount: location.items.length,
    }));
  }),

  getTopLoanedItems: userProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(5),
      }),
    )
    .query(async ({ input }) => {
      const items = await prisma.item.findMany({
        take: input.limit,
        include: {
          ItemRecords: {
            where: { loaned: true },
          },
        },
        orderBy: {
          ItemRecords: {
            _count: "desc",
          },
        },
      });

      return items.map((item) => ({
        itemName: item.name,
        loanCount: item.ItemRecords.length,
      }));
    }),

  getItemStatusStats: userProcedure.query(async () => {
    const [total, loaned, available] = await Promise.all([
      prisma.item.count({ where: { deleted: false } }),
      prisma.itemRecord.count({ where: { loaned: true } }),
      prisma.consumable.aggregate({
        _sum: { available: true },
      }),
    ]);

    return {
      total,
      loaned,
      available: available._sum.available ?? 0,
    };
  }),

  getTopTags: userProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(5),
      }),
    )
    .query(async ({ input }) => {
      const tags = await prisma.tag.findMany({
        take: input.limit,
        include: { items: true },
        orderBy: {
          items: {
            _count: "desc",
          },
        },
      });

      return tags.map((tag) => ({
        tagName: tag.name,
        count: tag.items.length,
      }));
    }),
});
