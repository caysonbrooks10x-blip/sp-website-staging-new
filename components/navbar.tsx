"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, LogOut } from "lucide-react"
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
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const navLinks = [
    { href: "/", label: "Explore" },
    { href: "/studio", label: "Studio" },
    { href: "/community", label: "Community" },
    { href: "/pricing", label: "Pricing" },
  ]

  return (
    <nav className="sticky top-0 z-[100] border-b border-border bg-background/95 backdrop-blur-md shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg group">
            <motion.div
              className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground text-sm font-bold"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              S
            </motion.div>
            <span className="group-hover:opacity-80 transition-opacity">StudioX</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href)

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-foreground",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-border">
              <span className="text-xs font-medium">120 credits</span>
            </div>

            {/* User Profile Dropdown */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={
                          user.user_metadata?.avatar_url ||
                          user.user_metadata?.picture ||
                          user.identities?.[0]?.identity_data?.avatar_url ||
                          user.identities?.[0]?.identity_data?.picture ||
                          undefined
                        }
                        alt={user.user_metadata?.full_name || user.email || "User"}
                        referrerPolicy="no-referrer"
                      />
                      <AvatarFallback className="bg-accent/20 text-accent-foreground font-bold">
                        {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 bg-[#09090b] border-white/10 backdrop-blur-xl shadow-2xl rounded-xl">
                  {/* Header with Name only */}
                  <div className="px-3 py-2.5 mb-1">
                    <p className="font-medium text-sm text-zinc-100">{user.user_metadata?.full_name || user.email || "User"}</p>
                  </div>

                  <div className="space-y-1">
                    <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/5 focus:text-white rounded-lg px-3 py-2 transition-colors">
                      <Link href="/profile" className="flex items-center gap-2">
                        <span className="text-sm font-light text-zinc-400">Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/5 focus:text-white rounded-lg px-3 py-2 transition-colors">
                      <Link href="/creations" className="flex items-center gap-2">
                        <span className="text-sm font-light text-zinc-400">My Creations</span>
                      </Link>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>

              </DropdownMenu>
            ) : (
              <div className="hidden md:block">
                <Button asChild variant="default" className="rounded-full px-6 font-medium">
                  <Link href="/login">Log in</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Full Screen Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 top-16 z-40 bg-black/95 backdrop-blur-xl md:hidden flex flex-col overflow-y-auto"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-col p-6 gap-6">

              {/* Mobile Links */}
              <div className="flex flex-col gap-2">
                {navLinks.map((link, index) => {
                  const isActive = link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href)

                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 + 0.1 }}
                    >
                      <Link
                        href={link.href}
                        className={cn(
                          "flex items-center text-lg font-medium py-3 border-b border-white/10 transition-colors",
                          isActive ? "text-primary" : "text-zinc-400 hover:text-white"
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  )
                })}
              </div>

              {/* Mobile Actions */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col gap-4 mt-4"
              >
                <div className="flex justify-between items-center p-4 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-sm text-zinc-400">Available Credits</span>
                  <span className="text-sm font-bold text-white">120</span>
                </div>

                {!user && (
                  <Button asChild size="lg" className="w-full rounded-full text-lg mt-2">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>Log in</Link>
                  </Button>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
