"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Home, Users, BookOpen, Settings, Bell, Mic } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { VoiceMessageButton } from "@/components/voice/voice-message-button";
import type { Role } from "@/lib/auth/roles";

interface Props {
  staffName: string;
  role: Role;
  propertyId: string;
  userId: string;
  allStaff: { id: string; full_name: string; role: string }[];
  navItems: { label: string; href: string }[];
  children: React.ReactNode;
}

function getGreeting(name: string) {
  const hour = new Date().getHours();
  const first = name?.split(" ")[0] ?? name;
  if (hour < 12) return `Good morning, ${first}`;
  if (hour < 17) return `Good afternoon, ${first}`;
  return `Good evening, ${first}`;
}

const BOTTOM_NAV = [
  { icon: Home, label: "Home", href: "/dashboard" },
  { icon: Users, label: "Guests", href: "/dashboard/guests" },
  { icon: BookOpen, label: "Reservations", href: "/dashboard/reservations" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

export function DashboardShell({ staffName, role, propertyId, userId, allStaff, navItems, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const greeting = getGreeting(staffName);

  return (
    <div className="flex min-h-screen bg-background">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 sm:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-72 flex flex-col border-r border-border bg-surface transition-transform duration-300 ease-in-out
        sm:relative sm:translate-x-0 sm:w-64 sm:flex
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"}
      `}>
        {/* Sidebar header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-border">
          <div>
            <p className="font-heading text-base font-bold text-foreground">M'Kayla City</p>
            <p className="text-xs text-muted">ApartHotel</p>
          </div>
          <button type="button" onClick={() => setSidebarOpen(false)} className="sm:hidden w-8 h-8 flex items-center justify-center rounded-full bg-surface-raised text-muted hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Staff greeting */}
        <div className="px-6 py-4 border-b border-border">
          <p className="text-xs text-accent font-semibold">{greeting} 👋</p>
          <p className="text-xs text-muted capitalize mt-0.5">{role.replace("_", " ")}</p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-all
                      ${isActive
                        ? "bg-accent/20 text-accent font-semibold"
                        : "text-muted hover:bg-surface-raised hover:text-foreground"
                      }`}
                  >
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Staff info at bottom */}
        <div className="border-t border-border px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-bold shrink-0">
            {staffName?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{staffName}</p>
            <p className="text-xs text-muted capitalize">{role.replace("_", " ")}</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* Top header */}
        <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="sm:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-surface-raised text-muted hover:text-foreground"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <div className="hidden sm:block">
              <p className="font-heading text-sm font-semibold text-foreground">M'Kayla City ApartHotel</p>
            </div>
            <div className="sm:hidden">
              <p className="text-sm font-semibold text-foreground">M'Kayla City</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <NotificationBell staffId={userId} />
            <VoiceMessageButton currentStaffId={userId} propertyId={propertyId} allStaff={allStaff} />
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6 pb-20 sm:pb-6">
          {children}
        </main>

        {/* Bottom navigation — mobile only */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 sm:hidden border-t border-border bg-surface/95 backdrop-blur-sm">
          <div className="flex items-center justify-around px-2 py-2">
            {BOTTOM_NAV.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                    isActive ? "text-accent" : "text-muted"
                  }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                  <span className="text-xs font-medium">{item.label}</span>
                  {isActive && <span className="w-1 h-1 rounded-full bg-accent" />}
                </Link>
              );
            })}
          </div>
        </nav>

      </div>
    </div>
  );
}