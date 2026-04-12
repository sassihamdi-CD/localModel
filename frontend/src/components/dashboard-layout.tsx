"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, LogOut, User as UserIcon, Shield, FileText, MessageSquare, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
    children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const { user, logout } = useAuth()
    const pathname = usePathname()
    const [isMobileOpen, setIsMobileOpen] = useState(false)

    const allRoutes = [
        {
            href: "/chat",
            label: "Chat",
            icon: MessageSquare,
            active: pathname === "/chat",
            show: user?.permissions?.includes("CHAT"),
        },
        {
            href: "/documents",
            label: "Documents",
            icon: FileText,
            active: pathname === "/documents",
            show: user?.permissions?.includes("VIEW_DOC"),
        },
        {
            href: "/security",
            label: "Audit Logs",
            icon: Activity,
            active: pathname === "/security",
            show: user?.permissions?.includes("VIEW_LOGS"),
        },
        {
            href: "/admin",
            label: "Admin",
            icon: Shield,
            active: pathname === "/admin",
            show: user?.roles?.includes("ADMIN") || user?.permissions?.includes("MANAGE_USERS"),
        },
    ]

    const routes = allRoutes.filter((r) => r.show)

    return (
        <div className="flex min-h-screen flex-col bg-background/50">
            <header className="sticky top-0 z-50 w-full border-b border-border/40 glass">
                <div className="container flex h-16 items-center">
                    <div className="mr-4 hidden md:flex">
                        <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
                            <Shield className="h-6 w-6" />
                            <span className="hidden font-bold sm:inline-block">
                                SecureDoc RAG
                            </span>
                        </Link>
                        <nav className="flex items-center space-x-6 text-sm font-medium">
                            {routes.map((route) => (
                                <Link
                                    key={route.href}
                                    href={route.href}
                                    className={cn(
                                        "transition-colors hover:text-foreground/80",
                                        route.active ? "text-foreground" : "text-foreground/60"
                                    )}
                                >
                                    {route.label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                    <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
                            >
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="pr-0">
                            <nav className="flex flex-col space-y-4">
                                {routes.map((route) => (
                                    <Link
                                        key={route.href}
                                        href={route.href}
                                        className="flex items-center text-lg font-medium"
                                        onClick={() => setIsMobileOpen(false)}
                                    >
                                        <route.icon className="mr-2 h-5 w-5" />
                                        {route.label}
                                    </Link>
                                ))}
                            </nav>
                        </SheetContent>
                    </Sheet>
                    <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                        <div className="w-full flex-1 md:w-auto md:flex-none">
                            {/* Search or other controls */}
                        </div>
                        <nav className="flex items-center space-x-2">
                            <ModeToggle />
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                        <Avatar className="h-8 w-8 bg-primary/10 border border-primary/20">
                                            <AvatarFallback className="text-primary font-semibold">{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{user?.name}</p>
                                            <p className="text-xs leading-none text-muted-foreground">
                                                {user?.email}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild className="cursor-pointer">
                                        <Link href="/profile" className="flex items-center w-full">
                                            <UserIcon className="mr-2 h-4 w-4" />
                                            <span>Identity Node</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Log out</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </nav>
                    </div>
                </div>
            </header>
            <main className="flex-1 space-y-4 p-8 pt-6">
                {children}
            </main>
        </div>
    )
}
