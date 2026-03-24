import React from 'react';
import { cn } from "@/lib/utils";
import Image from "next/image";

interface MediaRendererProps {
    url: string;
    altText?: string;
    className?: string;
    fill?: boolean;
}

export function MediaRenderer({ url, altText = "Generated Media", className, fill }: MediaRendererProps) {
    if (!url) return <div className={cn("placeholder bg-zinc-900 animate-pulse flex items-center justify-center", className)}>Generating...</div>;

    
    const isVideo = url.toLowerCase().includes('.mp4') ||
        url.toLowerCase().includes('.webm') ||
        url.toLowerCase().includes('.mov') ||
        url.toLowerCase().includes('video'); 

    if (isVideo) {
        return (
            <video
                src={url}
                className={cn("generated-video object-cover", className)}
                autoPlay
                loop
                muted 
                controls={false}
                playsInline
                style={fill ? { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 } : undefined}
            />
        );
    }

    
    if (fill) {
        return (
            <Image
                src={url}
                alt={altText}
                className={cn("generated-image object-cover", className)}
                fill
                priority
                unoptimized
                onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop";
                }}
            />
        );
    }

    return (
        <img
            src={url}
            alt={altText}
            className={cn("generated-image object-cover", className)}
            loading="lazy"
            onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop";
            }}
        />
    );
} 
