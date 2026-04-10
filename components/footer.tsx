"use client"

import Link from "next/link"
import { ASSET_BASE } from "@/lib/assets"

export function Footer() {
  return (
    <footer
      className="relative bg-background border-t border-white/5 py-8 overflow-hidden z-40"
    >
      { }
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${ASSET_BASE}/footer.jpg)` }}
      />
      <div className="absolute inset-0 bg-background/85" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-accent/4 via-background to-background pointer-events-none" />

      { }
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-4">
          { }
          <div className="flex flex-col items-center md:items-start gap-2">
            <Link href="/" className="flex items-center group">
              <img
                src="/brand/studiox-lockup.png"
                alt="StudioX"
                draggable="false"
                className="h-12 w-auto object-contain opacity-80 group-hover:opacity-100 transition-all select-none z-10"
              />
            </Link>

            <p className="text-[10px] text-muted-foreground text-center md:text-left">
              AI tools for modern creators.
            </p>
          </div>

          { }
          <nav>
            <ul className="flex items-center gap-6">
              {[
                { label: "Studio", href: "/studio" },
                { label: "Community", href: "/community" },
                { label: "Pricing", href: "/pricing" }
              ].map(item => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-[11px] font-medium text-muted-foreground hover:text-white transition-colors uppercase tracking-wider"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        { }
        <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-muted-foreground/60">
          <p>© {new Date().getFullYear()} StudioX Inc.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
