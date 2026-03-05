"use client"
import { useState, useEffect } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db, functions } from "@/lib/firebaseClient"
import { httpsCallable } from "firebase/functions"
import { useAuth } from "@/context/auth-context"

/**
 * Headless remote like hook
 * @param postId Document reference ID 
 * @param initialLikesCount The amount natively broadcast by your Firestore snap-listeners
 */
export function usePostLike(postId: string, initialLikesCount: number) {
    const { user } = useAuth()

    // Independent state mapping relative to user session
    const [isLiked, setIsLiked] = useState(false)
    const [likesCount, setLikesCount] = useState(initialLikesCount)
    const [isLoading, setIsLoading] = useState(true)
    const [isProcessing, setIsProcessing] = useState(false)

    // Sync initial likes count if it updates natively via global feed snapshot
    useEffect(() => {
        setLikesCount(initialLikesCount)
    }, [initialLikesCount])

    // 1: Asynchronous Micro-Fetch (Single Check) 
    useEffect(() => {
        // Fast path cancellation to avoid db queries
        if (!user || !postId) {
            setIsLiked(false)
            setIsLoading(false)
            return
        }
        const fetchLikeState = async () => {
            try {
                // Evaluate single matching record to current user
                const likeRef = doc(db, "likes", `${postId}_${user.uid}`)
                const likeDoc = await getDoc(likeRef)
                // Set truthy existance locally
                setIsLiked(likeDoc.exists())
            } catch (error) {
                console.error("Failed to fetch like status", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchLikeState()
    }, [postId, user])

    // 2: Atomic Execution Mutation (Optimistic Update Architecture)
    const toggleLike = async () => {
        // Disallow interaction mapping if not actively signed in or currently processing
        if (!user || isProcessing) return

        setIsProcessing(true)

        // Replicate previous states into memory heap 
        const previousIsLiked = isLiked
        const previousCount = Math.max(0, likesCount) // Ensure base is never intrinsically negative

        // Mutate state memory UI optimistically (No DB roundtrip delay)
        setIsLiked(!previousIsLiked)
        setLikesCount(prev => Math.max(0, prev + (previousIsLiked ? -1 : 1)))

        try {
            // Execute the backend 
            const likePostFn = httpsCallable(functions, "likePost")

            // Push single execution frame securely 
            await likePostFn({ postId })

        } catch (error) {
            console.error("Critical replication error... Reverting memory states", error)

            // Execute graceful rollback on background failure!
            setIsLiked(previousIsLiked)
            setLikesCount(previousCount)
        } finally {
            // Release lock
            setIsProcessing(false)
        }
    }

    // Hook Exposer 
    return {
        isLiked,
        likesCount,
        toggleLike,
        isLoading: isLoading || isProcessing
    }
}
