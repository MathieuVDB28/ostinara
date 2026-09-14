"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function NavigationProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const prevPathname = useRef(pathname);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Detect navigation start via link/button clicks
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#")) return;
      if (href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (href === pathname) return;

      setLoading(true);

      // Safety timeout: hide the bar after 8s if navigation didn't complete
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setLoading(false), 8000);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  // Hide when navigation completes
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setLoading(false);
    }
  }, [pathname]);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[2px] overflow-hidden">
      <div className="animate-nav-progress h-full w-full bg-primary" />
    </div>
  );
}
