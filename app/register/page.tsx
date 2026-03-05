"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Loader2, Mail, Lock, User as UserIcon, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
    const { user, loading, signUpWithEmail } = useAuth();
    const router = useRouter();
    const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "" });
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isVerificationSent, setIsVerificationSent] = useState(false);

    // Password Visibility State
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const redirectPath = useRef("/");

    useEffect(() => {
        // Capture redirect params once on mount
        const params = new URLSearchParams(window.location.search);
        redirectPath.current = params.get('redirect') || "/onboarding";
    }, []);

    useEffect(() => {
        // If we have a user (session), it means they are verified (or confirmation is off).
        // We should redirect them immediately to onboarding.
        if (!loading && user) {
            router.push(redirectPath.current || "/onboarding");
        }
    }, [user, loading, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setIsSubmitting(true);
        try {
            await signUpWithEmail(formData.email, formData.password, formData.name);
            setIsVerificationSent(true);
            setIsSubmitting(false);
        } catch (err: any) {
            setError(err.message || "Failed to register");
            setIsSubmitting(false);
        }
    };

    if (loading) return null;

    if (isVerificationSent) {
        return (
            <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-[#050505] px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-[500px] relative z-10"
                >
                    <div className="bg-black/60 rounded-3xl shadow-2xl border border-white/10 p-10 text-center backdrop-blur-md">
                        <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                            <Mail className="w-8 h-8 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4">Check your inbox</h2>
                        <p className="text-white/60 mb-8">
                            We've sent a verification link to <span className="text-white font-medium">{formData.email}</span>.
                            <br />
                            Please click the link in your email to verify your account.
                        </p>
                        <div className="flex gap-3">
                            <Button
                                onClick={() => window.location.reload()}
                                className="flex-1 h-11 bg-[#ccff00] text-black hover:bg-[#b3e600] font-bold rounded-xl"
                            >
                                I've Verified
                            </Button>
                            <Link href="/login" className="flex-1">
                                <Button variant="outline" className="w-full h-11 border-white/10 text-white hover:bg-white/10 font-medium rounded-xl">
                                    Sign In
                                </Button>
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-[#050505] px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">

            {/* Background Ambience */}
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-[500px] relative z-10"
            >
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Create Account</h2>
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
                        <form className="space-y-5" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <Label className="text-white/50 text-[10px] uppercase font-bold tracking-widest pl-1">Full Name</Label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-white/50 transition-colors group-focus-within:text-white" />
                                    <Input
                                        name="name"
                                        type="text"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="pl-10 pr-4 h-11 bg-black/40 border-white/10 text-white focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:border-white/30 focus-visible:ring-offset-0 transition-all rounded-xl backdrop-blur-md"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-white/50 text-[10px] uppercase font-bold tracking-widest pl-1">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                                    <Input
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="pl-10 pr-4 h-11 bg-black/40 border-white/10 text-white focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:border-white/30 focus-visible:ring-offset-0 transition-all rounded-xl backdrop-blur-md"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-white/50 text-[10px] uppercase font-bold tracking-widest pl-1">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                                    <Input
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="pl-10 pr-10 h-11 bg-black/40 border-white/10 text-white focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:border-white/30 focus-visible:ring-offset-0 transition-all rounded-xl backdrop-blur-md"
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

                            <div className="space-y-2">
                                <Label className="text-white/50 text-[10px] uppercase font-bold tracking-widest pl-1">Confirm Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                                    <Input
                                        name="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="pl-10 pr-10 h-11 bg-black/40 border-white/10 text-white focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:border-white/30 focus-visible:ring-offset-0 transition-all rounded-xl backdrop-blur-md"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors cursor-pointer"
                                        tabIndex={-1}
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {error && <p className="text-xs text-red-400 text-center pt-2 font-medium">{error}</p>}

                            <Button type="submit" className="w-full h-11 bg-white text-black hover:bg-white/90 font-bold rounded-xl mt-4 shadow-lg shadow-white/5 transition-transform active:scale-[0.98]" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign Up"}
                            </Button>
                        </form>

                        <div className="mt-8 text-center text-xs">
                            <span className="text-white/50 mr-1.5">Already have an account?</span>
                            <Link href="/login" className="font-semibold text-white hover:text-purple-400 transition-colors">
                                Sign in
                            </Link>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
