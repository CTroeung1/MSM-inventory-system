import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "../../client/trpc";
import SuperJSON from "superjson";

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      transformer: SuperJSON,
      url: "http://localhost:3000/trpc",
    }),
  ],
});

export const MainWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </trpc.Provider>
);

export default MainWrapper;
