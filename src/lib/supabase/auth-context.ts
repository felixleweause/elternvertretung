import { AsyncLocalStorage } from "node:async_hooks";

type AuthContextValue = {
  accessToken: string;
};

const authContext = new AsyncLocalStorage<AuthContextValue>();

export function withSupabaseAccessToken<T>(
  accessToken: string,
  callback: () => Promise<T>
): Promise<T> {
  return authContext.run({ accessToken }, callback);
}

export function getSupabaseAccessToken(): string {
  const store = authContext.getStore();
  if (!store?.accessToken) {
    throw new Error("Supabase access token missing in auth context");
  }
  return store.accessToken;
}
