"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Loader2, Upload, FileText, Trash2, Shield, Calendar, HardDrive, AlertTriangle, Lock } from "lucide-react"
import api from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Document {
    id: number
    title: string
    filename: string
    classification: string
    file_size: number
    created_at: string
    department: string
}

export default function DocumentsPage() {
    const { user } = useAuth()
    const [documents, setDocuments] = useState<Document[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isUploading, setIsUploading] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [title, setTitle] = useState("")
    const [classification, setClassification] = useState("INTERNAL")
    const [isDragging, setIsDragging] = useState(false)
    const [documentToDelete, setDocumentToDelete] = useState<number | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const fetchDocuments = async () => {
        try {
            const response = await api.get("/docs")
            setDocuments(response.data)
        } catch (error) {
            console.error(error)
            toast.error("Failed to load secure documents.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchDocuments()
    }, [])

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file || !title) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append("file", file)
        formData.append("title", title)
        formData.append("classification", classification)

        try {
            await api.post("/docs/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            })
            toast.success("Document uploaded and securely encrypted.")
            setFile(null)
            setTitle("")
            fetchDocuments()
        } catch (error: any) {
            console.error(error)
            toast.error(error.response?.data?.detail || "Encryption failed. Upload aborted.")
        } finally {
            setIsUploading(false)
        }
    }

    const deleteDocument = async () => {
        if (!documentToDelete) return
        
        setIsDeleting(true)
        try {
            await api.delete(`/docs/${documentToDelete}`)
            toast.success("Document incinerated.")
            setDocumentToDelete(null)
            fetchDocuments()
        } catch (error) {
            console.error(error)
            toast.error("Decryption required to delete. Action denied.")
        } finally {
            setIsDeleting(false)
        }
    }

    const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 B"
        const k = 1024
        const sizes = ["B", "KB", "MB", "GB"]
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    }

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-600 bg-clip-text text-transparent pb-1">
                        Secure Vault
                    </h1>
                    <p className="text-muted-foreground/80 font-medium">Manage encrypted internal organizational data matrices.</p>
                </div>
                <Badge variant="outline" className="gap-2 px-4 py-2 glass border-emerald-500/30 text-emerald-400 rounded-xl shadow-[0_0_15px_rgba(52,211,153,0.15)] hidden md:inline-flex">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    AES-256 Encryption Active
                </Badge>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Upload Panel */}
                <Card className="lg:col-span-1 glass border-white/5 shadow-2xl h-fit overflow-hidden">
                    <CardHeader className="border-b border-white/5 bg-black/10">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
                                <Upload className="h-5 w-5" />
                            </div>
                            Ingest Data
                        </CardTitle>
                        <CardDescription>Encrypt and add data to the Intelligence base.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleUpload}>
                        <CardContent className="space-y-5 pt-6">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Document Designation</Label>
                                <Input 
                                    id="title" 
                                    placeholder="e.g. Q4 Master Credentials" 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="bg-background/50 border-white/10 h-12 rounded-xl focus-visible:ring-emerald-500/50"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="classification" className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Security Clearance Level</Label>
                                <Select value={classification} onValueChange={setClassification}>
                                    <SelectTrigger id="classification" className="bg-background/50 border-white/10 h-12 rounded-xl">
                                        <SelectValue placeholder="Select level" />
                                    </SelectTrigger>
                                    <SelectContent className="glass border-white/10">
                                        <SelectItem value="PUBLIC">Tier 1: Public</SelectItem>
                                        <SelectItem value="INTERNAL">Tier 2: Internal</SelectItem>
                                        <SelectItem value="CONFIDENTIAL">Tier 3: Confidential</SelectItem>
                                        <SelectItem value="RESTRICTED">Tier 4: Restricted</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="file" className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">File Selection</Label>
                                <div 
                                    className={cn(
                                        "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 relative",
                                        isDragging ? "border-emerald-500 bg-emerald-500/5 shadow-[0_0_20px_rgba(52,211,153,0.2)]" : "border-white/10 hover:border-emerald-500/50 hover:bg-white/5",
                                        file ? "border-solid border-emerald-500/50 bg-emerald-500/5" : ""
                                    )}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsDragging(false);
                                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                            setFile(e.dataTransfer.files[0]);
                                        }
                                    }}
                                >
                                    <Input 
                                        id="file" 
                                        type="file" 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        required={!file}
                                    />
                                    {file ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="h-12 w-12 rounded-full border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)] animate-pulse">
                                                <Shield className="h-6 w-6" />
                                            </div>
                                            <p className="text-sm font-medium text-emerald-400 mt-2 truncate max-w-[200px]">{file.name}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{formatSize(file.size)}</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <div className="h-12 w-12 rounded-full bg-background/50 border border-white/5 flex items-center justify-center mb-2">
                                                <Upload className="h-5 w-5" />
                                            </div>
                                            <p className="text-sm font-medium">Drag & drop or click to browse</p>
                                            <p className="text-xs opacity-60">Supports PDF, TXT, DOCX</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-black/20 border-t border-white/5 p-6">
                            <Button 
                                className="w-full gap-2 rounded-xl h-12 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg active:scale-[0.98] transition-all" 
                                type="submit" 
                                disabled={isUploading || (!file && !isDragging)}
                            >
                                {isUploading ? (
                                    <><Loader2 className="h-5 w-5 animate-spin" /> Encrypting & Vectorizing...</>
                                ) : (
                                    <><Lock className="h-4 w-4" /> Secure Upload</>
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                {/* Repository Panel */}
                <Card className="lg:col-span-2 glass border-white/5 shadow-2xl overflow-hidden flex flex-col">
                    <CardHeader className="border-b border-white/5 bg-black/10">
                        <CardTitle className="text-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-md bg-white/5 text-foreground/80">
                                    <HardDrive className="h-5 w-5" />
                                </div>
                                Decrypted Repository
                            </div>
                            <Badge variant="secondary" className="bg-white/5 border-none text-muted-foreground">{documents.length} Files</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-4">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-500/50" />
                                <span className="text-sm font-medium text-muted-foreground animate-pulse">Syncing Vault...</span>
                            </div>
                        ) : documents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                                <div className="h-16 w-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                                    <FileText className="h-6 w-6 text-muted-foreground/50" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground/80">Vault is Empty</h3>
                                <p className="text-sm text-muted-foreground mt-1 max-w-sm">No secure documents are currently stored in your designated sector.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto w-full">
                                <Table>
                                    <TableHeader className="bg-black/20 hover:bg-black/20">
                                        <TableRow className="border-white/5">
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground px-6 py-4">Designation</TableHead>
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Level</TableHead>
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-right w-24">Size</TableHead>
                                            <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-right px-6 w-16">Erase</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {documents.map((doc, idx) => (
                                            <TableRow 
                                                key={doc.id} 
                                                className="border-white/5 hover:bg-white/5 transition-colors group animate-fade-in-up"
                                                style={{ animationDelay: `${idx * 50}ms` }}
                                            >
                                                <TableCell className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-[14px] text-foreground/90 group-hover:text-foreground transition-colors">{doc.title}</span>
                                                        <div className="flex items-center gap-3 mt-1.5 opacity-80">
                                                            <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5 truncate max-w-[200px]">
                                                                <FileText className="h-3 w-3" /> {doc.filename}
                                                            </span>
                                                            <span suppressHydrationWarning className="text-[10px] text-muted-foreground flex items-center gap-1.5 list-disc">
                                                                <Calendar className="h-3 w-3" /> {new Date(doc.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className={cn(
                                                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                                                        doc.classification === "RESTRICTED" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                                        doc.classification === "CONFIDENTIAL" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                                                        doc.classification === "INTERNAL" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                        "bg-white/5 text-foreground/70 border-white/10"
                                                    )}>
                                                        {doc.classification === "RESTRICTED" && <AlertTriangle className="h-3 w-3" />}
                                                        {doc.classification}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right whitespace-nowrap">
                                                    <span className="text-[11px] font-mono text-muted-foreground group-hover:text-foreground/80 transition-colors">
                                                        {formatSize(doc.file_size)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right px-6">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 rounded-lg text-muted-foreground opacity-50 hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all"
                                                        onClick={() => setDocumentToDelete(doc.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={documentToDelete !== null} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
                <DialogContent className="glass border-destructive/20 sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Incinerate Document?
                        </DialogTitle>
                        <DialogDescription className="pt-2 text-muted-foreground">
                            This action will permanently delete the encrypted document and remove its contents entirely from the RAG knowledge pool. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-2 sm:gap-0">
                        <Button 
                            variant="outline" 
                            onClick={() => setDocumentToDelete(null)}
                            disabled={isDeleting}
                            className="bg-background/50 border-white/10 hover:bg-white/5"
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={deleteDocument}
                            disabled={isDeleting}
                            className="gap-2"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Authorized Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
