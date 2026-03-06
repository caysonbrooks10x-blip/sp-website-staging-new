"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, Lock, Phone, ArrowLeft, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

// Components for clean UI
const SocialButton = ({ icon, text, onClick, disabled }: { icon: any, text: string, onClick?: () => void, disabled?: boolean }) => (
    <Button
        variant="outline"
        className="w-full h-12 rounded-xl bg-black/40 border-white/10 hover:bg-black/60 hover:border-white/20 text-white font-medium flex items-center justify-center gap-3 transition-all duration-300 backdrop-blur-sm"
        onClick={onClick}
        disabled={disabled}
    >
        {icon}
        <span>{text}</span>
    </Button>
);

const Divider = () => (
    <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
            <span className="bg-black/50 px-3 text-white/50 rounded-full backdrop-blur-md">OR</span>
        </div>
    </div>
);

export default function LoginPage() {
    const { user, loading, signInWithGoogle, signInWithEmail, signInWithPhone, verifyOtp, setUpRecaptcha } = useAuth();
    const router = useRouter();

    const [view, setView] = useState<"selection" | "email" | "phone">("selection");

    // Email State
    const [emailCreds, setEmailCreds] = useState({ email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);

    // Phone State
    const [phoneNumber, setPhoneNumber] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [phoneStep, setPhoneStep] = useState<"phone" | "code">("phone");

    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const redirectPath = useRef("/");

    useEffect(() => {
        // Capture redirect params once on mount
        const params = new URLSearchParams(window.location.search);
        redirectPath.current = params.get('redirect') || "/onboarding";
    }, []);

    useEffect(() => {
        if (!loading && user) {
            router.push(redirectPath.current);
        }
    }, [user, loading, router]);


    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmailCreds({ ...emailCreds, [e.target.name]: e.target.value });
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);
        try {
            await signInWithEmail(emailCreds.email, emailCreds.password);
            // Redirect handled by user effect
        } catch (err: any) {
            setError(err.message || "Failed to login");
            setIsSubmitting(false);
        }
    };

    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            setUpRecaptcha("recaptcha-container");
            const appVerifier = (window as any).recaptchaVerifier;
            await signInWithPhone(phoneNumber, appVerifier);
            setPhoneStep("code");
            setIsSubmitting(false);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to send code");
            setIsSubmitting(false);
        }
    };

    const handleCodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);
        try {
            await verifyOtp(verificationCode);
            // Redirect handled by user effect
        } catch (err: any) {
            setError("Invalid verification code");
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-[#050505] px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">

            {/* Background Ambience */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-[500px] relative z-10"
            >
                <div className="text-center mb-8">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold text-xl mb-4 shadow-lg shadow-purple-500/20">
                        S
                    </div>
                </div>

                {/* Card Container with Background Image */}
                <div
                    className="relative bg-black/60 rounded-3xl shadow-2xl overflow-hidden border border-white/10"
                    style={{
                        backgroundImage: "url('/register.png')",
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    {/* Dark Overlay for Readability */}
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

                    <div className="relative p-10 z-10">
                        <AnimatePresence mode="wait">
                            {view === "selection" && (
                                <motion.div
                                    key="selection"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-4"
                                >
                                    <div className="text-center mb-8">
                                        <h2 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h2>
                                        <p className="text-white/60 text-sm mt-2">Sign in to continue your journey</p>
                                    </div>

                                    <SocialButton
                                        icon={<svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.17c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.56z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>}
                                        text="Continue with Google"
                                        onClick={signInWithGoogle}
                                    />

                                    <SocialButton
                                        icon={<Phone className="h-5 w-5 text-white" />}
                                        text="Continue with Phone"
                                        onClick={() => setView("phone")}
                                    />

                                    <Divider />

                                    <SocialButton
                                        icon={<Mail className="h-5 w-5 text-white" />}
                                        text="Continue with Email"
                                        onClick={() => setView("email")}
                                    />
                                </motion.div>
                            )}

                            {view === "email" && (
                                <motion.div
                                    key="email"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="flex items-center mb-6">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white -ml-2" onClick={() => setView("selection")}>
                                            <ArrowLeft className="h-4 w-4" />
                                        </Button>
                                        <h3 className="ml-2 text-white font-medium">Continue with Email</h3>
                                    </div>

                                    <form onSubmit={handleEmailSubmit} className="space-y-5">
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase font-bold tracking-widest text-white/50 pl-1">Email</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                                                <Input
                                                    name="email"
                                                    type="email"
                                                    className="pl-10 h-11 bg-black/40 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:border-white/30 focus-visible:ring-offset-0 transition-all rounded-xl backdrop-blur-md"
                                                    value={emailCreds.email}
                                                    onChange={handleEmailChange}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase font-bold tracking-widest text-white/50 pl-1">Password</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                                                <Input
                                                    name="password"
                                                    type={showPassword ? "text" : "password"}
                                                    className="pl-10 pr-10 h-11 bg-black/40 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:border-white/30 focus-visible:ring-offset-0 transition-all rounded-xl backdrop-blur-md"
                                                    value={emailCreds.password}
                                                    onChange={handleEmailChange}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors cursor-pointer"
                                                    tabIndex={-1}
                                                >
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        {error && <p className="text-xs text-red-400 text-center pt-2 font-medium">{error}</p>}
                                        <Button type="submit" className="w-full h-11 bg-white text-black hover:bg-white/90 font-bold rounded-xl mt-4 shadow-lg shadow-white/5 transition-transform active:scale-[0.98]" disabled={isSubmitting}>
                                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
                                        </Button>
                                    </form>
                                </motion.div>
                            )}

                            {view === "phone" && (
                                <motion.div
                                    key="phone"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="flex items-center mb-6">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white -ml-2" onClick={() => setView("selection")}>
                                            <ArrowLeft className="h-4 w-4" />
                                        </Button>
                                        <h3 className="ml-2 text-white font-medium">Continue with Phone</h3>
                                    </div>

                                    {phoneStep === "phone" ? (
                                        <form onSubmit={handlePhoneSubmit} className="space-y-5">
                                            <div className="space-y-2">
                                                <Label className="text-xs uppercase font-bold tracking-widest text-white/50 pl-1">Phone Number</Label>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                                                    <Input
                                                        type="tel"
                                                        placeholder="+1..."
                                                        className="pl-10 h-11 bg-black/40 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:border-white/30 focus-visible:ring-offset-0 transition-all rounded-xl backdrop-blur-md"
                                                        value={phoneNumber}
                                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div id="recaptcha-container"></div>
                                            {error && <p className="text-xs text-red-400 text-center pt-2 font-medium">{error}</p>}
                                            <Button type="submit" className="w-full h-11 bg-white text-black hover:bg-white/90 font-bold rounded-xl mt-4 shadow-lg shadow-white/5 transition-transform active:scale-[0.98]" disabled={isSubmitting}>
                                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send Code"}
                                            </Button>
                                        </form>
                                    ) : (
                                        <form onSubmit={handleCodeSubmit} className="space-y-5">
                                            <div className="space-y-2">
                                                <Label className="text-xs uppercase font-bold tracking-widest text-white/50 pl-1">Verification Code</Label>
                                                <Input
                                                    type="text"
                                                    className="text-center tracking-widest text-lg bg-black/40 border-white/10 text-white focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:border-white/30 focus-visible:ring-offset-0 transition-all rounded-xl h-12 backdrop-blur-md"
                                                    value={verificationCode}
                                                    onChange={(e) => setVerificationCode(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            {error && <p className="text-xs text-red-400 text-center pt-2 font-medium">{error}</p>}
                                            <Button type="submit" className="w-full h-11 bg-white text-black hover:bg-white/90 font-bold rounded-xl mt-4 shadow-lg shadow-white/5 transition-transform active:scale-[0.98]" disabled={isSubmitting}>
                                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify & Sign In"}
                                            </Button>
                                            <Button variant="ghost" className="w-full text-white/40 hover:text-white text-xs mt-2" onClick={() => setPhoneStep("phone")}>Change Number</Button>
                                        </form>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="mt-8 text-center text-xs">
                            <span className="text-white/50 mr-1.5">New to StudioX?</span>
                            <Link href="/register" className="font-semibold text-white hover:text-purple-400 transition-colors">
                                Create Account
                            </Link>
                        </div>
                    </div>

                </div>
            </motion.div>
        </div>
    );
}

declare global {
    interface Window {
        recaptchaVerifier: any;
    }
}
