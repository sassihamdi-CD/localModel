import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/auth-provider'; // Import AuthProvider

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'SecureDoc-RAG',
    description: 'Privacy-Preserving Retrieval-Augmented Chatbot for Sensitive Organizational Documents',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <AuthProvider>{children}</AuthProvider> {/* Wrap with AuthProvider */}
                    <Toaster position="top-right" richColors />
                </ThemeProvider>
            </body>
        </html>
    )
}
