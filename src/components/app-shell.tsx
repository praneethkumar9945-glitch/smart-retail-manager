import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  ShoppingCart,
  ReceiptText,
  Boxes,
  Users,
  Settings,
  Store,
  LogOut,
  Menu,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SessionInfo = {
  user: User;
  name: string;
  role: "admin" | "cashier" | "staff" | "";
};

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, admin: false },
  { to: "/pos", label: "New Sale", icon: ShoppingCart, admin: false },
  { to: "/bills", label: "Bills", icon: ReceiptText, admin: false },
  { to: "/inventory", label: "Inventory", icon: Boxes, admin: true },
  { to: "/staff", label: "Staff", icon: Users, admin: true },
  { to: "/settings", label: "Settings", icon: Settings, admin: true },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!data.user) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", data.user.id).single(),
        supabase.from("user_roles").select("role").eq("user_id", data.user.id),
      ]);
      if (cancelled) return;
      setSession({
        user: data.user,
        name: profileRes.data?.full_name || data.user.email || "Team member",
        role: (rolesRes.data?.[0]?.role as SessionInfo["role"]) ?? "",
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const signOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }, [queryClient, navigate]);

  const isAdmin = session?.role === "admin";
  const items = NAV.filter((n) => !n.admin || isAdmin);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-sidebar text-sidebar-foreground md:flex no-print">
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Store className="size-5" />
          </div>
          <div>
            <p className="font-display text-sm font-semibold leading-tight">Smart Retail</p>
            <p className="text-xs text-sidebar-foreground/70">Manager</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((item) => {
            const active =
              pathname === item.to ||
              (item.to === "/bills" && pathname.startsWith("/bills"));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border px-5 py-4">
          <p className="truncate text-sm font-medium">{session?.name ?? "…"}</p>
          <div className="mt-1 flex items-center gap-2">
            {session?.role ? (
              <Badge className="capitalize" variant="secondary">
                {session.role}
              </Badge>
            ) : null}
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden no-print">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <Menu className="size-5" />
          </Button>
          <span className="font-display text-sm font-semibold">Smart Retail</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={signOut}
          aria-label="Sign out"
        >
          <LogOut className="size-5" />
        </Button>
      </div>
      {mobileNavOpen ? (
        <nav className="sticky top-[52px] z-30 grid grid-cols-3 gap-1 bg-sidebar px-2 py-2 md:hidden no-print">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileNavOpen(false)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium",
                pathname === item.to
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}

      {/* Main */}
      <main className="min-h-screen md:ml-60">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>

      {/* Desktop sign out */}
      <div className="fixed bottom-5 left-0 hidden w-60 justify-center md:flex no-print">
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
