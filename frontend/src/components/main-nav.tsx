"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-provider"

export function MainNav({
    className,
    ...props
}: React.HTMLAttributes<HTMLElement>) {
    const pathname = usePathname()
    const { user } = useAuth()

    if (!user) return null

    const navigation = [
        {
            name: "Dashboard",
            href: "/dashboard",
            active: pathname === "/dashboard",
            show: true,
        },
        {
            name: "Chat",
            href: "/chat",
            active: pathname === "/chat",
            show: user.permissions?.includes("CHAT"),
        },
        {
            name: "Documents",
            href: "/documents",
            active: pathname === "/documents",
            show: user.permissions?.includes("VIEW_DOC"),
        },
        {
            name: "Admin",
            href: "/admin",
            active: pathname.startsWith("/admin"),
            show: user.roles?.includes("ADMIN") || user.permissions?.includes("MANAGE_USERS"),
        },
        {
            name: "Audit Logs",
            href: "/logs",
            active: pathname === "/logs",
            show: user.permissions?.includes("VIEW_LOGS"),
        },
    ]

    return (
        <nav
            className={cn("flex items-center space-x-4 lg:space-x-6", className)}
            {...props}
        >
            {navigation
                .filter((item) => item.show)
                .map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "text-sm font-medium transition-colors hover:text-primary",
                            item.active
                                ? "text-foreground"
                                : "text-muted-foreground"
                        )}
                    >
                        {item.name}
                    </Link>
                ))}
        </nav>
    )
}
