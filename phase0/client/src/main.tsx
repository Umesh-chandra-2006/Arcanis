import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import superjson from "superjson";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext";
import { getFingerprint } from "./lib/fingerprint";

const queryClient = new QueryClient();

const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || "/api/trpc";

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: apiUrl,
      transformer: superjson,
      // The session is an httpOnly cookie; the fingerprint feeds the signup-grant check.
      async headers() {
        const fp = await getFingerprint();
        return fp ? { "x-arc-fp": fp } : {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </trpc.Provider>
);