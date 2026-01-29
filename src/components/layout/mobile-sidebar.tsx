"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserProfileModal } from "@/components/profile/user-profile-modal";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}

interface MobileSidebarProps {
  navItems: NavItem[];
  userInfo: {
    displayName: string;
    initial: string;
    email: string;
    avatarUrl?: string;
  };
  onLogout: () => void;
}

function GuitarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M19.5 3.5L20.5 4.5M20.5 4.5L21.5 3.5M20.5 4.5V7M14.5 9.5L17 7M17 7H20.5M17 7L14.5 4.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 10C12 10 10.5 11.5 9.5 12.5C8.5 13.5 7 15 7 17C7 19.2091 8.79086 21 11 21C13 21 14.5 19.5 15.5 18.5C16.5 17.5 18 16 18 14C18 12 16.5 10.5 15 9C13.5 7.5 12 6 12 4" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="11" cy="17" r="1.5"/>
    </svg>
  );
}

function NavIcon({ icon, className }: { icon: string; className?: string }) {
  switch (icon) {
    case "library":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 19.5V4.5C4 3.67 4.67 3 5.5 3H18.5C19.33 3 20 3.67 20 4.5V19.5C20 20.33 19.33 21 18.5 21H5.5C4.67 21 4 20.33 4 19.5Z" strokeLinecap="round"/>
          <path d="M8 7H16M8 11H16M8 15H12" strokeLinecap="round"/>
        </svg>
      );
    case "chart":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 3V21H21" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 16L11 11L15 14L21 7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case "video":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="M10 9L15 12L10 15V9Z" fill="currentColor" stroke="none"/>
        </svg>
      );
    case "users":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="9" cy="7" r="3"/>
          <path d="M3 21V18C3 16.34 4.34 15 6 15H12C13.66 15 15 16.34 15 18V21"/>
          <circle cx="17" cy="8" r="2.5"/>
          <path d="M21 21V18.5C21 17.12 20.12 16 18.75 15.75"/>
        </svg>
      );
    case "feed":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9H21M9 21V9" strokeLinecap="round"/>
        </svg>
      );
    case "setlist":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
          <path strokeLinecap="round" d="M9 12h6M9 16h4"/>
        </svg>
      );
    case "trophy":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h12v2a6 6 0 01-12 0V4z"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6H4a1 1 0 00-1 1v1a3 3 0 003 3h.5"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 6h2a1 1 0 011 1v1a3 3 0 01-3 3h-.5"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 16h6v4H9z"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v4"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 20h10"/>
        </svg>
      );
    case "metronome":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v4"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 21l2-14h4l2 14H8z"/>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18l-4-10" strokeWidth="2"/>
          <circle cx="12" cy="7" r="1" fill="currentColor"/>
          <path strokeLinecap="round" d="M6 21h12"/>
        </svg>
      );
    default:
      return null;
  }
}

export function MobileSidebar({ navItems, userInfo, onLogout }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const pathname = usePathname();

  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Header */}
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        {/* Burger button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent"
          aria-label="Toggle menu"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center">
            <Image
              src="/logo.png"
              alt="Ostinara"
              width={36}
              height={36}
              className="rounded-lg"
            />
          </div>
          <span className="text-xl font-bold">Ostinara</span>
        </div>
      </header>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-border bg-card transition-transform duration-300 lg:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4 pt-20">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <NavIcon icon={item.icon} className="h-5 w-5" />
                <span>{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className={`ml-auto rounded-full px-1.5 py-0.5 text-xs font-medium ${
                    isActive ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-border p-4">
          <button
            onClick={() => setIsProfileOpen(true)}
            className="mb-3 flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent"
          >
            {userInfo.avatarUrl ? (
              <img
                src={userInfo.avatarUrl}
                alt={userInfo.displayName}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                {userInfo.initial}
              </div>
            )}
            <div className="flex-1 truncate">
              <div className="truncate text-sm font-medium">
                {userInfo.displayName}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {userInfo.email}
              </div>
            </div>
            <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={onLogout}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
}
