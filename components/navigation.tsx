"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, User, FileUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(
        ({ data: { user } }: { data: { user: { email?: string } | null } }) => {
          setUserEmail(user?.email || null);
        },
      );
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/allocation", label: "Allocate" },
    { href: "/management", label: "Management" },
    { href: "/import-history", label: "Import History" },
    { href: "/forecast", label: "Forecast" },
  ];

  // Don't show navigation on login page
  if (pathname === "/login") {
    return null;
  }

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Title */}
          <div className="text-xl font-bold text-foreground">
            Container System
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link key={link.href} href={link.href}>
                  <Button variant={isActive ? "default" : "ghost"} size="sm">
                    {link.label}
                  </Button>
                </Link>
              );
            })}

            {/* Alokasi Bongkaran Button */}
            <Link href="/management?tab=bulk">
              <Button variant="ghost" size="sm">
                <FileUp className="h-4 w-4 mr-2" />
                Alokasi Bongkaran
              </Button>
            </Link>

            {/* User Menu */}
            {userEmail && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    Account
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {userEmail}
                  </div>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
