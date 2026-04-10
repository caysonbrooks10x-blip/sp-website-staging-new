"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Link2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/claw/hub", label: "Hub", icon: LayoutDashboard },
  { href: "/claw/pair", label: "Pair", icon: Link2 },
  { href: "/claw/schedule", label: "Schedule", icon: Clock },
] as const;

export function ClawSubNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Claw sections"
      className={cn(
        "flex w-full flex-wrap gap-1 rounded-2xl border border-white/[0.07] bg-black/35 p-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] ring-1 ring-inset ring-white/[0.04] backdrop-blur-xl",
        className
      )}
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.16em] transition-[color,background-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              active
                ? "bg-white/[0.13] text-white shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset] ring-1 ring-white/12"
                : "text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200"
            )}
          >
            <Icon className={cn("h-3.5 w-3.5 shrink-0 opacity-80", active && "text-teal-300/90")} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
