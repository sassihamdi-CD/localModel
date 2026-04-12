"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, UserCheck, UserX, Users, Key, Clock, ShieldAlert, RefreshCw, Lock, Trash2, Plus, FileText } from "lucide-react"
import api from "@/lib/api"
import { toast } from "sonner"

interface AccessRequest {
    id: number
    email: string
    name: string
    department: string | null
    reason: string | null
    status: string
    created_at: string
}

interface SystemUser {
    id: number
    email: string
    name: string
    department: string | null
    status: string
    created_at: string
}

interface Role {
    id: number
    name: string
    description: string | null
}

interface RestrictedDoc {
    id: number
    title: string
    classification: string
    department: string | null
}

interface ACLEntry {
    id: number
    document_id: number
    type: "role" | "user"
    role_id?: number
    user_id?: number
    label: string
}

export default function AdminPage() {
    const { user: currentUser } = useAuth()
    const [requests, setRequests] = useState<AccessRequest[]>([])
    const [users, setUsers] = useState<SystemUser[]>([])
    const [roles, setRoles] = useState<Role[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

    // Document ACL state
    const [restrictedDocs, setRestrictedDocs] = useState<RestrictedDoc[]>([])
    const [selectedDocId, setSelectedDocId] = useState<number | null>(null)
    const [docACL, setDocACL] = useState<ACLEntry[]>([])
    const [aclLoading, setAclLoading] = useState(false)
    const [grantType, setGrantType] = useState<"role" | "user">("role")
    const [grantRoleId, setGrantRoleId] = useState<string>("")
    const [grantUserId, setGrantUserId] = useState<string>("")

    const fetchData = async () => {
        setIsLoading(true)
        try {
            const [reqRes, userRes, roleRes, docRes] = await Promise.all([
                api.get("/admin/access-requests"),
                api.get("/admin/users"),
                api.get("/admin/roles"),
                api.get("/docs/restricted"),
            ])
            setRequests(reqRes.data)
            setUsers(userRes.data)
            setRoles(roleRes.data)
            setRestrictedDocs(docRes.data)
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Access denied. Admin permissions required.")
        } finally {
            setIsLoading(false)
        }
    }

    const loadDocACL = async (docId: number) => {
        setSelectedDocId(docId)
        setAclLoading(true)
        try {
            const res = await api.get(`/docs/${docId}/acl`)
            setDocACL(res.data)
        } catch {
            toast.error("Failed to load ACL.")
        } finally {
            setAclLoading(false)
        }
    }

    const handleGrantAccess = async () => {
        if (!selectedDocId) return
        const body = grantType === "role"
            ? { role_id: parseInt(grantRoleId) }
            : { user_id: parseInt(grantUserId) }
        try {
            await api.post(`/docs/${selectedDocId}/acl`, body)
            toast.success("Access granted.")
            setGrantRoleId("")
            setGrantUserId("")
            loadDocACL(selectedDocId)
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Failed to grant access.")
        }
    }

    const handleRevokeAccess = async (docId: number, aclId: number) => {
        try {
            await api.delete(`/docs/${docId}/acl/${aclId}`)
            toast.success("Access revoked.")
            setDocACL(prev => prev.filter(e => e.id !== aclId))
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Failed to revoke access.")
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleRequestAction = async (id: number, action: "approve" | "deny") => {
        const key = `req-${id}-${action}`
        setActionLoading(prev => ({ ...prev, [key]: true }))
        try {
            if (action === "approve") {
                // Default to EMPLOYEE role (id=2) — first non-admin role
                const employeeRole = roles.find(r => r.name === "EMPLOYEE") || roles[1] || roles[0]
                await api.post(`/admin/access-requests/${id}/approve`, {
                    role_ids: [employeeRole?.id ?? 2],
                })
            } else {
                await api.post(`/admin/access-requests/${id}/deny`, {})
            }
            toast.success(`Request ${action === "approve" ? "approved" : "denied"} successfully.`)
            fetchData()
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Action failed.")
        } finally {
            setActionLoading(prev => ({ ...prev, [key]: false }))
        }
    }

    const handleUserStatusChange = async (userId: number, newStatus: string) => {
        const key = `user-status-${userId}`
        setActionLoading(prev => ({ ...prev, [key]: true }))
        try {
            await api.patch(`/admin/users/${userId}`, { status: newStatus })
            toast.success("User status updated.")
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u))
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Failed to update status.")
        } finally {
            setActionLoading(prev => ({ ...prev, [key]: false }))
        }
    }

    const handleUserRoleChange = async (userId: number, roleId: number) => {
        const key = `user-role-${userId}`
        setActionLoading(prev => ({ ...prev, [key]: true }))
        try {
            await api.patch(`/admin/users/${userId}`, { role_ids: [roleId] })
            toast.success("User role updated.")
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Failed to update role.")
        } finally {
            setActionLoading(prev => ({ ...prev, [key]: false }))
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-96 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Security Administration</h1>
                    <p className="text-muted-foreground">Manage organizational access and oversee user roles.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={fetchData} className="gap-2 border-white/10">
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </Button>
                    <Badge className="gap-2 px-4 py-2 bg-orange-500/10 text-orange-500 border-orange-500/20">
                        <ShieldAlert className="h-4 w-4" />
                        Admin Control Panel
                    </Badge>
                </div>
            </div>

            <Tabs defaultValue="requests" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="requests" className="rounded-lg px-6 py-2">
                        <Key className="mr-2 h-4 w-4" />
                        Access Requests
                        {requests.length > 0 && (
                            <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-orange-500 text-white rounded-full">
                                {requests.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="users" className="rounded-lg px-6 py-2">
                        <Users className="mr-2 h-4 w-4" />
                        System Users
                    </TabsTrigger>
                    <TabsTrigger value="docacl" className="rounded-lg px-6 py-2">
                        <Lock className="mr-2 h-4 w-4" />
                        Document Access
                    </TabsTrigger>
                </TabsList>

                {/* Access Requests Tab */}
                <TabsContent value="requests">
                    <Card className="border-muted/50 shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b">
                            <CardTitle>Pending Approvals</CardTitle>
                            <CardDescription>Review new personnel requesting system access.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {requests.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground italic">No pending requests.</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="px-6 py-4">Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Department</TableHead>
                                            <TableHead>Reason</TableHead>
                                            <TableHead className="text-right px-6">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {requests.map((req) => (
                                            <TableRow key={req.id}>
                                                <TableCell className="px-6 font-medium">{req.name}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{req.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{req.department || "—"}</Badge>
                                                </TableCell>
                                                <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                                                    {req.reason || "—"}
                                                </TableCell>
                                                <TableCell className="text-right px-6">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 gap-2 border-green-500/50 text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10"
                                                            onClick={() => handleRequestAction(req.id, "approve")}
                                                            disabled={actionLoading[`req-${req.id}-approve`]}
                                                        >
                                                            {actionLoading[`req-${req.id}-approve`]
                                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                : <UserCheck className="h-3.5 w-3.5" />}
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleRequestAction(req.id, "deny")}
                                                            disabled={actionLoading[`req-${req.id}-deny`]}
                                                        >
                                                            {actionLoading[`req-${req.id}-deny`]
                                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                : <UserX className="h-3.5 w-3.5" />}
                                                            Deny
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* System Users Tab */}
                <TabsContent value="users">
                    <Card className="border-muted/50 shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b">
                            <CardTitle>System Accounts</CardTitle>
                            <CardDescription>
                                Manage registered users — update status and role assignments.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="px-6 py-4">User</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead className="flex items-center gap-2"><Clock className="h-3 w-3" /> Joined</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((u) => (
                                        <TableRow key={u.id}>
                                            <TableCell className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{u.name}</span>
                                                    <span className="text-xs text-muted-foreground">{u.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{u.department || "—"}</TableCell>
                                            <TableCell>
                                                <Select
                                                    value={u.status}
                                                    onValueChange={(val) => handleUserStatusChange(u.id, val)}
                                                    disabled={!!actionLoading[`user-status-${u.id}`] || u.id === currentUser?.id}
                                                >
                                                    <SelectTrigger className="h-8 w-32 text-xs border-white/10 bg-background/50">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                                                        <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                                                        <SelectItem value="DENIED">DENIED</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    onValueChange={(val) => handleUserRoleChange(u.id, parseInt(val))}
                                                    disabled={!!actionLoading[`user-role-${u.id}`] || roles.length === 0}
                                                >
                                                    <SelectTrigger className="h-8 w-36 text-xs border-white/10 bg-background/50">
                                                        <SelectValue placeholder="Assign role..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {roles.map(r => (
                                                            <SelectItem key={r.id} value={String(r.id)}>
                                                                {r.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {new Date(u.created_at).toLocaleDateString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                {/* Document Access Control Tab */}
                <TabsContent value="docacl">
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Left: Document list */}
                        <Card className="border-muted/50 shadow-sm overflow-hidden">
                            <CardHeader className="bg-muted/10 border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Confidential & Restricted Documents
                                </CardTitle>
                                <CardDescription>
                                    Click a document to manage who can access it.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {restrictedDocs.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground italic text-sm">
                                        No confidential or restricted documents uploaded yet.
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="px-6 py-3">Document</TableHead>
                                                <TableHead>Level</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {restrictedDocs.map((doc) => (
                                                <TableRow
                                                    key={doc.id}
                                                    className={`cursor-pointer transition-colors ${selectedDocId === doc.id ? "bg-primary/10" : "hover:bg-muted/30"}`}
                                                    onClick={() => loadDocACL(doc.id)}
                                                >
                                                    <TableCell className="px-6 py-3">
                                                        <div className="font-medium text-sm">{doc.title}</div>
                                                        {doc.department && <div className="text-xs text-muted-foreground">{doc.department}</div>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={doc.classification === "RESTRICTED"
                                                                ? "border-red-500/30 text-red-400 text-[10px]"
                                                                : "border-orange-500/30 text-orange-400 text-[10px]"}
                                                        >
                                                            {doc.classification}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>

                        {/* Right: ACL management for selected doc */}
                        <Card className="border-muted/50 shadow-sm overflow-hidden">
                            <CardHeader className="bg-muted/10 border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <Lock className="h-4 w-4" />
                                    {selectedDocId
                                        ? `Access List — ${restrictedDocs.find(d => d.id === selectedDocId)?.title || ""}`
                                        : "Select a document"}
                                </CardTitle>
                                <CardDescription>
                                    {selectedDocId
                                        ? "Grant or revoke access for roles and users."
                                        : "Click a document on the left to manage its access."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                {!selectedDocId ? (
                                    <div className="text-center py-10 text-muted-foreground italic text-sm">
                                        No document selected.
                                    </div>
                                ) : aclLoading ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    <>
                                        {/* Current ACL entries */}
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                Current Access ({docACL.length})
                                            </p>
                                            {docACL.length === 0 ? (
                                                <p className="text-xs text-muted-foreground italic py-2">No explicit grants — only the owner and admins can access this document.</p>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    {docACL.map((entry) => (
                                                        <div key={entry.id} className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2">
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className={`text-[10px] ${entry.type === "role" ? "border-blue-500/30 text-blue-400" : "border-purple-500/30 text-purple-400"}`}>
                                                                    {entry.type}
                                                                </Badge>
                                                                <span className="text-sm font-medium">{entry.label}</span>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive"
                                                                onClick={() => handleRevokeAccess(selectedDocId, entry.id)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Grant new access */}
                                        <div className="space-y-3 border-t border-white/10 pt-4">
                                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Grant New Access</p>
                                            <div className="flex gap-2">
                                                <Select value={grantType} onValueChange={(v) => setGrantType(v as "role" | "user")}>
                                                    <SelectTrigger className="h-9 w-24 text-xs border-white/10 bg-background/50">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="role">Role</SelectItem>
                                                        <SelectItem value="user">User</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {grantType === "role" ? (
                                                    <Select value={grantRoleId} onValueChange={setGrantRoleId}>
                                                        <SelectTrigger className="h-9 flex-1 text-xs border-white/10 bg-background/50">
                                                            <SelectValue placeholder="Select role..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {roles.map(r => (
                                                                <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <Select value={grantUserId} onValueChange={setGrantUserId}>
                                                        <SelectTrigger className="h-9 flex-1 text-xs border-white/10 bg-background/50">
                                                            <SelectValue placeholder="Select user..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {users.map(u => (
                                                                <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.email})</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                                <Button
                                                    size="sm"
                                                    className="h-9 gap-1.5 bg-primary/80 hover:bg-primary"
                                                    onClick={handleGrantAccess}
                                                    disabled={grantType === "role" ? !grantRoleId : !grantUserId}
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    Grant
                                                </Button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
