"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { AnimatePresence, motion } from "framer-motion"
import { gsap } from "gsap"
import {
  Zap,
  TrendingUp,
  Share2,
  Settings,
  Grid,
  Heart,
  MoreHorizontal,
  Edit,
  Shield,
  Bell,
  Mail,
  LogOut,
  User as UserIcon,
  Sparkles,
  Camera
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/auth-context"
import Image from "next/image"

// --- Mock Data for Stats/Creations (since real backend connection for these specific items isn't requested yet) ---
// --- Mock Data Removed ---


// --- Components ---

import { CreationsTab } from "@/components/profile/creations-tab"


function ProfileContent() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<"overview" | "creations">("overview")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".header-element", {
        y: 30,
        opacity: 0,
        duration: 1,
        stagger: 0.15,
        ease: "power4.out"
      })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  const tabs = [
    { id: "overview", label: "Overview", icon: Grid },
    { id: "creations", label: "Creations", icon: Sparkles },
  ]

  // Fallback for display name if not set
  const displayName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "StudioX User"
  const initials = displayName.substring(0, 2).toUpperCase()

  return (
    <main className="min-h-screen bg-[#050505] text-slate-200 selection:bg-purple-500/30 overflow-x-hidden font-sans">
      <div ref={containerRef} className="pb-20">

        {/* Cinematic Ambient Background */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-900/10 rounded-full blur-[150px] animate-pulse-slow" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[150px] animate-pulse-slow delay-1000" />
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
        </div>

        {/* Hero Banner Area */}
        <div className="h-[380px] w-full relative group z-0">
          {/* Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/60 to-[#050505] z-10" />
          {/* Background Image */}
          <div className="absolute inset-0 w-full h-full overflow-hidden">
            <Image
              src="/studiox.jpg"
              alt="Cover"
              fill
              className="object-cover opacity-60 grayscale-[30%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000 ease-out will-change-transform"
            />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 -mt-40">
          {/* Profile Header */}
          <div className="flex flex-col md:flex-row items-end gap-10 mb-14 header-element">

            {/* Avatar Section */}
            <div className="relative group perspective-1000 mx-auto md:mx-0">
              <div className="h-40 w-40 md:h-48 md:w-48 rounded-full p-1.5 bg-[#050505]/50 backdrop-blur-xl ring-1 ring-white/10 relative z-20 overflow-hidden shadow-2xl shadow-black/50">
                <Avatar className="h-full w-full rounded-full bg-black">
                  <AvatarImage
                    src={
                      user?.user_metadata?.avatar_url ||
                      user?.user_metadata?.picture ||
                      user?.identities?.[0]?.identity_data?.avatar_url ||
                      user?.identities?.[0]?.identity_data?.picture ||
                      ""
                    }
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-neutral-800 to-neutral-900 text-3xl font-black text-neutral-500">{initials}</AvatarFallback>
                </Avatar>
              </div>

              {/* Glow effect behind avatar */}
              <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-[60px] scale-90 -z-10 group-hover:scale-110 transition-transform duration-500" />
            </div>

            {/* User Info */}
            <div className="flex-1 space-y-4 mb-2 text-center md:text-left w-full">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter drop-shadow-2xl">{displayName}</h1>
              </div>

              <div className="space-y-1">
                <p className="text-xl text-slate-300 font-medium">{user?.email}</p>
                <p className="text-slate-500 max-w-xl mx-auto md:mx-0 leading-relaxed text-sm md:text-base">Creative mind exploring the boundaries of AI generation.</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mb-2 w-full md:w-auto justify-center md:justify-end">
              <Button
                variant="outline"
                className="bg-white/5 border-white/10 hover:bg-white/10 text-white backdrop-blur-xl h-12 w-12 rounded-xl p-0 transition-all hover:scale-105 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                onClick={logout}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Cinematic Floating Tabs */}
          <div className="flex justify-center mb-16 header-element relative z-20">
            <div className="flex p-2 bg-black/40 backdrop-blur-2xl rounded-full border border-white/10 shadow-2xl shadow-black/50">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "relative px-8 py-3 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2.5 z-10",
                    activeTab === tab.id ? "text-white" : "text-slate-500 hover:text-slate-200"
                  )}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTabPill"
                      className="absolute inset-0 bg-gradient-to-r from-neutral-800 to-neutral-700 rounded-full shadow-lg border border-white/10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2.5">
                    <tab.icon className={cn("w-4 h-4", activeTab === tab.id && "text-purple-400")} />
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area with smooth transitions */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
              transition={{ duration: 0.4, ease: "circOut" }}
              className="min-h-[500px]"
            >
              {activeTab === "overview" && (
                <div className="space-y-12">
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 bg-white/5 rounded-3xl border border-white/5">
                    <h3 className="text-2xl font-bold text-white">Welcome to your Profile</h3>
                    <p className="text-slate-400 max-w-md">
                      This is your personal dashboard. As you create and remix content, your highlights and stats will appear here.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "creations" && (
                <CreationsTab items={[]} />
              )}
            </motion.div>
          </AnimatePresence>

        </div>
      </div>
    </main>
  )
}

import { ProtectedRoute } from "@/components/protected-route"

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={null}>
        <ProfileContent />
      </Suspense>
    </ProtectedRoute>
  )
}
