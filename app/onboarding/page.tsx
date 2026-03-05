"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronLeft, Check, Sparkles } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// --- Configuration ---

const NEON_LIME = "#ccff00";

const onboardingSteps = [
    {
        id: "usage",
        question: "How do you plan to use StudioX?",
        subtitle: "We'll tailor your workspace to your goals.",
        options: [
            { id: "marketing", label: "Marketing & Ads", icon: "📢" },
            { id: "filmmaking", label: "Filmmaking & Art", icon: "🎬" },
            { id: "social", label: "Social Media Growth", icon: "📈" },
            { id: "personal", label: "Personal Projects", icon: "🎨" },
        ],
        media: {
            type: "video",
            src: "/gallerysignup/video.mp4",
            overlayPoints: ["Viral Content", "High Engagement", "Brand Storytelling"]
        },
    },
    {
        id: "experience",
        question: "What's your experience level with AI?",
        subtitle: "We'll adapt the interface complexity for you.",
        options: [
            { id: "beginner", label: "Beginner", desc: "I need simple templates." },
            { id: "intermediate", label: "Intermediate", desc: "I know the basics." },
            { id: "advanced", label: "Advanced", desc: "I want full control." },
            { id: "expert", label: "Expert", desc: "I'm a pro prompter." },
        ],
        media: {
            type: "video",
            src: "/gallerysignup/edit.mp4",
            overlayPoints: ["Smart Tools", "Precision Control", "Workflow Automation"]
        },
    },
    {
        id: "creation",
        question: "What do you want to create first?",
        subtitle: "Choose as many as you like.",
        multiSelect: true,
        options: [
            { id: "commercials", label: "Commercial Videos" },
            { id: "cinematic", label: "Cinematic Visuals" },
            { id: "avatars", label: "AI Avatars & Characters" },
            { id: "social_clips", label: "Viral Social Clips" },
        ],
        media: {
            type: "video",
            src: "/gallerysignup/character.mp4",
            overlayPoints: ["Character Consistency", "Lip Sync", "Emotion Control"]
        },
    },
    {
        id: "frustration",
        question: "What holds you back currently?",
        subtitle: "We've solved these pain points for you.",
        options: [
            { id: "consistency", label: "Inconsistent Results" },
            { id: "complexity", label: "Tools are too complex" },
            { id: "cost", label: "High production costs" },
            { id: "speed", label: "Rendering takes too long" },
        ],
        media: {
            type: "image",
            src: "/gallerysignup/image.png",
            overlayPoints: ["Perfect Consistency", "One-Click Magic", "Instant Preview"]
        },
    },
];

export default function OnboardingPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
    const [direction, setDirection] = useState(1);

    const stepData = onboardingSteps[currentStep];
    const isLastStep = currentStep === onboardingSteps.length - 1;

    // Auto-advance progress bar
    const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

    const handleOptionSelect = (optionId: string) => {
        if (stepData.multiSelect) {
            const current = (answers[stepData.id] as string[]) || [];
            const updated = current.includes(optionId)
                ? current.filter((id) => id !== optionId)
                : [...current, optionId];
            setAnswers({ ...answers, [stepData.id]: updated });
        } else {
            setAnswers({ ...answers, [stepData.id]: optionId });
        }
    };

    const handleContinue = () => {
        if (isLastStep) {
            // Here we would typically save to backend
            console.log("Onboarding complete:", answers);
            router.push("/studio");
        } else {
            setDirection(1);
            setCurrentStep((prev) => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setDirection(-1);
            setCurrentStep((prev) => prev - 1);
        }
    };

    const canContinue = !!answers[stepData.id] && (Array.isArray(answers[stepData.id]) ? answers[stepData.id].length > 0 : true);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08,
                delayChildren: 0.1,
                ease: "circOut"
            }
        },
        exit: { opacity: 0, transition: { duration: 0.2, ease: "easeIn" } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 30, filter: "blur(4px)" },
        visible: {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
        }
    };

    return (
        <div className="flex h-[100dvh] w-full bg-[#050505] text-white overflow-hidden font-sans selection:bg-[#ccff00]/30 selection:text-[#ccff00] flex-col md:flex-row">
            {/* Left Panel - Interaction */}
            <div className="w-full md:w-[50%] h-full flex flex-col relative z-20 bg-black/50 backdrop-blur-sm">

                {/* Fixed Header */}
                <div className="flex-shrink-0 px-6 py-6 md:px-12 md:py-8 lg:px-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {currentStep > 0 ? (
                            <button
                                onClick={handleBack}
                                className="group flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-white transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                Back
                            </button>
                        ) : (
                            <div className="w-16" /> // spacer
                        )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                        <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-600">
                            Step {currentStep + 1} / {onboardingSteps.length}
                        </div>
                        <div className="w-24 md:w-32 h-1 bg-zinc-900 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-[#ccff00]"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.8, ease: "circOut" }}
                            />
                        </div>
                    </div>
                </div>

                {/* Scrollable Question Area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 md:px-12 lg:px-16 py-4 no-scrollbar flex flex-col justify-center">
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={currentStep}
                            custom={direction}
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="space-y-8 md:space-y-12 max-w-xl mx-auto w-full"
                        >
                            <div className="space-y-3 md:space-y-4 min-h-[5rem]">
                                <motion.h1
                                    className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight leading-[1.1] text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-zinc-500"
                                >
                                    {stepData.question.split("").map((char, index) => (
                                        <motion.span
                                            key={index}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.05, delay: index * 0.03 }}
                                        >
                                            {char}
                                        </motion.span>
                                    ))}
                                </motion.h1>
                            </div>

                            <div className={cn(
                                "grid gap-3 md:gap-4",
                                stepData.options.length > 4 ? "grid-cols-2" : "grid-cols-1"
                            )}>
                                {stepData.options.map((option, idx) => {
                                    const isSelected = stepData.multiSelect
                                        ? (answers[stepData.id] as string[])?.includes(option.id)
                                        : answers[stepData.id] === option.id;

                                    return (
                                        <motion.button
                                            key={option.id}
                                            layout
                                            variants={itemVariants}
                                            onClick={() => handleOptionSelect(option.id)}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className={cn(
                                                "group relative w-full text-left p-4 rounded-xl border transition-all duration-300 ease-out backdrop-blur-md overflow-hidden",
                                                isSelected
                                                    ? "bg-[#ccff00]/10 border-[#ccff00] shadow-[0_0_30px_-5px_rgba(204,255,0,0.3)]"
                                                    : "bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10 hover:shadow-lg hover:shadow-black/20"
                                            )}
                                        >
                                            <div className="flex items-center justify-between relative z-10">
                                                <div className="flex items-center gap-4">
                                                    {'icon' in option && <span className="text-xl opacity-80 filter drop-shadow-md">{option.icon}</span>}
                                                    <div>
                                                        <div className={cn("font-medium text-base md:text-lg transition-colors duration-300", isSelected ? "text-white" : "text-zinc-200 group-hover:text-white")}>
                                                            {option.label}
                                                        </div>
                                                        {'desc' in option && (
                                                            <div className="text-xs text-zinc-400 mt-1 group-hover:text-zinc-300 transition-colors font-medium">
                                                                {option.desc}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className={cn(
                                                    "w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300",
                                                    isSelected
                                                        ? "bg-[#ccff00] border-[#ccff00] scale-110 shadow-[0_0_15px_rgba(204,255,0,0.6)]"
                                                        : "border-white/20 group-hover:border-white/50 bg-white/5"
                                                )}>
                                                    {isSelected && <Check className="w-3 h-3 text-black stroke-[3px]" />}
                                                </div>
                                            </div>

                                            {/* Glass Reflection/Shine */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                            {/* Subtle Gradient Selection BG */}
                                            {isSelected && (
                                                <motion.div
                                                    layoutId="selectionGradient"
                                                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#ccff00]/10 to-transparent opacity-100"
                                                />
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Floating Footer */}
                <div className="mt-auto px-8 pb-12 md:px-16 md:pb-24">
                    <div className="max-w-xl mx-auto w-full">
                        <motion.button
                            onClick={handleContinue}
                            disabled={!canContinue}
                            className={cn(
                                "group relative w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold tracking-wide transition-all duration-500 overflow-hidden shadow-2xl backdrop-blur-md",
                                canContinue
                                    ? "bg-[#ccff00] text-black hover:shadow-[0_0_50px_rgba(204,255,0,0.5)] hover:scale-[1.02] border border-[#ccff00]/50"
                                    : "bg-zinc-800/40 border border-white/5 text-zinc-500 cursor-not-allowed"
                            )}
                            whileTap={{ scale: 0.98 }}
                        >
                            <span className="relative z-10 text-base md:text-lg">{isLastStep ? "Launch Studio" : "Continue"}</span>
                            <div className={cn(
                                "absolute inset-0 bg-white/40 translate-y-full transition-transform duration-300 ease-out blur-md",
                                canContinue && "group-hover:translate-y-0"
                            )} />
                            <ArrowRight className={cn(
                                "w-5 h-5 transition-transform duration-300",
                                canContinue && "group-hover:translate-x-1"
                            )} />
                        </motion.button>
                    </div>
                </div>

            </div>

            {/* Right Panel - Visual Gallery */}
            <div className="hidden md:block relative w-full md:w-[50%] h-full p-4 pl-0">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className="relative h-full w-full rounded-[2.5rem] overflow-hidden bg-zinc-900 border border-white/5 ring-1 ring-white/5 shadow-2xl"
                >
                    <AnimatePresence mode="popLayout" custom={direction}>
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, scale: 1.05, filter: "blur(20px)" }}
                            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                            exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                            className="absolute inset-0 w-full h-full"
                        >
                            {stepData.media.type === 'video' ? (
                                <video
                                    src={stepData.media.src}
                                    muted
                                    autoPlay
                                    loop
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="relative w-full h-full">
                                    <Image
                                        src={stepData.media.src}
                                        alt="Visual"
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                </div>
                            )}

                            {/* Cinematic Overlay - Darker at bottom */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

                            {/* Dynamic Floating Labels - Staggered */}
                            <div className="absolute bottom-16 left-12 flex flex-wrap gap-3 max-w-[80%]">
                                {stepData.media.overlayPoints?.map((point, idx) => (
                                    <motion.div
                                        key={point}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 + (idx * 0.1), duration: 0.6, ease: "backOut" }}
                                        className="px-5 py-2.5 rounded-full border border-white/10 bg-black/60 backdrop-blur-xl text-sm font-medium text-white shadow-lg flex items-center gap-2.5 hover:scale-105 transition-transform cursor-default"
                                    >
                                        {point}
                                    </motion.div>
                                ))}
                            </div>

                        </motion.div>
                    </AnimatePresence>

                    {/* Persistent Noise/Grain Overlay */}
                    <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[url('/noise.svg')]" />
                </motion.div>
            </div>
        </div>
    );
}
