"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type SupabaseContextType = {
  supabase: ReturnType<typeof getBrowserSupabaseClient>;
  user: User | null;
};

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

type SupabaseProviderProps = {
  children: React.ReactNode;
  initialUser: User | null;
};

export function SupabaseProvider({
  children,
  initialUser,
}: SupabaseProviderProps) {
  const [supabase] = useState(() => getBrowserSupabaseClient());
  const [user, setUser] = useState<User | null>(initialUser);

  const refreshUser = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();
    setUser(error ? null : data.user);
  }, [supabase]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refreshUser();
    });

    return () => subscription.unsubscribe();
  }, [supabase, refreshUser]);

  return (
    <SupabaseContext.Provider value={{ supabase, user }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error("useSupabase must be used within a SupabaseProvider");
  }
  return context;
};
