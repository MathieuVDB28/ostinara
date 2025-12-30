"use client";

import { MobileSidebar } from "./mobile-sidebar";
import { logout } from "@/lib/actions/auth";
import { useRouter } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}

interface SidebarWrapperProps {
  navItems: NavItem[];
  userInfo: {
    displayName: string;
    initial: string;
    email: string;
    avatarUrl?: string;
  };
}

export function SidebarWrapper({ navItems, userInfo }: SidebarWrapperProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <MobileSidebar
      navItems={navItems}
      userInfo={userInfo}
      onLogout={handleLogout}
    />
  );
}
