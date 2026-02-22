"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu, X, LogOut, ChevronRight, Sparkles, CreditCard, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/context/auth-context"

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isNavVisible, setIsNavVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const navRef = useRef<HTMLElement>(null)
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 })

  useEffect(() => {
    if (!navRef.current) return
    const activeEl = navRef.current.querySelector('[data-active="true"]') as HTMLElement
    if (activeEl) {
      setPillStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
        opacity: 1
      })
    }
  }, [pathname])

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > 50 && currentScrollY > lastScrollY) {
        setIsNavVisible(false)
      } else {
        setIsNavVisible(true)
      }
      setLastScrollY(currentScrollY)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  // Lock body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [mobileMenuOpen])

  const handleMobileNav = (href: string) => {
    setMobileMenuOpen(false)
    router.push(href)
  }

  const navLinks = [
    { href: "/", label: "Explore" },
    { href: "/studio", label: "Studio" },
    { href: "/community", label: "Community" },
    { href: "/pricing", label: "Pricing" },
  ]



  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-[100] px-4 py-6 sm:px-6 lg:px-8 transition-transform duration-700 ease-[0.32,0.72,0,1]",
          isNavVisible ? "translate-y-0" : "-translate-y-32"
        )}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between relative">
          {/* Logo */}
          <Link
            href="/"
            onClick={(e) => {
              if (pathname === "/") {
                e.preventDefault()
                  ; (window as any).lenis?.scrollTo(0, { duration: 1.5, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) })
              }
            }}
            className="flex items-center gap-3 group relative z-[110]"
          >
            <div className="relative w-8 h-8 flex items-center justify-center bg-white text-black rounded-lg overflow-hidden transition-transform duration-500">
              <div className="absolute inset-0 bg-gradient-to-tr from-zinc-200 to-white opacity-100" />
              <span className="relative font-bold text-sm tracking-tighter">Sx</span>
            </div>
            <span className={cn(
              "font-medium tracking-wide transition-colors duration-300",
              "text-white"
            )}>
              StudioX
            </span>
          </Link>

          {/* Desktop Navigation Capsule */}
          <nav ref={navRef} className="hidden md:flex items-center gap-1 p-1.5 rounded-full bg-white/5 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_0_rgba(255,255,255,0.02)] absolute left-1/2 -translate-x-1/2 z-[110]">

            {/* Smooth Sliding Pill */}
            <div
              className="absolute top-1.5 bottom-1.5 rounded-full bg-gradient-to-tr from-white to-zinc-200 shadow-md pointer-events-none transition-all duration-500 ease-[0.32,0.72,0,1]"
              style={{
                left: pillStyle.left,
                width: pillStyle.width,
                opacity: pillStyle.opacity
              }}
            />

            {navLinks.map((link) => {
              const isActive = link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href)

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  data-active={isActive}
                  className={cn(
                    "relative px-5 py-2 text-sm font-medium transition-colors duration-300 rounded-full z-10",
                    isActive ? "text-black" : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-4 relative z-[110]">
            {/* Credits Pill */}
            <div className="hidden sm:flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-zinc-900/80 border border-white/10 shadow-lg backdrop-blur-md">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white fill-white" />
              </div>
              <span className="text-xs font-semibold text-zinc-100 tabular-nums tracking-wide">120</span>
            </div>

            {/* User Profile */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hidden md:flex rounded-full w-10 h-10 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all">
                    <div className="h-full w-full rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center">
                      {(user.user_metadata?.avatar_url || user.user_metadata?.picture || user.identities?.[0]?.identity_data?.avatar_url || user.identities?.[0]?.identity_data?.picture) ? (
                        <img
                          src={user.user_metadata?.avatar_url || user.user_metadata?.picture || user.identities?.[0]?.identity_data?.avatar_url || user.identities?.[0]?.identity_data?.picture}
                          alt="Profile"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-xs font-medium text-zinc-300">
                          {user.email?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2 bg-[#0A0A0A] border-white/10 backdrop-blur-2xl shadow-2xl rounded-2xl mt-2 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-3 border-b border-white/5 mb-2">
                    <p className="font-medium text-sm text-white">{user.user_metadata?.full_name || "Creator"}</p>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">{user.email}</p>
                  </div>

                  <div className="space-y-1">
                    <DropdownMenuItem asChild className="group cursor-pointer focus:bg-white/5 rounded-xl px-3 py-2.5 transition-colors">
                      <Link href="/profile" className="flex items-center gap-3">
                        <User className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                        <span className="text-sm text-zinc-400 group-hover:text-white font-medium transition-colors">Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="group cursor-pointer focus:bg-white/5 rounded-xl px-3 py-2.5 transition-colors">
                      <Link href="/creations" className="flex items-center gap-3">
                        <Sparkles className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                        <span className="text-sm text-zinc-400 group-hover:text-white font-medium transition-colors">My Creations</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-white/5 mx-2 my-2" />

                    <DropdownMenuItem
                      className="group cursor-pointer focus:bg-red-500/10 rounded-xl px-3 py-2.5 transition-colors"
                      onClick={() => logout()}
                    >
                      <div className="flex items-center gap-3">
                        <LogOut className="w-4 h-4 text-zinc-500 group-hover:text-red-400 transition-colors" />
                        <span className="text-sm text-zinc-400 group-hover:text-red-400 font-medium transition-colors">Sign Out</span>
                      </div>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:block">
                <Button asChild className="rounded-full px-6 bg-white text-black hover:bg-zinc-200 hover:scale-105 transition-all duration-300 font-semibold text-sm h-10">
                  <Link href="/login">Get Started</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden relative z-[110] w-10 h-10 flex items-center justify-center rounded-full border border-white/10 hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <AnimatePresence mode="wait">
                {mobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="w-5 h-5 text-white" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="w-5 h-5 text-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-0 z-[90] bg-black flex flex-col pt-24 pb-8 px-6"
          >
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/20 to-black pointer-events-none" />

            <div className="flex-1 flex flex-col relative z-10">
              <nav className="flex flex-col gap-2">
                {navLinks.map((link, i) => {
                  const isActive = link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href)

                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + (i * 0.05), type: "spring", bounce: 0, duration: 0.4 }}
                    >
                      <button
                        onClick={() => handleMobileNav(link.href)}
                        className={cn(
                          "text-4xl font-light tracking-tighter text-left w-full py-3 border-b border-white/5 transition-all duration-300 group",
                          isActive ? "text-white" : "text-zinc-600 hover:text-zinc-300"
                        )}
                      >
                        {link.label}
                        <span className={cn(
                          "block h-[1px] bg-white transition-all duration-500 mt-2",
                          isActive ? "w-full" : "w-0 group-hover:w-12"
                        )} />
                      </button>
                    </motion.div>
                  )
                })}
              </nav>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-auto space-y-6"
              >
                <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm">
                  {user ? (
                    <>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center border border-white/10 shrink-0">
                          {(user.user_metadata?.avatar_url || user.user_metadata?.picture || user.identities?.[0]?.identity_data?.avatar_url || user.identities?.[0]?.identity_data?.picture) ? (
                            <img
                              src={user.user_metadata?.avatar_url || user.user_metadata?.picture || user.identities?.[0]?.identity_data?.avatar_url || user.identities?.[0]?.identity_data?.picture}
                              alt="Profile"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-sm font-medium text-zinc-300">
                              {user.email?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium text-lg">{user.user_metadata?.full_name}</p>
                          <p className="text-zinc-500 text-sm">{user.email}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Button onClick={() => handleMobileNav('/profile')} variant="outline" className="h-12 border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors">
                          Profile
                        </Button>
                        <Button onClick={() => logout()} variant="outline" className="h-12 border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                          Sign Out
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <p className="text-zinc-400 mb-4 text-sm">Join the creative revolution.</p>
                      <Button onClick={() => handleMobileNav('/login')} className="w-full h-12 rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold text-lg">
                        Get Started
                      </Button>
                    </div>
                  )}
                </div>

                {/* Stats / Footer */}
                <div className="flex justify-between items-end border-t border-white/5 pt-6">
                  <div className="text-left">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-zinc-400 text-xs">Systems Operational</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-1">Version</p>
                    <span className="text-zinc-500 text-xs font-mono">v2.0.4</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
