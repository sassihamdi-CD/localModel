"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Building, ShieldCheck, Key, Fingerprint, Lock, Loader2, Save } from "lucide-react"
import { toast } from "sonner"

export default function ProfilePage() {
    const { user } = useAuth()
    const [isSaving, setIsSaving] = useState(false)
    const [isPasswordSaving, setIsPasswordSaving] = useState(false)

    // Dummy states for the UI payload
    const [name, setName] = useState(user?.name || "Administrator")
    const [email, setEmail] = useState(user?.email || "admin@secure.doc")
    const [department, setDepartment] = useState(user?.department || "Directorate")

    const handleSaveProfile = (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        setTimeout(() => {
            toast.success("Identity Matrix Updated.")
            setIsSaving(false)
        }, 1200)
    }

    const handleUpdatePassword = (e: React.FormEvent) => {
        e.preventDefault()
        setIsPasswordSaving(true)
        setTimeout(() => {
            toast.success("Cryptographic Keys Rotated.")
            setIsPasswordSaving(false)
            // Just clearing inputs for visual effect
            const form = e.target as HTMLFormElement
            form.reset()
        }, 1500)
    }

    return (
        <div className="flex-col md:flex">
            <div className="flex-1 space-y-6 pt-2 max-w-4xl">
                <div className="flex items-center justify-between space-y-2">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent flex items-center gap-2">
                            <Fingerprint className="h-8 w-8 text-primary" />
                            Identity Node
                        </h2>
                        <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                            <ShieldCheck className="h-4 w-4 text-primary/70" />
                            Manage your clearance keys and personal encrypted data.
                        </p>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    
                    {/* Personal Information */}
                    <Card className="glass border-white/5 shadow-xl">
                        <form onSubmit={handleSaveProfile}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <User className="h-5 w-5 text-primary" />
                                    Personnel Data
                                </CardTitle>
                                <CardDescription>Update your recognized identity profile.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-muted-foreground">Full Designation</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground opacity-50" />
                                        <Input 
                                            id="name" 
                                            value={name} 
                                            onChange={(e) => setName(e.target.value)}
                                            className="pl-10 bg-background/50 border-white/10 focus-visible:ring-primary/50" 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-muted-foreground">Secure Comm-Link (Email)</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground opacity-50" />
                                        <Input 
                                            id="email" 
                                            type="email" 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-10 bg-background/50 border-white/10 focus-visible:ring-primary/50" 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dept" className="text-muted-foreground">Assigned Directorate</Label>
                                    <div className="relative">
                                        <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground opacity-50" />
                                        <Input 
                                            id="dept" 
                                            value={department}
                                            onChange={(e) => setDepartment(e.target.value)}
                                            className="pl-10 bg-background/50 border-white/10 focus-visible:ring-primary/50" 
                                        />
                                    </div>
                                </div>
                                
                                <div className="pt-2 border-t border-white/5 mt-4">
                                    <div className="flex items-center gap-2 mt-4">
                                        <span className="text-sm text-muted-foreground">Access Classification:</span>
                                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                                            {user?.roles?.includes("ADMIN") ? "OMEGA LEVEL (ROOT)" : "STANDARD CLASS"}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-black/20 border-t border-white/5 pt-4">
                                <Button type="submit" disabled={isSaving} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Sync Profile
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>

                    {/* Cryptographic Key Rotation */}
                    <Card className="glass border-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.05)]">
                        <form onSubmit={handleUpdatePassword}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg text-orange-400">
                                    <Key className="h-5 w-5 text-orange-400" />
                                    Cryptographic Key Rotation
                                </CardTitle>
                                <CardDescription>Update your secure vault password.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="current_pwd" className="text-muted-foreground">Current Passkey</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground opacity-50" />
                                        <Input 
                                            id="current_pwd" 
                                            type="password" 
                                            required
                                            className="pl-10 bg-background/50 border-white/10 focus-visible:ring-orange-500/50" 
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="new_pwd" className="text-muted-foreground">New Passkey</Label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground opacity-50" />
                                        <Input 
                                            id="new_pwd" 
                                            type="password" 
                                            required
                                            className="pl-10 bg-background/50 border-white/10 focus-visible:ring-orange-500/50" 
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm_pwd" className="text-muted-foreground">Confirm New Passkey</Label>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground opacity-50" />
                                        <Input 
                                            id="confirm_pwd" 
                                            type="password" 
                                            required
                                            className="pl-10 bg-background/50 border-white/10 focus-visible:ring-orange-500/50" 
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-black/20 border-t border-orange-500/10 pt-4 flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs text-muted-foreground">You will remain logged in.</p>
                                <Button type="submit" disabled={isPasswordSaving} variant="outline" className="w-full sm:w-auto border-orange-500/50 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 gap-2">
                                    {isPasswordSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                                    Rotate Key
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>

                </div>
            </div>
        </div>
    )
}
