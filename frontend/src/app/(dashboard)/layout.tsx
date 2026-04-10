"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout"
import { useAuth } from "@/components/auth-provider"
import { Loader2 } from "lucide-react"

export default function Layout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login")
        }
    }, [user, isLoading, router])

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!user) {
        return null // Will redirect
    }

    return <DashboardLayout>{children}</DashboardLayout>
}
