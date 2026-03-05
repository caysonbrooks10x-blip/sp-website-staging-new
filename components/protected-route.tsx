"use client"

import { useAuth } from "@/context/auth-context"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    useEffect(() => {
        if (!loading && !user) {
            const currentPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "")
            router.push(`/login?redirect=${encodeURIComponent(currentPath)}`)
        }
    }, [user, loading, router, pathname, searchParams])

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!user) {
        return null
    }

    return <>{children}</>
}
