import { APIError, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/server/lib/prisma";
import { admin, customSession } from "better-auth/plugins";
export const auth = betterAuth({
  plugins: [
    customSession(async ({ user, session }) => {
      const role = await prisma.user
        .findUnique({ where: { id: user.id } })
        .then((x) => x?.role);
      return {
        user: {
          ...user,
          role: role,
        },
        session,
      };
    }),
    admin(),
  ],
  emailAndPassword: {
    enabled: false,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const email = user.email?.toLowerCase() ?? "";

          if (!(process.env.ALLOWED_EMAILS ?? "").split(",").includes(email)) {
            // Your special condition.
            // Send the API error.
            throw new APIError("BAD_REQUEST", {
              message: "User not allowed to use platform.",
            });
          }
          return {
            data: user,
          };
        },
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: [process.env.FRONTEND_URL ?? "http://localhost:5173"],
});
