import type { Metadata } from 'next'
import Script from 'next/script'
import { Roboto, Roboto_Mono } from 'next/font/google'
import './globals.css'

const roboto = Roboto({
  variable: '--font-roboto',
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '700', '900'],
})

const robotoMono = Roboto_Mono({
  variable: '--font-roboto-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Shape for Growth - Concierge by Decentral',
}
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${roboto.variable} ${robotoMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id="1de290ef-d75a-4541-8d71-5b37ad12a139"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  )
}
