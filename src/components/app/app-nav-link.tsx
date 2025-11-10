"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useCallback } from "react";
import type { ComponentProps, ReactNode } from "react";

type AppNavLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  onPrefetch?: () => void | Promise<void>;
} & Omit<ComponentProps<typeof Link>, "href" | "prefetch">;

export function AppNavLink({ href, children, className, onPrefetch, ...linkProps }: AppNavLinkProps) {
  const router = useRouter();
  const hasPrefetched = useRef(false);

  const triggerPrefetch = useCallback(() => {
    if (hasPrefetched.current) return;
    console.log(`🚀 Prefetching route: ${href}`);
    router.prefetch(href);
    if (onPrefetch) {
      console.log(`📦 Prefetching data for: ${href}`);
      onPrefetch();
    }
    hasPrefetched.current = true;
    console.log(`✅ Prefetching completed for: ${href}`);
  }, [href, onPrefetch, router]);

  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={triggerPrefetch}
      onFocus={triggerPrefetch}
      onTouchStart={triggerPrefetch}
      className={className}
      {...linkProps}
    >
      {children}
    </Link>
  );
}
