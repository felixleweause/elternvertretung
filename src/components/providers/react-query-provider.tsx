"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { ReactNode } from "react";
import { useState } from "react";

type ReactQueryProviderProps = {
  children: ReactNode;
};

const defaultOptions = {
  queries: {
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  },
};

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions,
      })
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
