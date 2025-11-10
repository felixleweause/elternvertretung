"use client";

import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
  type DehydratedState,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { ReactNode } from "react";
import { useState } from "react";

type ReactQueryProviderProps = {
  children: ReactNode;
  state?: DehydratedState | null;
};

const defaultOptions = {
  queries: {
    // With SSR, we usually want to set some default staleTime
    // above 0 to avoid refetching immediately on the client
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
    networkMode: 'offlineFirst' as const,
    retry: 1,
  },
};

export function ReactQueryProvider({ children, state }: ReactQueryProviderProps) {
  // Create QueryClient in state to ensure each request has its own cache
  // This prevents data sharing between different users and requests
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions,
      })
  );

  return (
    <QueryClientProvider client={client}>
      <HydrationBoundary state={state ?? undefined}>{children}</HydrationBoundary>
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
