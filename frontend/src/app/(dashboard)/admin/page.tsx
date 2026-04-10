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
import { Loader2, UserCheck, UserX, Users, Key, Clock, ShieldAlert } from "lucide-react"
import api from "@/lib/api"
import { toast } from "sonner"

interface AccessRequest {
    id: number
    email: string
    name: string
    department: string
    reason: string
    status: string
    created_at: string
}

interface SystemUser {
    id: number
    email: string
    name: string
    department: string
    status: string
    created_at: string
}

export default function AdminPage() {
    const { user: currentUser } = useAuth()
    const [requests, setRequests] = useState<AccessRequest[]>([])
    const [users, setUsers] = useState<SystemUser[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchData = async () => {
        setIsLoading(true)
        try {
            const [reqRes, userRes] = await Promise.all([
                api.get("/admin/access-requests"),
                api.get("/admin/users")
            ])
            setRequests(reqRes.data)
            setUsers(userRes.data)
        } catch (error) {
            console.error(error)
            toast.error("Access denied. Admin permissions required.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleAction = async (id: number, action: "approve" | "deny") => {
        try {
            await api.post(`/admin/access-requests/${id}/${action}`)
            toast.success(`Request ${action}d successfully.`)
            fetchData()
        } catch (error) {
            console.error(error)
            toast.error("Action failed.")
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
                <Badge className="gap-2 px-4 py-2 bg-orange-500/10 text-orange-500 border-orange-500/20">
                    <ShieldAlert className="h-4 w-4" />
                    Admin Control Panel
                </Badge>
            </div>

            <Tabs defaultValue="requests" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="requests" className="rounded-lg px-6 py-2">
                        <Key className="mr-2 h-4 w-4" />
                        Access Requests
                    </TabsTrigger>
                    <TabsTrigger value="users" className="rounded-lg px-6 py-2">
                        <Users className="mr-2 h-4 w-4" />
                        System Users
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="requests">
                    <Card className="border-muted/50 shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b">
                            <CardTitle>Pending Approvals</CardTitle>
                            <CardDescription>Review new personnel asking for system access.</CardDescription>
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
                                                <TableCell>{req.email}</TableCell>
                                                <TableCell><Badge variant="outline">{req.department}</Badge></TableCell>
                                                <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{req.reason}</TableCell>
                                                <TableCell className="text-right px-6">
                                                    <div className="flex justify-end gap-2">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="h-8 gap-2 border-green-500/50 text-green-600 hover:bg-green-50"
                                                            onClick={() => handleAction(req.id, "approve")}
                                                        >
                                                            <UserCheck className="h-3.5 w-3.5" />
                                                            Approve
                                                        </Button>
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="h-8 gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleAction(req.id, "deny")}
                                                        >
                                                            <UserX className="h-3.5 w-3.5" />
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

                <TabsContent value="users">
                    <Card className="border-muted/50 shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b">
                            <CardTitle>System Accounts</CardTitle>
                            <CardDescription>Currently registered users and their status.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="px-6 py-4">User</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Status</TableHead>
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
                                            <TableCell>{u.department}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className={`text-[10px] ${u.status === "ACTIVE" ? "bg-green-100 text-green-800" : ""}`}>
                                                    {u.status}
                                                </Badge>
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
            </Tabs>
        </div>
    )
}
