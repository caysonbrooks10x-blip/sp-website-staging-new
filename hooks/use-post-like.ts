"use client"
import { useState, useEffect } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db, functions } from "@/lib/firebaseClient"
import { httpsCallable } from "firebase/functions"
import { useAuth } from "@/context/auth-context"


export function usePostLike(postId: string, initialLikesCount: number) {
    const { user } = useAuth()

    
    const [isLiked, setIsLiked] = useState(false)
    const [likesCount, setLikesCount] = useState(initialLikesCount)
    const [isLoading, setIsLoading] = useState(true)
    const [isProcessing, setIsProcessing] = useState(false)

    
    useEffect(() => {
        setLikesCount(initialLikesCount)
    }, [initialLikesCount])

    
    useEffect(() => {
        
        if (!user || !postId) {
            setIsLiked(false)
            setIsLoading(false)
            return
        }
        const fetchLikeState = async () => {
            try {
                
                const likeRef = doc(db, "likes", `${postId}_${user.uid}`)
                const likeDoc = await getDoc(likeRef)
                
                setIsLiked(likeDoc.exists())
            } catch (error) {
                console.error("Failed to fetch like status", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchLikeState()
    }, [postId, user])

    
    const toggleLike = async () => {
        
        if (!user || isProcessing) return

        setIsProcessing(true)

        
        const previousIsLiked = isLiked
        const previousCount = Math.max(0, likesCount) 

        
        setIsLiked(!previousIsLiked)
        setLikesCount(prev => Math.max(0, prev + (previousIsLiked ? -1 : 1)))

        try {
            
            const likePostFn = httpsCallable(functions, "likePost")

            
            await likePostFn({ postId })

        } catch (error) {
            console.error("Critical replication error... Reverting memory states", error)

            
            setIsLiked(previousIsLiked)
            setLikesCount(previousCount)
        } finally {
            
            setIsProcessing(false)
        }
    }

    
    return {
        isLiked,
        likesCount,
        toggleLike,
        isLoading: isLoading || isProcessing
    }
}
