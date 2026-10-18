"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
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
  if (hour < 12) return `Good morning, ${first} 🌅`;
  if (hour < 17) return `Good afternoon, ${first} ☀️`;
  return `Good evening, ${first} 🌙`;
}

export function DashboardShell({ staffName, role, propertyId, userId, allStaff, navItems, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const greeting = getGreeting(staffName);

  return (
    <div className="flex min-h-screen bg-background">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 sm:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 flex flex-col border-r border-border bg-surface transition-transform duration-300
        sm:relative sm:translate-x-0 sm:w-60 sm:flex
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"}
      `}>
        <div className="border-b border-border px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-heading text-sm font-semibold">M'Kayla City</p>
            <p className="text-xs text-muted">ApartHotel Console</p>
          </div>
          <button type="button" onClick={() => setSidebarOpen(false)} className="sm:hidden text-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Greeting in sidebar */}
        <div className="px-5 py-3 border-b border-border">
          <p className="text-xs text-accent font-medium">{greeting}</p>
          <p className="text-xs text-muted capitalize mt-0.5">{role.replace("_", " ")}</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`block rounded-md px-3 py-2 text-sm transition-colors hover:bg-surface-raised hover:text-accent
                    ${pathname === item.href ? "bg-surface-raised text-accent font-medium" : "text-foreground"}
                  `}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-border px-5 py-4">
          <p className="text-xs font-medium text-foreground">{staffName}</p>
          <p className="text-xs capitalize text-muted">{role.replace("_", " ")}</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setSidebarOpen(true)} className="sm:hidden text-muted hover:text-foreground" aria-label="Open menu">
              <Menu size={22} />
            </button>
            <p className="font-heading text-sm font-semibold text-foreground hidden sm:block">M'Kayla City ApartHotel</p>
            <p className="text-xs text-accent font-medium sm:hidden">{greeting}</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell staffId={userId} />
            <VoiceMessageButton currentStaffId={userId} propertyId={propertyId} allStaff={allStaff} />
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}