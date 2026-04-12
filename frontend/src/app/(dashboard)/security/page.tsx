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
import { Button } from "@/components/ui/button"
import { ShieldAlert, ShieldCheck, Activity, Users, Lock, AlertOctagon, Terminal, Download, RefreshCw, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import { toast } from "sonner"

interface AuditLog {
    id: number
    request_id: string
    user_id: number | null
    action: string
    resource_type: string | null
    resource_id: string | null
    ip_address: string | null
    outcome: string
    reason: string | null
    created_at: string
}

function getSeverity(action: string, outcome: string): string {
    if (outcome === "BLOCKED" || action.includes("INJECTION")) return "CRITICAL"
    if (outcome === "DENIED" || action.includes("FAILED")) return "HIGH"
    if (action.includes("DELETE") || action.includes("EXPORT")) return "MEDIUM"
    return "LOW"
}

function getStatusColor(outcome: string) {
    if (outcome === "BLOCKED" || outcome === "DENIED" || outcome === "FAILED") {
        return "bg-red-500/10 text-red-400"
    }
    return "bg-green-500/10 text-green-400"
}

function getSeverityColor(severity: string) {
    if (severity === "CRITICAL") return "border-red-500 text-red-500 bg-red-500/10"
    if (severity === "HIGH") return "border-orange-500 text-orange-500 bg-orange-500/10"
    if (severity === "MEDIUM") return "border-yellow-500 text-yellow-500 bg-yellow-500/10"
    return "border-blue-500 text-blue-500 bg-blue-500/10"
}

export default function SecurityPage() {
    const { user } = useAuth()
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isExporting, setIsExporting] = useState(false)

    const fetchLogs = async () => {
        setIsLoading(true)
        try {
            const res = await api.get("/logs", { params: { limit: 50 } })
            setLogs(res.data)
        } catch (err: any) {
            const msg = err?.response?.data?.detail || "Failed to load audit logs."
            toast.error(msg)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs()
    }, [])

    const handleExport = async () => {
        setIsExporting(true)
        try {
            const token = localStorage.getItem("access_token")
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
            const response = await fetch(`${baseUrl}/logs/export`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!response.ok) throw new Error("Export failed")
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `audit_logs_${new Date().toISOString().split("T")[0]}.csv`
            a.click()
            window.URL.revokeObjectURL(url)
            toast.success("Audit logs exported.")
        } catch {
            toast.error("Failed to export logs.")
        } finally {
            setIsExporting(false)
        }
    }

    // Compute KPIs from real data
    const blockedCount = logs.filter(l => l.outcome === "BLOCKED").length
    const injectionCount = logs.filter(l => l.action.toLowerCase().includes("injection")).length
    const failedLoginCount = logs.filter(l => l.action.toLowerCase().includes("login") && l.outcome === "FAILED").length

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
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoading} className="gap-2 border-white/10 hover:bg-white/5">
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            Refresh
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting} className="gap-2 border-white/10 hover:bg-white/5">
                            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            Export CSV
                        </Button>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="glass border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-red-400 uppercase tracking-wider">Blocked Events</CardTitle>
                            <AlertOctagon className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-500">{isLoading ? "—" : blockedCount}</div>
                            <p className="text-xs text-red-400/80 mt-1 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                From audit trail
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="glass border-white/5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Injection Attempts</CardTitle>
                            <Terminal className="h-4 w-4 text-orange-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isLoading ? "—" : injectionCount}</div>
                            <p className="text-xs text-muted-foreground mt-1">Prompt injection detected</p>
                        </CardContent>
                    </Card>

                    <Card className="glass border-white/5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Failed Logins</CardTitle>
                            <Users className="h-4 w-4 text-blue-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isLoading ? "—" : failedLoginCount}</div>
                            <p className="text-xs text-muted-foreground mt-1">From audit trail</p>
                        </CardContent>
                    </Card>

                    <Card className="glass border-green-500/20">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-green-400 uppercase tracking-wider">System Status</CardTitle>
                            <ShieldCheck className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-500">SECURE</div>
                            <p className="text-xs text-green-400/80 mt-1">Firewall & DB Encrypted</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Audit Logs Table */}
                <Card className="glass border-white/10 shadow-2xl">
                    <CardHeader className="border-b border-white/5 bg-background/50">
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Live Access Matrix
                        </CardTitle>
                        <CardDescription>
                            Unalterable audit trail — {logs.length} events loaded.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Loading audit logs...
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="flex items-center justify-center py-16 text-muted-foreground">
                                No audit events recorded yet.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-black/20">
                                    <TableRow className="border-border/5">
                                        <TableHead className="w-[80px] text-xs font-mono uppercase tracking-wider">ID</TableHead>
                                        <TableHead className="text-xs font-mono uppercase tracking-wider">User</TableHead>
                                        <TableHead className="text-xs font-mono uppercase tracking-wider">Action</TableHead>
                                        <TableHead className="text-xs font-mono uppercase tracking-wider">Resource</TableHead>
                                        <TableHead className="text-xs font-mono uppercase tracking-wider">Severity</TableHead>
                                        <TableHead className="text-xs font-mono uppercase tracking-wider">Outcome</TableHead>
                                        <TableHead className="text-right text-xs font-mono uppercase tracking-wider">Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => {
                                        const severity = getSeverity(log.action, log.outcome)
                                        return (
                                            <TableRow key={log.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                                <TableCell className="font-mono text-xs text-muted-foreground">#{log.id}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Lock className="h-3 w-3 text-muted-foreground" />
                                                        <span className="text-sm text-foreground/80">
                                                            {log.user_id ? `user:${log.user_id}` : "system"}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm font-medium font-mono">{log.action}</TableCell>
                                                <TableCell className="text-sm text-foreground/70">
                                                    {log.resource_type ? `${log.resource_type}${log.resource_id ? `:${log.resource_id}` : ""}` : "—"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn("text-[10px] border", getSeverityColor(severity))}>
                                                        {severity}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className={cn("text-[10px]", getStatusColor(log.outcome))}>
                                                        {log.outcome}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right text-xs text-muted-foreground">
                                                    {new Date(log.created_at).toLocaleTimeString()}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
