"use client"

import * as React from "react"

export const SplitText = ({ children, className }: { children: string; className?: string }) => {
    return (
        <span className={`inline-block overflow-hidden align-bottom ${className}`}>
            <span className="inline-block translate-y-full reveal-text will-change-transform leading-[1.1]">
                {children}
            </span>
        </span>
    )
}
