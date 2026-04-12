"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { Shield, FileText, MessageSquare, Activity, Cpu, Database, Server } from "lucide-react"
import { cn } from "@/lib/utils"
import api from "@/lib/api"

interface Stats {
    documents: number
    queries: number
    intercepted_threats: number
}

export default function DashboardPage() {
    const { user } = useAuth()
    const [stats, setStats] = useState<Stats | null>(null)

    useEffect(() => {
        api.get("/stats").then(res => setStats(res.data)).catch(() => {})
    }, [])

    const kpiData = [
        {
            title: "Indexed Documents",
            value: stats ? stats.documents.toLocaleString() : "—",
            icon: FileText,
        },
        {
            title: "RAG Queries",
            value: stats ? stats.queries.toLocaleString() : "—",
            icon: MessageSquare,
        },
        {
            title: "Intercepted Threats",
            value: stats ? stats.intercepted_threats.toLocaleString() : "—",
            icon: Shield,
        },
        {
            title: "Active Sessions",
            value: "Live",
            icon: Activity,
        },
    ]

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header section */}
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-blue-400 to-indigo-500 bg-clip-text text-transparent pb-1">
                    Command Center
                </h1>
                <p className="text-muted-foreground/80 font-medium">
                    Welcome back, <span className="text-foreground">{user?.name}</span>. Secure network status is nominal.
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {kpiData.map((kpi, idx) => (
                    <div
                        key={idx}
                        className="glass relative overflow-hidden rounded-2xl p-6 border border-white/5 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_-5px_rgba(56,189,248,0.2)] group"
                        style={{ animationDelay: `${idx * 100}ms` }}
                    >
                        <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                            <kpi.icon className="h-32 w-32" />
                        </div>
                        <div className="flex flex-row items-center justify-between pb-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{kpi.title}</h3>
                            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                                <kpi.icon className="h-4 w-4" />
                            </div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold tracking-tight text-foreground/90">{kpi.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-7">
                {/* Simulated Live Analytics Chart */}
                <div className="glass col-span-4 rounded-2xl border border-white/5 p-6 flex flex-col gap-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>

                    <div>
                        <h3 className="text-xl font-bold">RAG Retrieval Throughput</h3>
                        <p className="text-sm text-muted-foreground/70">Vectors processed per second (live stream)</p>
                    </div>

                    <div className="flex-1 flex items-end gap-2 h-48 mt-4 pt-4 border-b border-white/5">
                        {Array.from({ length: 30 }).map((_, i) => {
                            const height = Math.random() * 100 + 20
                            return (
                                <div key={i} className="flex-1 flex flex-col justify-end h-full group relative">
                                    <div
                                        className="w-full bg-primary/20 hover:bg-primary/60 rounded-t-sm transition-all duration-300"
                                        style={{ height: `${height}%`, animationDelay: `${i * 50}ms` }}
                                    >
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-1 rounded text-[10px] font-mono text-primary whitespace-nowrap z-10 pointer-events-none">
                                            {Math.floor(height * 14)} ctx
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* System Diagnostics */}
                <div className="glass col-span-3 rounded-2xl border border-white/5 p-6 flex flex-col">
                    <div>
                        <h3 className="text-xl font-bold">System Diagnostics</h3>
                        <p className="text-sm text-muted-foreground/70">Matrix health overview</p>
                    </div>

                    <div className="flex-1 flex flex-col justify-center gap-6 mt-6">
                        <div className="flex items-center gap-4 group">
                            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                                <Database className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                                <div className="absolute h-full w-full rounded-full border border-primary/40 animate-ping opacity-20" style={{ animationDuration: '3s' }}></div>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="text-sm font-bold">Vector Database (Chroma)</h4>
                                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">ONLINE</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary w-[85%] rounded-full shadow-[0_0_10px_rgba(56,189,248,0.8)]"></div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 group">
                            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 border border-indigo-500/20">
                                <Cpu className="h-5 w-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                                <div className="absolute h-full w-full rounded-full border border-indigo-400/40 animate-ping opacity-20" style={{ animationDuration: '2.5s', animationDelay: '1s' }}></div>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="text-sm font-bold">Local LLM Interface</h4>
                                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">READY</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-400 w-[92%] rounded-full shadow-[0_0_10px_rgba(129,140,248,0.8)]"></div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 group">
                            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20">
                                <Server className="h-5 w-5 text-rose-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="text-sm font-bold">API Gateway</h4>
                                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">STABLE</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-rose-400 w-[45%] rounded-full shadow-[0_0_10px_rgba(251,113,133,0.8)]"></div>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1.5">Load balanced • Encrypted • Local only</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
