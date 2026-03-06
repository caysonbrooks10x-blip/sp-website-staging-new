"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Minus } from "lucide-react"

const faqs = [
    {
        question: "Can I change my plan at any time?",
        answer: "Absolutely. You can upgrade, downgrade, or cancel your plan whenever you like. Changes take effect at the start of your next billing cycle, ensuring you only pay for what you need.",
    },
    {
        question: "What happens if I run out of credits?",
        answer: "If you exhaust your monthly credits, you can easily purchase a top-up pack or upgrade to a higher tier plan instantly. We'll also notify you when you're running low so you're never interrupted.",
    },
    {
        question: "Is there a discount for annual billing?",
        answer: "Yes! By choosing the annual billing option, you receive a 20% discount billed as a single upfront payment. It's our way of rewarding long-term commitment to creativity.",
    },
    {
        question: "Do you offer enterprise or team plans?",
        answer: "We do. Our Ultra plan is designed for agencies and power users, but for larger organizations requiring dedicated infrastructure, custom SLAs, and priority onboarding, please contact our sales team.",
    },
    {
        question: "Do unused credits roll over?",
        answer: "Credits do not reset and roll over to the next month. You can accumulate credits over time, ensuring nothing goes to waste.",
    },
]

export function PricingFaq() {
    const [openIndex, setOpenIndex] = useState<number | null>(null)

    return (
        <section className="py-24 px-4 border-t border-white/[0.06]">
            <div className="max-w-3xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Frequently Asked Questions</h2>
                    <p className="text-zinc-500">Everything you need to know about our pricing and plans.</p>
                </motion.div>

                <div className="space-y-3">
                    {faqs.map((faq, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.08 }}
                            className="border border-white/[0.08] rounded-xl bg-white/[0.02] overflow-hidden hover:border-white/[0.12] transition-colors duration-300"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                className="flex items-center justify-between w-full p-5 text-left group"
                            >
                                <span className="font-medium text-base text-white/90 group-hover:text-white transition-colors">{faq.question}</span>
                                <span className="p-1.5 bg-white/[0.06] rounded-full transition-colors duration-300 group-hover:bg-white/10 shrink-0 ml-4">
                                    {openIndex === index ? <Minus className="w-3.5 h-3.5 text-cyan-400" /> : <Plus className="w-3.5 h-3.5 text-zinc-400" />}
                                </span>
                            </button>
                            <AnimatePresence>
                                {openIndex === index && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                    >
                                        <div className="px-5 pb-5 text-zinc-400 leading-relaxed text-sm">
                                            {faq.answer}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
