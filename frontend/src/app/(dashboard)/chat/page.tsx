"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
    Loader2, Send, Shield, User, Bot, FileText, Clock,
    Sparkles, MessageSquare, Trash2, AlertTriangle, Plus, MessageCircleOff
} from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import api from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"

interface Message {
    role: "user" | "assistant"
    content: string
    citations?: string[]
    blocked?: boolean
}

interface ChatHistoryItem {
    id: number
    query_text: string
    response_text: string | null
    status: string
    created_at: string
}

function WelcomeScreen({ userName }: { userName: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-full gap-8 py-12 text-center">
            <div className="relative">
                <div className="h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Bot className="h-10 w-10 text-primary" />
                </div>
                <div className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                </div>
            </div>
            <div className="space-y-2 max-w-md">
                <h2 className="text-2xl font-bold">Hello, {userName}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                    I am your local, encrypted RAG assistant. Ask me anything about your internal documents — I only use data from your secure vault and never connect to the internet.
                </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {[
                    "What documents are available in the vault?",
                    "Summarize the internal security policy.",
                    "What are the data retention rules?",
                    "Who is responsible for access control?",
                ].map((suggestion, i) => (
                    <button
                        key={i}
                        className="text-left px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/30 text-sm text-muted-foreground hover:text-foreground transition-all duration-200"
                        // suggestions are just display — user types manually
                        onClick={() => {}}
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default function ChatPage() {
    const { user } = useAuth()
    const [messages, setMessages] = useState<Message[]>([])
    const [history, setHistory] = useState<ChatHistoryItem[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isFetchingHistory, setIsFetchingHistory] = useState(true)
    const [sessionToDelete, setSessionToDelete] = useState<number | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [activeHistoryId, setActiveHistoryId] = useState<number | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const fetchHistory = async () => {
        try {
            const response = await api.get("/chat/history?limit=20")
            setHistory(response.data)
        } catch {
            // silently fail — history is not critical
        } finally {
            setIsFetchingHistory(false)
        }
    }

    useEffect(() => {
        fetchHistory()
    }, [])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isLoading])

    const handleNewChat = () => {
        setMessages([])
        setActiveHistoryId(null)
        inputRef.current?.focus()
    }

    const handleSend = async () => {
        const text = input.trim()
        if (!text || isLoading) return

        setInput("")
        setMessages(prev => [...prev, { role: "user", content: text }])
        setIsLoading(true)

        try {
            const response = await api.post("/chat", { message: text })
            const data = response.data

            setMessages(prev => [...prev, {
                role: "assistant",
                content: data.answer,
                citations: data.citations,
                blocked: data.blocked,
            }])

            // Update sidebar history
            fetchHistory()
        } catch (error: any) {
            const isOllama = error?.response?.status === 503 || error?.response?.status === 500
            const errMsg = isOllama
                ? "The local LLM (Ollama) is not reachable. Make sure Ollama is running and the model is pulled."
                : error?.response?.data?.detail || "Failed to get a response. Please try again."

            toast.error(errMsg)
            setMessages(prev => [...prev, {
                role: "assistant",
                content: isOllama
                    ? "**Connection error:** The local intelligence core (Ollama) is not reachable. Please ensure Ollama is running on your machine with the correct model pulled."
                    : `**Error:** ${errMsg}`,
                blocked: true,
            }])
        } finally {
            setIsLoading(false)
            inputRef.current?.focus()
        }
    }

    const loadPastChat = (item: ChatHistoryItem) => {
        setActiveHistoryId(item.id)
        setMessages([
            { role: "user", content: item.query_text },
            {
                role: "assistant",
                content: item.response_text || "*No response was generated for this query.*",
                blocked: item.status === "BLOCKED",
            },
        ])
    }

    const handleDeleteHistory = async () => {
        if (!sessionToDelete) return
        setIsDeleting(true)
        try {
            await api.delete(`/chat/history/${sessionToDelete}`)
            setHistory(prev => prev.filter(item => item.id !== sessionToDelete))
            if (activeHistoryId === sessionToDelete) {
                setMessages([])
                setActiveHistoryId(null)
            }
            toast.success("Session purged.")
            setSessionToDelete(null)
        } catch {
            toast.error("Failed to delete session.")
        } finally {
            setIsDeleting(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="flex h-[calc(100vh-6rem)] w-full gap-6">

            {/* ── Sidebar ── */}
            <div className="hidden md:flex w-72 flex-col gap-3 h-full shrink-0">

                <Button
                    onClick={handleNewChat}
                    className="w-full gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl h-11"
                    variant="ghost"
                >
                    <Plus className="h-4 w-4" />
                    New Chat
                </Button>

                <div className="glass rounded-2xl border border-white/5 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-foreground/70">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-widest">Command Logs</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                        {history.length}
                    </Badge>
                </div>

                <div className="flex-1 overflow-hidden glass border border-white/5 rounded-2xl shadow-xl">
                    <ScrollArea className="h-full p-2">
                        {isFetchingHistory ? (
                            <div className="flex h-32 flex-col items-center justify-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin text-primary/50" />
                                <span className="text-xs text-muted-foreground">Decrypting logs...</span>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                                <MessageCircleOff className="h-8 w-8 opacity-30" />
                                <span className="text-xs text-center">No sessions yet.<br/>Ask your first question.</span>
                            </div>
                        ) : (
                            <div className="space-y-0.5">
                                {history.map((item, index) => (
                                    <div
                                        key={item.id}
                                        onClick={() => loadPastChat(item)}
                                        className={cn(
                                            "group relative w-full cursor-pointer flex items-center gap-2 p-2.5 rounded-xl text-left text-sm transition-all duration-200",
                                            activeHistoryId === item.id
                                                ? "bg-primary/15 border border-primary/20"
                                                : "hover:bg-white/5 border border-transparent",
                                            item.status === "BLOCKED" ? "opacity-80" : ""
                                        )}
                                        style={{ animationDelay: `${index * 30}ms` }}
                                    >
                                        <div className={cn(
                                            "shrink-0 p-1.5 rounded-lg",
                                            item.status === "BLOCKED"
                                                ? "bg-red-500/10 text-red-400"
                                                : "bg-primary/10 text-primary"
                                        )}>
                                            {item.status === "BLOCKED"
                                                ? <AlertTriangle className="h-3.5 w-3.5" />
                                                : <MessageSquare className="h-3.5 w-3.5" />}
                                        </div>

                                        <div className="flex-1 overflow-hidden">
                                            <p className="truncate text-[13px] font-medium text-foreground/80 group-hover:text-foreground">
                                                {item.query_text}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </p>
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setSessionToDelete(item.id)
                                            }}
                                            className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 hover:text-red-400 text-muted-foreground transition-all"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </div>

            {/* ── Main Chat ── */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                            Secure Terminal
                        </h1>
                        <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
                            <Sparkles className="h-4 w-4" />
                            Zero-Trust RAG — Local LLM only
                        </p>
                    </div>
                    <Badge variant="outline" className="gap-2 px-4 py-1.5 bg-card/40 backdrop-blur-md border-primary/30">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        Encrypted Connection
                    </Badge>
                </div>

                <Card className="flex flex-1 flex-col overflow-hidden glass border-white/10 shadow-2xl">
                    <CardContent className="flex-1 p-0 overflow-hidden">
                        <ScrollArea className="h-full px-4 md:px-8 py-6" ref={scrollRef}>
                            <div className="space-y-6 max-w-3xl mx-auto pb-4">

                                {messages.length === 0 ? (
                                    <WelcomeScreen userName={user?.name || "User"} />
                                ) : (
                                    messages.map((msg, idx) => (
                                        <div
                                            key={idx}
                                            className={cn(
                                                "flex gap-3 animate-fade-in-up",
                                                msg.role === "user" ? "flex-row-reverse" : "flex-row"
                                            )}
                                        >
                                            {/* Avatar */}
                                            <div className={cn(
                                                "mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                                                msg.role === "assistant"
                                                    ? "bg-primary/20 border-primary/30 text-primary"
                                                    : "bg-white/5 border-white/10 text-foreground/80"
                                            )}>
                                                {msg.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                            </div>

                                            {/* Bubble */}
                                            <div className={cn(
                                                "flex flex-col gap-2 max-w-[85%]",
                                                msg.role === "user" ? "items-end" : "items-start"
                                            )}>
                                                <div className={cn(
                                                    "rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-sm",
                                                    msg.role === "user" && "bg-primary text-primary-foreground rounded-tr-sm",
                                                    msg.role === "assistant" && !msg.blocked && "bg-card/60 backdrop-blur-xl border border-white/10 rounded-tl-sm text-foreground/90",
                                                    msg.role === "assistant" && msg.blocked && "bg-destructive/10 text-red-400 border border-destructive/30 rounded-tl-sm"
                                                )}>
                                                    {msg.role === "assistant" && msg.blocked && (
                                                        <div className="flex items-center gap-2 mb-2 text-red-400 text-xs font-semibold uppercase tracking-wider">
                                                            <Shield className="h-3.5 w-3.5" />
                                                            Blocked by Security Filter
                                                        </div>
                                                    )}
                                                    {msg.role === "assistant" ? (
                                                        <div className="prose prose-sm prose-invert max-w-none">
                                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                        </div>
                                                    ) : (
                                                        msg.content
                                                    )}
                                                </div>

                                                {/* Citations */}
                                                {msg.citations && msg.citations.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 ml-1">
                                                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-full flex items-center gap-1.5 opacity-80">
                                                            <FileText className="h-3 w-3" />
                                                            Sources
                                                        </span>
                                                        {msg.citations.map((cite, cIdx) => (
                                                            <Badge
                                                                key={cIdx}
                                                                variant="secondary"
                                                                className="text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 cursor-default"
                                                            >
                                                                {cite}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}

                                {/* Typing indicator */}
                                {isLoading && (
                                    <div className="flex gap-3 animate-fade-in-up">
                                        <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/20 text-primary">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        </div>
                                        <div className="bg-card/60 rounded-2xl rounded-tl-sm border border-white/10 px-5 py-4 flex items-center gap-1.5">
                                            <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                                            <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                                            <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>

                    <CardFooter className="border-t border-white/5 bg-black/20 p-4 md:p-5 backdrop-blur-xl">
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSend() }}
                            className="flex w-full items-center gap-3 max-w-4xl mx-auto"
                        >
                            <div className="relative flex-1">
                                <Input
                                    ref={inputRef}
                                    placeholder="Ask about your internal documents..."
                                    className="w-full bg-background/50 border-white/10 h-12 pl-4 pr-14 rounded-2xl shadow-inner focus-visible:ring-primary/50 text-[14px]"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={isLoading}
                                    autoComplete="off"
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    disabled={isLoading || !input.trim()}
                                    className="absolute right-1.5 top-1.5 h-9 w-9 rounded-xl bg-primary hover:bg-primary/90 transition-all shadow active:scale-95"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </form>
                    </CardFooter>
                </Card>
            </div>

            {/* ── Delete Confirmation Dialog ── */}
            <Dialog open={sessionToDelete !== null} onOpenChange={(open) => !open && setSessionToDelete(null)}>
                <DialogContent className="glass border-destructive/20 sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Purge Session?
                        </DialogTitle>
                        <DialogDescription className="pt-2 text-muted-foreground text-sm">
                            This will permanently erase this chat session from the secure database. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setSessionToDelete(null)}
                            disabled={isDeleting}
                            className="bg-background/50 border-white/10"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteHistory}
                            disabled={isDeleting}
                            className="gap-2"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Purge
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
