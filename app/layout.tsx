import type React from "react"
import type { Metadata, Viewport } from "next"
import Script from "next/script"
import { Playfair_Display, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Navbar } from "@/components/navbar"
import { SmoothScroll } from "@/components/smooth-scroll"
import { AuthProvider } from "@/context/auth-context"
import { PartneroIdentify } from "@/components/partnero-identify"
import { ASSET_BASE } from "@/lib/assets"

// Partnero affiliate tracking program key (GAIA Partners, program 12082).
const PARTNERO_PROGRAM_KEY = process.env.NEXT_PUBLIC_PARTNERO_PROGRAM_KEY || "WRH67XHJ"

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "StudioX - AI Creative Platform",
  description: "Create amazing AI-generated content with StudioX",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: `${ASSET_BASE}/icon-light-32x32.png`,
        media: "(prefers-color-scheme: light)",
      },
      {
        url: `${ASSET_BASE}/icon-dark-32x32.png`,
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: `${ASSET_BASE}/icon.svg`,
        type: "image/svg+xml",
      },
    ],
    apple: `${ASSET_BASE}/apple-icon.png`,
  },
}

export const viewport: Viewport = {
  themeColor: "#050505",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Preconnect hints — measured 1.5–6s tail latency on these hosts in
            the perf audit. Pre-warming the TLS handshake shaves ~200–400ms
            off the first asset request from each. */}
        <link rel="preconnect" href="https://storage.googleapis.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://storage.googleapis.com" />
        <link rel="preconnect" href="https://app.partnero.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://app.partnero.com" />
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="" />
      </head>
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`} suppressHydrationWarning>
        {/* Partnero affiliate tracking — fires on every page view, attributes
            referrals to the active partner cookie. afterInteractive so it
            doesn't block initial paint. */}
        <Script id="partnero-universal" strategy="afterInteractive">
          {`(function(p,t,n,e,o){p['__partnerObject']=n;function f(){
            var c={a:arguments,q:[]};var r=this.push(c);return "number"!=typeof r?r:f.bind(c.q);}
            f.q=f.q||[];p[n]=p[n]||f.bind(f.q);p[n].q=p[n].q||f.q;o=t.createElement('script');
            var _=t.getElementsByTagName('script')[0];o.async=1;o.src=e+'?v'+(~~(new Date().getTime()/1e6));
            _.parentNode.insertBefore(o,_)})(window,document,'po','https://app.partnero.com/js/universal.js');
            po('settings', 'assets_host', 'https://assets.partnero.com');
            po('program', '${PARTNERO_PROGRAM_KEY}', 'load');`}
        </Script>
        <AuthProvider>
          <PartneroIdentify />
          <SmoothScroll>
            <Navbar />
            {children}
            <Analytics />
          </SmoothScroll>
        </AuthProvider>
      </body>
    </html>
  )
}
