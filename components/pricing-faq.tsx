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
        answer: "Yes! By choosing the annual billing option, you save 20% compared to the monthly rate. It's our way of rewarding long-term commitment to creativity.",
    },
    {
        question: "Do you offer enterprise or team plans?",
        answer: "We do. Our Business plan is designed for small teams, but for larger organizations requiring SSO, dedicated support, and custom SLAs, please contact our sales team.",
    },
]

export function PricingFaq() {
    const [openIndex, setOpenIndex] = useState<number | null>(null)

    return (
        <section className="py-24 px-4 bg-secondary/5 border-t border-border/50">
            <div className="max-w-3xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
                    <p className="text-muted-foreground">Everything you need to know about our pricing and plans.</p>
                </motion.div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="border border-border/50 rounded-2xl bg-card overflow-hidden"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                className="flex items-center justify-between w-full p-6 text-left"
                            >
                                <span className="font-semibold text-lg">{faq.question}</span>
                                <span className="p-2 bg-secondary rounded-full transition-colors duration-300 group-hover:bg-secondary/80">
                                    {openIndex === index ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
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
                                        <div className="px-6 pb-6 text-muted-foreground leading-relaxed">
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
