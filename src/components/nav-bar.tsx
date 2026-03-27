"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Calendar,
  ShoppingCart,
  Home,
  Package,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/meal-plan", label: "Meal Plan", icon: Calendar },
  { href: "/shopping-list", label: "Shopping", icon: ShoppingCart },
  { href: "/pantry", label: "Pantry", icon: Package },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r bg-card h-screen sticky top-0">
        <div className="p-6 border-b">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-primary">
              Cookbook
            </span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const active =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm transition-colors relative font-hand text-lg",
                  active
                    ? "text-primary font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
                {active && (
                  <span className="absolute bottom-1 left-3 right-3 h-0.5 bg-primary opacity-40 rounded-full" style={{ transform: "rotate(-0.5deg)" }} />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm transition-colors font-hand text-lg",
              pathname.startsWith("/settings")
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-40 safe-area-pb">
        <div className="flex items-center justify-around py-2">
          {links.map((link) => {
            const Icon = link.icon;
            const active =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1 transition-colors relative",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-hand text-xs">{link.label}</span>
                {active && (
                  <span className="absolute -bottom-1 left-2 right-2 h-0.5 rounded-full" style={{ background: "var(--washi-yellow)", opacity: 0.7 }} />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 bg-card border-b px-4 py-3 flex items-center">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-lg font-bold text-primary">
            Cookbook
          </span>
        </Link>
      </header>
    </>
  );
}
