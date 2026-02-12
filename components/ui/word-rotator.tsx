"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { clsx } from "clsx"

interface WordRotatorProps {
    words: string[]
    className?: string
}

export function WordRotator({ words, className }: WordRotatorProps) {
    const [index, setIndex] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % words.length)
        }, 2500) // Change word every 2.5s

        return () => clearInterval(interval)
    }, [words.length])

    return (
        <div className={clsx("inline-flex relative overflow-hidden h-[1.4em] w-[160px] align-middle mx-2", className)}>
            <AnimatePresence mode="popLayout">
                <motion.span
                    key={words[index]}
                    initial={{ y: "100%", opacity: 0, filter: "blur(4px)" }}
                    animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
                    exit={{ y: "-100%", opacity: 0, filter: "blur(4px)" }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} // ios-like ease
                    className="absolute inset-0 flex items-center justify-center bg-white/10 rounded-full border border-white/10 shadow-inner px-4 text-white font-medium tracking-wide"
                >
                    {words[index]}
                </motion.span>
            </AnimatePresence>
        </div>
    )
}
