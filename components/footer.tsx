"use client"

import Link from "next/link"

export function Footer() {
  return (
    <footer
      className="relative bg-background border-t border-white/5 py-8 overflow-hidden z-40"
    >
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/footer.jpg)" }}
      />
      <div className="absolute inset-0 bg-background/85" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-accent/4 via-background to-background pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-4">
          {/* Brand */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-6 h-6 bg-foreground text-background rounded-md flex items-center justify-center font-bold text-xs transition-transform duration-300 group-hover:scale-105">
                S
              </div>
              <span className="text-base font-bold font-serif tracking-tight">
                StudioX
              </span>
            </Link>

            <p className="text-[10px] text-muted-foreground hidden sm:block border-l border-white/10 pl-4 ml-2">
              AI tools for modern creators.
            </p>
          </div>

          {/* Navigation */}
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

        {/* Bottom bar */}
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