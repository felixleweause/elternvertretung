import type { ReactNode } from "react";
import { ReactQueryProvider } from "@/components/providers/react-query-provider";

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return <ReactQueryProvider>{children}</ReactQueryProvider>;
}
