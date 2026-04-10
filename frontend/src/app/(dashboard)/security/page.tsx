"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ShieldAlert, ShieldCheck, Activity, Users, Globe, Lock, AlertOctagon, Terminal } from "lucide-react"
import { cn } from "@/lib/utils"

// Simulated Enterprise Audit Logs
const AUDIT_LOGS = [
    { id: "SEC-901", user: "system_auto", action: "FIREWALL_BLOCK", target: "IP 192.168.1.45", timestamp: new Date(Date.now() - 1000 * 60 * 2), status: "RESOLVED", severity: "HIGH" },
    { id: "SEC-902", user: "john.doe@company.com", action: "PROMPT_INJECTION_ATTEMPT", target: "RAG_CORE", timestamp: new Date(Date.now() - 1000 * 60 * 15), status: "BLOCKED", severity: "CRITICAL" },
    { id: "SEC-903", user: "admin", action: "DOC_INCINERATION", target: "financial_q3.pdf", timestamp: new Date(Date.now() - 1000 * 60 * 45), status: "SUCCESS", severity: "MEDIUM" },
    { id: "SEC-904", user: "sarah.smith@company.com", action: "VAULT_ACCESS", target: "project_omega.docx", timestamp: new Date(Date.now() - 1000 * 60 * 120), status: "GRANTED", severity: "LOW" },
    { id: "SEC-905", user: "UNKNOWN", action: "FAILED_LOGIN", target: "AUTH_GATEWAY", timestamp: new Date(Date.now() - 1000 * 60 * 180), status: "DENIED", severity: "HIGH" },
]

export default function SecurityPage() {
    const { user } = useAuth()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    return (
        <div className="flex-col md:flex">
            <div className="flex-1 space-y-6 pt-2">
                <div className="flex items-center justify-between space-y-2">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent flex items-center gap-2">
                            <ShieldAlert className="h-8 w-8 text-red-500" />
                            Security Operations Center
                        </h2>
                        <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                            <Activity className="h-4 w-4 text-orange-400" />
                            Live Threat Monitoring & Access Auditing
                        </p>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="glass border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-red-400 uppercase tracking-wider">Active Threats</CardTitle>
                            <AlertOctagon className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-500">3</div>
                            <p className="text-xs text-red-400/80 mt-1 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                Requires Immediate Action
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="glass border-white/5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Intercepted Prompts</CardTitle>
                            <Terminal className="h-4 w-4 text-orange-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">142</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                +12% from last week
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="glass border-white/5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Failed Logins</CardTitle>
                            <Users className="h-4 w-4 text-blue-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">28</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Over past 24 hours
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="glass border-green-500/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-green-400 uppercase tracking-wider">System Status</CardTitle>
                            <ShieldCheck className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-500">SECURE</div>
                            <p className="text-xs text-green-400/80 mt-1">
                                Firewall & DB Encrypted
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Audit Logs Table */}
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
                    <Card className="col-span-7 glass border-white/10 shadow-2xl">
                        <CardHeader className="border-b border-white/5 bg-background/50">
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="h-5 w-5 text-primary" />
                                Live Access Matrix
                            </CardTitle>
                            <CardDescription>
                                Unalterable audit trail of all core system interactions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-black/20">
                                    <TableRow className="border-border/5">
                                        <TableHead className="w-[100px] text-xs font-mono uppercase tracking-wider">Event ID</TableHead>
                                        <TableHead className="text-xs font-mono uppercase tracking-wider">User Identity</TableHead>
                                        <TableHead className="text-xs font-mono uppercase tracking-wider">Action Vector</TableHead>
                                        <TableHead className="text-xs font-mono uppercase tracking-wider">Target</TableHead>
                                        <TableHead className="text-xs font-mono uppercase tracking-wider">Severity</TableHead>
                                        <TableHead className="text-xs font-mono uppercase tracking-wider">Status</TableHead>
                                        <TableHead className="text-right text-xs font-mono uppercase tracking-wider">Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {AUDIT_LOGS.map((log) => (
                                        <TableRow key={log.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                            <TableCell className="font-mono text-xs text-muted-foreground">{log.id}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Lock className="h-3 w-3 text-muted-foreground" />
                                                    <span className={cn(
                                                        "text-sm",
                                                        log.user === "UNKNOWN" ? "text-red-400 font-bold" : "text-foreground/80"
                                                    )}>
                                                        {log.user}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm font-medium">{log.action}</TableCell>
                                            <TableCell className="text-sm text-foreground/70">{log.target}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn(
                                                    "text-[10px] border",
                                                    log.severity === "CRITICAL" ? "border-red-500 text-red-500 bg-red-500/10" :
                                                    log.severity === "HIGH" ? "border-orange-500 text-orange-500 bg-orange-500/10" :
                                                    log.severity === "MEDIUM" ? "border-yellow-500 text-yellow-500 bg-yellow-500/10" :
                                                    "border-blue-500 text-blue-500 bg-blue-500/10"
                                                )}>
                                                    {log.severity}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className={cn(
                                                    "text-[10px]",
                                                    log.status === "BLOCKED" || log.status === "DENIED" ? "bg-red-500/10 text-red-400" :
                                                    "bg-green-500/10 text-green-400"
                                                )}>
                                                    {log.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-xs text-muted-foreground">
                                                {log.timestamp.toLocaleTimeString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
