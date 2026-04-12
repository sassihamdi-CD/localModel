"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
    Loader2, Upload, FileText, Trash2, Shield, Calendar, HardDrive,
    AlertTriangle, Lock, Search, RefreshCw, X, CheckCircle2, Eye,
} from "lucide-react"
import api from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Document {
    id: number
    title: string
    filename: string
    classification: string
    file_size: number | null
    created_at: string
    department: string | null
    description: string | null
}

const CLASSIFICATION_CONFIG: Record<string, { label: string; color: string }> = {
    PUBLIC:       { label: "Public",       color: "bg-white/5 text-foreground/70 border-white/10" },
    INTERNAL:     { label: "Internal",     color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    CONFIDENTIAL: { label: "Confidential", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
    RESTRICTED:   { label: "Restricted",   color: "bg-red-500/10 text-red-400 border-red-500/20" },
}

function formatSize(bytes: number | null) {
    if (!bytes) return "—"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

export default function DocumentsPage() {
    const { user } = useAuth()

    // Permission flags — driven by what the backend assigned, not role names
    const canUpload = user?.permissions?.includes("ADD_DOC") ?? false
    const canDelete = user?.permissions?.includes("DELETE_DOC") ?? false

    // Repository state
    const [documents, setDocuments] = useState<Document[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterClass, setFilterClass] = useState<string>("ALL")
    const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Upload state (only used when canUpload)
    const [file, setFile] = useState<File | null>(null)
    const [title, setTitle] = useState("")
    const [classification, setClassification] = useState("INTERNAL")
    const [department, setDepartment] = useState(user?.department || "")
    const [description, setDescription] = useState("")
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadDone, setUploadDone] = useState(false)

    const fetchDocuments = useCallback(async () => {
        setIsLoading(true)
        try {
            const params: Record<string, string> = {}
            if (searchQuery.trim()) params.search = searchQuery.trim()
            if (filterClass !== "ALL") params.classification = filterClass
            const response = await api.get("/docs", { params })
            setDocuments(response.data)
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Failed to load documents.")
        } finally {
            setIsLoading(false)
        }
    }, [searchQuery, filterClass])

    useEffect(() => {
        fetchDocuments()
    }, [fetchDocuments])

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file || !title.trim()) return

        setIsUploading(true)
        setUploadDone(false)
        const formData = new FormData()
        formData.append("file", file)
        formData.append("title", title.trim())
        formData.append("classification", classification)
        if (department.trim()) formData.append("department", department.trim())
        if (description.trim()) formData.append("description", description.trim())

        try {
            await api.post("/docs/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            })
            setUploadDone(true)
            toast.success("Document encrypted and indexed into the RAG pipeline.")
            setFile(null)
            setTitle("")
            setDescription("")
            setClassification("INTERNAL")
            fetchDocuments()
            setTimeout(() => setUploadDone(false), 3000)
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Upload failed.")
        } finally {
            setIsUploading(false)
        }
    }

    const handleDelete = async () => {
        if (!documentToDelete) return
        setIsDeleting(true)
        try {
            await api.delete(`/docs/${documentToDelete.id}`)
            toast.success("Document deleted and removed from the RAG index.")
            setDocumentToDelete(null)
            fetchDocuments()
        } catch (error: any) {
            toast.error(error?.response?.data?.detail || "Delete failed.")
        } finally {
            setIsDeleting(false)
        }
    }

    const statCounts = Object.keys(CLASSIFICATION_CONFIG).reduce((acc, key) => {
        acc[key] = documents.filter(d => d.classification === key).length
        return acc
    }, {} as Record<string, number>)

    return (
        <div className="space-y-6 animate-fade-in-up">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent pb-1">
                        {canUpload ? "Secure Vault" : "Document Library"}
                    </h1>
                    <p className="text-muted-foreground/80 font-medium">
                        {canUpload
                            ? "Encrypted internal document repository — RAG-indexed."
                            : "Browse documents you are authorized to access."}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {!canUpload && (
                        <Badge variant="outline" className="gap-2 px-3 py-1.5 glass border-blue-500/30 text-blue-400 rounded-xl">
                            <Eye className="h-3.5 w-3.5" />
                            Read-only access
                        </Badge>
                    )}
                    <Badge variant="outline" className="gap-2 px-3 py-1.5 glass border-emerald-500/30 text-emerald-400 rounded-xl hidden md:inline-flex">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        AES-256 Encrypted
                    </Badge>
                </div>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(CLASSIFICATION_CONFIG).map(([key, cfg]) => (
                    <button
                        key={key}
                        onClick={() => setFilterClass(filterClass === key ? "ALL" : key)}
                        className={cn(
                            "glass rounded-xl p-3 border text-left transition-all duration-200",
                            filterClass === key
                                ? "border-primary/40 bg-primary/5"
                                : "border-white/5 hover:border-white/20"
                        )}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{cfg.label}</span>
                            <div className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border", cfg.color)}>
                                {statCounts[key] ?? 0}
                            </div>
                        </div>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full rounded-full transition-all duration-500", {
                                    "bg-white/30": key === "PUBLIC",
                                    "bg-blue-400": key === "INTERNAL",
                                    "bg-orange-400": key === "CONFIDENTIAL",
                                    "bg-red-400": key === "RESTRICTED",
                                })}
                                style={{ width: documents.length ? `${(statCounts[key] / documents.length) * 100}%` : "0%" }}
                            />
                        </div>
                    </button>
                ))}
            </div>

            <div className={cn("grid gap-6", canUpload ? "lg:grid-cols-3" : "grid-cols-1")}>

                {/* ── Upload Panel — only for DOC_MANAGER / ADMIN ── */}
                {canUpload && (
                    <Card className="lg:col-span-1 glass border-white/5 shadow-2xl h-fit overflow-hidden">
                        <CardHeader className="border-b border-white/5 bg-black/10">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
                                    <Upload className="h-4 w-4" />
                                </div>
                                Upload Document
                            </CardTitle>
                            <CardDescription>Encrypt and add to the RAG knowledge base.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleUpload}>
                            <CardContent className="space-y-4 pt-5">

                                <div className="space-y-1.5">
                                    <Label htmlFor="title" className="text-muted-foreground text-[11px] uppercase font-bold tracking-wider">
                                        Title <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="title"
                                        placeholder="e.g. Internal Security Policy 2026"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="bg-background/50 border-white/10 h-10 rounded-xl focus-visible:ring-emerald-500/50"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="classification" className="text-muted-foreground text-[11px] uppercase font-bold tracking-wider">
                                        Classification Level
                                    </Label>
                                    <Select value={classification} onValueChange={setClassification}>
                                        <SelectTrigger className="bg-background/50 border-white/10 h-10 rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="glass border-white/10">
                                            <SelectItem value="PUBLIC">Public</SelectItem>
                                            <SelectItem value="INTERNAL">Internal</SelectItem>
                                            <SelectItem value="CONFIDENTIAL">Confidential</SelectItem>
                                            <SelectItem value="RESTRICTED">Restricted</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="dept" className="text-muted-foreground text-[11px] uppercase font-bold tracking-wider">
                                        Department
                                    </Label>
                                    <Input
                                        id="dept"
                                        placeholder="e.g. IT, Legal, HR..."
                                        value={department}
                                        onChange={(e) => setDepartment(e.target.value)}
                                        className="bg-background/50 border-white/10 h-10 rounded-xl focus-visible:ring-emerald-500/50"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="desc" className="text-muted-foreground text-[11px] uppercase font-bold tracking-wider">
                                        Description
                                    </Label>
                                    <Input
                                        id="desc"
                                        placeholder="Optional short description..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="bg-background/50 border-white/10 h-10 rounded-xl focus-visible:ring-emerald-500/50"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-muted-foreground text-[11px] uppercase font-bold tracking-wider">
                                        File <span className="text-destructive">*</span>
                                    </Label>
                                    <div
                                        className={cn(
                                            "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 relative",
                                            isDragging
                                                ? "border-emerald-500 bg-emerald-500/5"
                                                : file
                                                    ? "border-solid border-emerald-500/50 bg-emerald-500/5"
                                                    : "border-white/10 hover:border-emerald-500/40 hover:bg-white/5"
                                        )}
                                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={(e) => {
                                            e.preventDefault()
                                            setIsDragging(false)
                                            if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0])
                                        }}
                                    >
                                        <Input
                                            type="file"
                                            accept=".pdf,.docx,.doc,.txt"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        />
                                        {file ? (
                                            <div className="flex flex-col items-center gap-1.5">
                                                <div className="h-10 w-10 rounded-full border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                                    <Shield className="h-5 w-5" />
                                                </div>
                                                <p className="text-sm font-semibold text-emerald-400 truncate max-w-[180px]">{file.name}</p>
                                                <p className="text-[10px] text-muted-foreground">{formatSize(file.size)}</p>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setFile(null) }}
                                                    className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1 mt-1 transition-colors"
                                                >
                                                    <X className="h-3 w-3" /> Remove
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                                                <Upload className="h-7 w-7 mb-1 opacity-40" />
                                                <p className="text-sm font-medium">Drag & drop or click</p>
                                                <p className="text-xs opacity-60">PDF, DOCX, TXT · max 50 MB</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="bg-black/20 border-t border-white/5 p-4">
                                <Button
                                    className="w-full gap-2 rounded-xl h-11 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg active:scale-[0.98] transition-all"
                                    type="submit"
                                    disabled={isUploading || !file || !title.trim()}
                                >
                                    {isUploading ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Encrypting & Indexing...</>
                                    ) : uploadDone ? (
                                        <><CheckCircle2 className="h-4 w-4" /> Uploaded!</>
                                    ) : (
                                        <><Lock className="h-4 w-4" /> Secure Upload</>
                                    )}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {/* ── Repository Panel ── */}
                <Card className={cn("glass border-white/5 shadow-2xl overflow-hidden flex flex-col", canUpload ? "lg:col-span-2" : "col-span-1")}>
                    <CardHeader className="border-b border-white/5 bg-black/10">
                        <div className="flex items-center justify-between gap-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <div className="p-1.5 rounded-md bg-white/5 text-foreground/70">
                                    <HardDrive className="h-4 w-4" />
                                </div>
                                Document Repository
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-white/5 border-none text-muted-foreground text-xs">
                                    {documents.length} file{documents.length !== 1 ? "s" : ""}
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg hover:bg-white/5"
                                    onClick={fetchDocuments}
                                    disabled={isLoading}
                                    title="Refresh"
                                >
                                    <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                                </Button>
                            </div>
                        </div>

                        {/* Search + filter */}
                        <div className="flex gap-2 mt-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    placeholder="Search by title..."
                                    className="pl-9 h-9 bg-background/50 border-white/10 rounded-xl text-sm focus-visible:ring-primary/50"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                            <Select value={filterClass} onValueChange={setFilterClass}>
                                <SelectTrigger className="h-9 w-40 bg-background/50 border-white/10 rounded-xl text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="glass border-white/10">
                                    <SelectItem value="ALL">All Levels</SelectItem>
                                    <SelectItem value="PUBLIC">Public</SelectItem>
                                    <SelectItem value="INTERNAL">Internal</SelectItem>
                                    <SelectItem value="CONFIDENTIAL">Confidential</SelectItem>
                                    <SelectItem value="RESTRICTED">Restricted</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0 flex-1">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-500/50" />
                                <span className="text-sm text-muted-foreground animate-pulse">Loading documents...</span>
                            </div>
                        ) : documents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center px-4 gap-3">
                                <div className="h-14 w-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                    <FileText className="h-6 w-6 text-muted-foreground/40" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-foreground/70">
                                        {searchQuery || filterClass !== "ALL" ? "No results found" : "No documents available"}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {searchQuery || filterClass !== "ALL"
                                            ? "Try adjusting your search or filter."
                                            : canUpload
                                                ? "Upload your first document to start building the knowledge base."
                                                : "No documents have been shared with your access level yet."}
                                    </p>
                                </div>
                                {(searchQuery || filterClass !== "ALL") && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => { setSearchQuery(""); setFilterClass("ALL") }}
                                        className="text-xs text-muted-foreground hover:text-foreground gap-1"
                                    >
                                        <X className="h-3 w-3" /> Clear filters
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-black/20">
                                        <TableRow className="border-white/5">
                                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground px-5 py-3">Document</TableHead>
                                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Level</TableHead>
                                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Department</TableHead>
                                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Size</TableHead>
                                            {canDelete && (
                                                <TableHead className="w-12 px-5" />
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {documents.map((doc, idx) => {
                                            const cfg = CLASSIFICATION_CONFIG[doc.classification] || CLASSIFICATION_CONFIG.PUBLIC
                                            return (
                                                <TableRow
                                                    key={doc.id}
                                                    className="border-white/5 hover:bg-white/5 transition-colors group"
                                                    style={{ animationDelay: `${idx * 40}ms` }}
                                                >
                                                    <TableCell className="px-5 py-3.5">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-[13px] text-foreground/90 group-hover:text-foreground transition-colors">
                                                                {doc.title}
                                                            </span>
                                                            <div className="flex items-center gap-3 mt-1 opacity-70">
                                                                <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 truncate max-w-[200px]">
                                                                    <FileText className="h-3 w-3 shrink-0" />
                                                                    {doc.filename}
                                                                </span>
                                                                <span suppressHydrationWarning className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                                                                    <Calendar className="h-3 w-3" />
                                                                    {new Date(doc.created_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            {doc.description && (
                                                                <p className="text-[11px] text-muted-foreground/70 mt-1 truncate max-w-xs">{doc.description}</p>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className={cn(
                                                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                                                            cfg.color
                                                        )}>
                                                            {doc.classification === "RESTRICTED" && <AlertTriangle className="h-2.5 w-2.5" />}
                                                            {cfg.label}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-[12px] text-muted-foreground">
                                                        {doc.department || "—"}
                                                    </TableCell>
                                                    <TableCell className="text-right text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                                                        {formatSize(doc.file_size)}
                                                    </TableCell>
                                                    {canDelete && (
                                                        <TableCell className="text-right px-5">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all"
                                                                onClick={() => setDocumentToDelete(doc)}
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Delete Dialog */}
            <Dialog open={!!documentToDelete} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
                <DialogContent className="glass border-destructive/20 sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Delete Document?
                        </DialogTitle>
                        <DialogDescription className="pt-2 text-muted-foreground text-sm">
                            <strong className="text-foreground">{documentToDelete?.title}</strong> will be permanently removed from the database and the RAG vector index. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setDocumentToDelete(null)}
                            disabled={isDeleting}
                            className="bg-background/50 border-white/10"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="gap-2"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
