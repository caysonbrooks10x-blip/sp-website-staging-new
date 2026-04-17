"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Video,
  Image as ImageIcon,
  Wand2,
  Film,
  Layers,
  Sparkles,
  GalleryHorizontalEnd,
  Bot,
  CreditCard,
  Users,
  PanelLeftClose,
  PanelLeft,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

export type StudioMode =
  | "text-to-image"
  | "image-to-image"
  | "text-to-video"
  | "image-to-video"
  | "remix";

interface SidebarProps {
  activeMode: StudioMode;
  onModeChange: (mode: StudioMode) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  topOffset?: string;
}

const NAV_SECTIONS = [
  {
    label: "AI VIDEO",
    items: [
      { id: "text-to-video" as StudioMode, label: "Text to Video", icon: Video },
      { id: "image-to-video" as StudioMode, label: "Image to Video", icon: Film },
    ],
  },
  {
    label: "AI IMAGE",
    items: [
      { id: "text-to-image" as StudioMode, label: "Text to Image", icon: ImageIcon },
      { id: "image-to-image" as StudioMode, label: "Image to Image", icon: Layers },
    ],
  },
  {
    label: "REMIX",
    items: [
      { id: "remix" as StudioMode, label: "Remix", icon: Wand2 },
    ],
  },
];

const BOTTOM_LINKS = [
  { href: "/creations", label: "My Creations", icon: GalleryHorizontalEnd },
  { href: "/community", label: "Community", icon: Users },
  { href: "/claw/hub", label: "Claw Bot", icon: Bot },
  { href: "/pricing", label: "Pricing", icon: CreditCard },
];

export function StudioSidebar({ activeMode, onModeChange, collapsed = false, onToggleCollapse, mobileOpen = false, topOffset = "var(--app-nav-height, 96px)" }: SidebarProps) {
  const { credits } = useAuth();
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "flex flex-col bg-[#0a0a0a] border-r border-[#1a1a1a] transition-all duration-300 fixed left-0 z-40 overflow-hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0",
        collapsed ? "w-[210px] lg:w-[60px]" : "w-[210px]"
      )}
      style={{ top: topOffset, height: `calc(100dvh - ${topOffset})` }}
    >
      {/* Header */}
      <div className="flex items-center justify-end px-3 pt-4 pb-2 shrink-0">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 hover:bg-white/5 rounded-md transition-colors cursor-pointer select-none text-zinc-500 hover:text-zinc-300"
        >
          {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Create New Button */}
      <div className="px-3 py-2 shrink-0">
        <button
          onClick={() => onModeChange("text-to-image")}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2 rounded-lg border transition-all duration-200",
            "border-[#c5a44e]/40 bg-[#c5a44e]/10 text-[#c5a44e] hover:bg-[#c5a44e]/20 hover:border-[#c5a44e]/60",
            collapsed && "px-0"
          )}
        >
          <Plus className="w-4 h-4" />
          {!collapsed && <span className="text-sm font-medium">Create New</span>}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-1 py-2 space-y-1">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-2">
            {!collapsed && (
              <div className="px-3 py-1.5 text-[10px] font-semibold tracking-[0.15em] uppercase text-zinc-600">
                {section.label}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activeMode === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onModeChange(item.id)}
                    className={cn(
                      "flex items-center rounded-md transition-all duration-200 relative group w-full",
                      collapsed ? "justify-center px-2 py-2 mx-1" : "gap-2.5 px-3 py-1.5 mx-1",
                      isActive
                        ? "text-[#c5a44e] bg-[#c5a44e]/10 border-l-2 border-[#c5a44e]"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border-l-2 border-transparent"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
                    {!collapsed && <span className="text-sm">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Divider */}
        <div className="border-t border-[#1a1a1a] my-3 mx-2" />

        {/* Bottom Links */}
        <div className="space-y-0.5">
          {BOTTOM_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center rounded-md transition-all duration-200 relative group",
                  collapsed ? "justify-center px-2 py-2 mx-1" : "gap-2.5 px-3 py-1.5 mx-1",
                  isActive
                    ? "text-[#c5a44e] bg-[#c5a44e]/10"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                )}
                title={collapsed ? link.label : undefined}
              >
                <Icon className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
                {!collapsed && <span className="text-sm">{link.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer - Credits */}
      <div className="shrink-0 border-t border-[#1a1a1a] p-3">
        {!collapsed ? (
          <Link
            href="/pricing"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#c5a44e]/10 border border-[#c5a44e]/20 hover:bg-[#c5a44e]/20 transition-all group"
          >
            <Sparkles className="w-4 h-4 text-[#c5a44e]" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#c5a44e]">
                {credits !== null ? credits.toLocaleString() : "..."} Credits
              </span>
              <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400">Upgrade Now</span>
            </div>
          </Link>
        ) : (
          <Link
            href="/pricing"
            className="flex items-center justify-center p-2 rounded-lg bg-[#c5a44e]/10 border border-[#c5a44e]/20 hover:bg-[#c5a44e]/20 transition-all"
            title={`${credits ?? "..."} Credits`}
          >
            <Sparkles className="w-4 h-4 text-[#c5a44e]" />
          </Link>
        )}
      </div>
    </div>
  );
}
