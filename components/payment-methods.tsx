import Image from "next/image"

const paymentMethods = [
  { name: "Visa", icon: "/payment/visa.svg" },
  { name: "Mastercard", icon: "/payment/mastercard.svg" },
  { name: "American Express", icon: "/payment/amex.svg" },
  { name: "JCB", icon: "/payment/jcb.svg" },
  { name: "UnionPay", icon: "/payment/unionpay.svg" },
  { name: "Alipay", icon: "/payment/alipay.svg" },
  { name: "Apple Pay", icon: "/payment/apple-pay.svg" },
  { name: "Google Pay", icon: "/payment/google-pay.svg" },
]

export function PaymentMethods() {
  return (
    <section className="relative z-10 py-12 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        <div className="flex items-center gap-2 mb-8 text-white/60">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span className="text-sm font-medium">Pay safely and securely with</span>
        </div>

        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6">
          {paymentMethods.map((method) => (
            <div
              key={method.name}
              className="w-16 h-10 sm:w-20 sm:h-12 md:w-24 md:h-14 bg-[#111111] border border-white/10 rounded-xl flex items-center justify-center p-2 sm:p-3 hover:bg-[#1a1a1a] transition-all group hover:-translate-y-0.5"
            >
              <div className="relative w-full h-full opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300">
                <Image
                  src={method.icon}
                  alt={method.name}
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
