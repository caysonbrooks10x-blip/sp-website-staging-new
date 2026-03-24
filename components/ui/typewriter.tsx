import { useEffect, useState, useRef } from "react"
import { cn } from "@/lib/utils"

interface TypewriterProps {
    text: string
    className?: string
    cursorClassName?: string
    wrapperClassName?: string
    delay?: number
    speed?: number
    loop?: boolean
    deleteSpeed?: number
    cursorChar?: string
    startOnView?: boolean
    start?: boolean
}

export function Typewriter({
    text,
    className,
    cursorClassName,
    wrapperClassName,
    delay = 0,
    speed = 50,
    loop = false,
    deleteSpeed = 30,
    cursorChar = "|",
    startOnView = false,
    start,
}: TypewriterProps) {
    const [displayedText, setDisplayedText] = useState("")
    const [isDeleting, setIsDeleting] = useState(false)
    const [started, setStarted] = useState(false)
    const [showCursor, setShowCursor] = useState(true)
    const containerRef = useRef<HTMLDivElement>(null)

    
    useEffect(() => {
        if (start === true && !started) {
            const startTimeout = setTimeout(() => {
                setStarted(true)
            }, delay)
            return () => clearTimeout(startTimeout)
        }
    }, [start, delay, started])

    useEffect(() => {
        if (start !== undefined) return

        if (!startOnView) {
            const startTimeout = setTimeout(() => {
                setStarted(true)
            }, delay)
            return () => clearTimeout(startTimeout)
        }

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                const startTimeout = setTimeout(() => {
                    setStarted(true)
                }, delay)
                observer.disconnect()
            }
        }, { threshold: 0.1 })

        if (containerRef.current) {
            observer.observe(containerRef.current)
        }

        return () => observer.disconnect()
    }, [delay, startOnView, start])

    useEffect(() => {
        
        if (start === undefined) return

        setStarted(start)
    }, [start])

    useEffect(() => {
        if (!started) {
            
            
            if (displayedText.length > 0) {
                setIsDeleting(true)
            }
            
            return
        }

        
        if (displayedText.length === 0 && isDeleting) {
            setIsDeleting(false)
        }
    }, [started, displayedText.length, isDeleting])


    useEffect(() => {
        let timeout: NodeJS.Timeout

        const tick = () => {
            const currentText = displayedText
            const isComplete = currentText === text
            const isEmpty = currentText === ""

            
            if (started) {
                
                if (!isComplete && !isDeleting) {
                    setDisplayedText(text.substring(0, currentText.length + 1))
                    setShowCursor(true)
                    timeout = setTimeout(tick, speed)
                    return
                }

                
                if (isComplete) {
                    if (loop) {
                        timeout = setTimeout(() => setIsDeleting(true), 2000)
                    } else {
                        timeout = setTimeout(() => setShowCursor(false), 1500)
                    }
                    return
                }
            } else {
                
                
                if (!isEmpty) {
                    setIsDeleting(true) 
                    setDisplayedText(text.substring(0, currentText.length - 1))
                    setShowCursor(true)
                    timeout = setTimeout(tick, deleteSpeed / 2) 
                    return
                } else {
                    setIsDeleting(false)
                    setShowCursor(true) 
                    
                }
            }

            
            if (isDeleting && !isEmpty) {
                setDisplayedText(text.substring(0, currentText.length - 1))
                timeout = setTimeout(tick, deleteSpeed)
            } else if (isDeleting && isEmpty) {
                setIsDeleting(false)
                if (started) timeout = setTimeout(tick, 500)
            }
        }

        timeout = setTimeout(tick, speed)

        return () => clearTimeout(timeout)
    }, [displayedText, isDeleting, started, loop, speed, deleteSpeed, text])

    return (
        <div ref={containerRef} className={cn("inline-block", wrapperClassName)}>
            <span className={cn("", className)}>{displayedText}</span>
            <span
                className={cn(
                    "ml-1 inline-block h-[1em] w-[2px] align-middle transition-opacity duration-300",
                    
                    showCursor ? "opacity-100 animate-pulse" : "opacity-0",
                    cursorClassName
                )}
            >
                {}
            </span>
        </div>
    )
}
