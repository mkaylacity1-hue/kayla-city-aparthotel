"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { canAccess, type Module, type Role } from "@/lib/auth/roles";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { VoiceMessageButton } from "@/components/voice/voice-message-button";
import { Menu, X } from "lucide-react";

const NAV_ITEMS: { label: string; href: string; module: Module }[] = [
  { label: "Dashboard", href: "/dashboard", module: "dashboard" },
  { label: "Staff", href: "/dashboard/staff", module: "staff" },
  { label: "Units", href: "/dashboard/units", module: "rooms" },
  { label: "Pricing", href: "/dashboard/pricing", module: "pricing" },
  { label: "Guests", href: "/dashboard/guests", module: "guests" },
  { label: "Reservations", href: "/dashboard/reservations", module: "reservations" },
  { label: "Breakfast Orders", href: "/dashboard/breakfast", module: "dashboard" },
  { label: "Breakfast Menu", href: "/dashboard/breakfast/manage", module: "dashboard" },
  { label: "Bar", href: "/dashboard/bar", module: "dashboard" },
  { label: "Inventory", href: "/dashboard/inventory", module: "dashboard" },
  { label: "Tasks", href: "/dashboard/tasks", module: "tasks" },
  { label: "Housekeeping", href: "/dashboard/housekeeping-tasks", module: "housekeeping_tasks" },
  { label: "Gate Log", href: "/dashboard/gate-log", module: "gate_log" },
  { label: "Shift Reports", href: "/dashboard/shift-reports", module: "shift_reports" },
  { label: "Settings", href: "/dashboard/settings", module: "settings" },
];

function getGreeting(name: string) {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name} 🌅`;
  if (hour < 17) return `Good afternoon, ${name} ☀️`;
  return `Good evening, ${name} 🌙`;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [staffRow, setStaffRow] = useState<any>(null);
  const [userId, setUserId] = useState<string>("");
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      setUserId(user.id);

      const { data: me } = await supabase
        .from("staff")
        .select("full_name, role, is_active, property_id")
        .eq("id", user.id)
        .single();

      if (!me || !me.is_active) { window.location.href = "/login?error=not_provisioned"; return; }
      setStaffRow(me);

      const { data: staff } = await supabase
        .from("staff")
        .select("id, full_name, role")
        .eq("property_id", me.property_id)
        .eq("is_active", true)
        .neq("id", user.id);

      setAllStaff(staff ?? []);
    }
    load();
  }, []);

  if (!staffRow) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  const role = staffRow.role as Role;
  const visibleNavItems = NAV_ITEMS.filter((item) => canAccess(role, item.module));
  const firstName = staffRow.full_name?.split(" ")[0] ?? staffRow.full_name;
  const greeting = getGreeting(firstName);

  return (
    <div className="flex min-h-screen bg-background">

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 flex-col border-r border-border bg-surface transition-transform duration-300
        sm:relative sm:flex sm:translate-x-0 sm:w-60
        ${sidebarOpen ? "flex translate-x-0" : "-translate-x-full sm:translate-x-0"}
      `}>
        <div className="border-b border-border px-5 py-5 flex items-center justify-between">
          <div>
            <p className="font-heading text-sm font-semibold">M'Kayla City</p>
            <p className="text-xs text-muted">ApartHotel Console</p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="sm:hidden text-muted hover:text-foreground"
          >
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
            {visibleNavItems.map((item) => (
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
          <p className="text-xs font-medium text-foreground">{staffRow.full_name}</p>
          <p className="text-xs capitalize text-muted">{role.replace("_", " ")}</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Hamburger menu button — mobile only */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="sm:hidden text-muted hover:text-foreground"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <p className="font-heading text-sm font-semibold text-foreground hidden sm:block">
              M'Kayla City ApartHotel
            </p>
            {/* Greeting in header — mobile only */}
            <p className="text-xs text-accent font-medium sm:hidden">{greeting}</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell staffId={userId} />
            {staffRow.property_id && (
              <VoiceMessageButton
                currentStaffId={userId}
                propertyId={staffRow.property_id}
                allStaff={allStaff}
              />
            )}
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>

        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}