"use client";

import { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { BootstrapData } from "@/lib/bootstrap";
import {
  announcementsKeys,
  eventsKeys,
  pollsKeys,
  homeKeys,
  userKeys,
} from "@/lib/react-query/query-keys";

type BootstrapProviderProps = {
  children: ReactNode;
  bootstrap: BootstrapData;
};

const defaultOptions = {
  queries: {
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (failureCount: number, error: any) => {
      // Don't retry on 401/403 errors
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
  },
};

export function BootstrapProvider({ children, bootstrap }: BootstrapProviderProps) {
  const [client] = useState(() => {
    const queryClient = new QueryClient({ defaultOptions });
    
    const { schoolId } = bootstrap.user;
    
    // Pre-fill the cache with bootstrap data using new query keys
    queryClient.setQueryData(announcementsKeys.all(schoolId), bootstrap.initialData.announcements);
    queryClient.setQueryData(eventsKeys.all(schoolId), bootstrap.initialData.events);
    queryClient.setQueryData(pollsKeys.all(schoolId), bootstrap.initialData.polls);
    queryClient.setQueryData(homeKeys.overview(schoolId), bootstrap.initialData.home);
    
    // Set user data
    queryClient.setQueryData(userKeys.me, bootstrap.user);
    queryClient.setQueryData(userKeys.roles(schoolId), bootstrap.roles);
    queryClient.setQueryData(userKeys.scopes(schoolId), bootstrap.scopes);
    
    return queryClient;
  });

  return (
    <QueryClientProvider client={client}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
