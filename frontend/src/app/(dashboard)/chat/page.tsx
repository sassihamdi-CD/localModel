"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Loader2, Send, Shield, User, Bot, FileText, Clock, Sparkles, MessageSquare, AlertCircle, Trash2, AlertTriangle } from "lucide-react"
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

export default function ChatPage() {
    const { user } = useAuth()
    const [messages, setMessages] = useState<Message[]>([])
    const [history, setHistory] = useState<ChatHistoryItem[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isFetchingHistory, setIsFetchingHistory] = useState(true)
    const [sessionToDelete, setSessionToDelete] = useState<number | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Initial message based on user data
    const initialMessage: Message = {
        role: "assistant",
        content: `Hello ${user?.name}, I am your highly secure, localized RAG intelligence. I am connected directly to your encrypted document vault. How can I assist you today?`
    }

    // Fetch history on mount
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await api.get("/chat/history?limit=15")
                setHistory(response.data)
                
                // If there's no history in the current session view, set the initial message
                if (messages.length === 0) {
                    setMessages([initialMessage])
                }
            } catch (error) {
                console.error("Failed to load history", error)
            } finally {
                setIsFetchingHistory(false)
            }
        }
        fetchHistory()
    }, [user])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMessage = input.trim()
        setInput("")
        setMessages(prev => [...prev, { role: "user", content: userMessage }])
        setIsLoading(true)

        try {
            const response = await api.post("/chat", { message: userMessage })
            const data = response.data

            setMessages(prev => [...prev, {
                role: "assistant",
                content: data.answer,
                citations: data.citations,
                blocked: data.blocked
            }])

            // Refetch history to update sidebar
            const historyResp = await api.get("/chat/history?limit=15")
            setHistory(historyResp.data)

        } catch (error: any) {
            console.error(error)
            toast.error("Failed to get response from AI. Ensure local model is running.")
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "Error: Connection to the local intelligence core failed or timed out.",
                blocked: true
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const loadPastChat = (item: ChatHistoryItem) => {
        setMessages([
            { role: "user", content: item.query_text },
            { 
                role: "assistant", 
                content: item.response_text || "No response generated.",
                blocked: item.status === "BLOCKED"
            }
        ])
    }

    const handleDeleteHistory = async () => {
        if (!sessionToDelete) return
        
        setIsDeleting(true)
        try {
            await api.delete(`/chat/history/${sessionToDelete}`)
            setHistory(prev => prev.filter(item => item.id !== sessionToDelete))
            // Clear the terminal screen so deleted messages don't awkwardly linger
            setMessages([initialMessage])
            toast.success("Session deleted securely.")
            setSessionToDelete(null)
        } catch (error) {
            console.error("Failed to delete history", error)
            toast.error("Failed to delete session.")
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="flex h-[calc(100vh-6rem)] w-full gap-6">
            
            {/* Sidebar History (Feature-Rich Edition) */}
            <div className="hidden md:flex w-80 flex-col gap-4 h-full">
                <div className="glass p-4 rounded-2xl border border-white/5 flex flex-col gap-4 shadow-xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-primary">
                            <Clock className="h-5 w-5" />
                            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Command Logs</h2>
                        </div>
                        <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">{history.length} Matrix</Badge>
                    </div>
                </div>
                
                <div className="flex-1 overflow-hidden glass border border-white/5 rounded-2xl shadow-xl flex flex-col relative">
                    <ScrollArea className="h-full p-3">
                        {isFetchingHistory ? (
                            <div className="flex h-32 flex-col items-center justify-center gap-3">
                                <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
                                <span className="text-xs text-muted-foreground">Decrypting Logs...</span>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="text-sm text-muted-foreground text-center mt-10">No secure sessions found</div>
                        ) : (
                            <div className="space-y-1">
                                {history.map((item, index) => (
                                    <div
                                        key={item.id}
                                        onClick={() => loadPastChat(item)}
                                        className={cn(
                                            "w-full cursor-pointer group flex flex-col items-start gap-1 p-3 rounded-xl text-left text-sm transition-all duration-300 animate-fade-in-up",
                                            "bg-transparent hover:bg-white/5 border border-transparent hover:border-white/10 hover:shadow-lg",
                                            item.status === "BLOCKED" ? "hover:bg-destructive/5 hover:border-destructive/20" : ""
                                        )}
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            {/* Action Buttons - Hover Reveal */}
                                            <div className="shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pl-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSessionToDelete(item.id)
                                                    }}
                                                    className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-red-500/20 hover:text-red-400 transition-all border border-transparent hover:border-red-500/30 shadow-sm bg-background/50"
                                                    title="Purge Matrix"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <div className="flex flex-1 items-center gap-3 overflow-hidden text-left pr-1">
                                                <div className={cn(
                                                    "p-2 rounded-lg border flex-shrink-0 transition-transform group-hover:scale-110",
                                                    item.status === "BLOCKED" ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-primary/10 border-primary/20 text-primary"
                                                )}>
                                                    {item.status === "BLOCKED" ? <AlertTriangle className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="font-semibold text-[13px] text-foreground/90 group-hover:text-foreground transition-colors truncate">
                                                        {item.query_text}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] font-mono text-muted-foreground/80 flex items-center gap-1">
                                                            <Clock className="h-3 w-3" /> {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                        </span>
                                                        {item.status === "BLOCKED" && (
                                                            <span className="text-[8px] font-bold tracking-wider text-red-400 bg-red-400/10 px-1 rounded uppercase border border-red-500/20">
                                                                Intercepted
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </div>

            {/* Main Chat Interface */}
            <div className="flex-1 flex flex-col gap-4 max-w-5xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">Secure Terminal</h1>
                        <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
                            <Sparkles className="h-4 w-4" /> Zero-Trust RAG Implementation
                        </p>
                    </div>
                    <Badge variant="outline" className="gap-2 px-4 py-1.5 bg-card/40 backdrop-blur-md border-primary/30 animate-pulse-glow">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        Encrypted Connection
                    </Badge>
                </div>

                <Card className="flex flex-1 flex-col overflow-hidden glass border-white/10 shadow-2xl">
                    <CardContent className="flex-1 p-0 overflow-hidden relative">
                        <ScrollArea className="h-full px-4 md:px-8 py-6" ref={scrollRef}>
                            <div className="space-y-8 max-w-3xl mx-auto pb-4">
                                {messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "flex gap-4 animate-fade-in-up",
                                            msg.role === "user" ? "flex-row-reverse" : "flex-row"
                                        )}
                                    >
                                        <div className={cn(
                                            "mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm backdrop-blur-md",
                                            msg.role === "assistant" 
                                                ? "bg-primary/20 border-primary/30 text-primary" 
                                                : "bg-surface border-white/5 text-foreground/80"
                                        )}>
                                            {msg.role === "assistant" ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
                                        </div>
                                        
                                        <div className={cn(
                                            "flex flex-col gap-2 max-w-[85%]",
                                            msg.role === "user" ? "items-end" : "items-start"
                                        )}>
                                            <div className={cn(
                                                "rounded-2xl px-5 py-3.5 text-[15px] shadow-sm leading-relaxed",
                                                msg.role === "user" && "bg-primary text-primary-foreground border-none rounded-tr-sm shadow-primary/25",
                                                msg.role === "assistant" && !msg.blocked && "bg-card/60 backdrop-blur-xl border border-white/10 rounded-tl-sm text-foreground/90",
                                                msg.role === "assistant" && msg.blocked && "bg-destructive/10 text-red-400 border border-destructive/30 rounded-tl-sm font-medium"
                                            )}>
                                                {msg.blocked && <Shield className="h-4 w-4 inline mr-2 text-destructive" />}
                                                {msg.content}
                                            </div>
                                            
                                            {/* Citations display */}
                                            {msg.citations && msg.citations.length > 0 && (
                                                <div className="mt-1 flex flex-wrap gap-2 ml-1">
                                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-full flex items-center gap-1.5 opacity-80">
                                                        <FileText className="h-3.5 w-3.5" />
                                                        Local Sources Active
                                                    </span>
                                                    {msg.citations.map((cite, cIdx) => (
                                                        <Badge key={cIdx} variant="secondary" className="text-xs bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 transition-all cursor-default">
                                                            {cite}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex gap-4 animate-fade-in-up">
                                        <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/20 text-primary">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        </div>
                                        <div className="flex flex-col justify-center bg-card/60 rounded-2xl rounded-tl-sm border border-white/10 px-5 py-3">
                                            <div className="flex gap-1">
                                                <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }}/>
                                                <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }}/>
                                                <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }}/>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                    <CardFooter className="border-t border-white/5 bg-black/20 p-4 md:p-6 backdrop-blur-xl">
                        <form 
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                            className="flex w-full items-center gap-3 max-w-4xl mx-auto"
                        >
                            <div className="relative flex-1">
                                <Input
                                    placeholder="Enter secure query..."
                                    className="w-full bg-background/50 border-white/10 h-14 pl-5 pr-14 rounded-2xl shadow-inner focus-visible:ring-primary/50 text-[15px]"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    disabled={isLoading}
                                />
                                <Button 
                                    type="submit" 
                                    size="icon" 
                                    disabled={isLoading || !input.trim()}
                                    className="absolute right-1.5 top-1.5 h-11 w-11 rounded-xl bg-primary hover:bg-primary/90 transition-all shadow-lg active:scale-95"
                                >
                                    <Send className="h-5 w-5" />
                                </Button>
                            </div>
                        </form>
                    </CardFooter>
                </Card>
            </div>

            <Dialog open={sessionToDelete !== null} onOpenChange={(open) => !open && setSessionToDelete(null)}>
                <DialogContent className="glass border-destructive/20 sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Purge Session History?
                        </DialogTitle>
                        <DialogDescription className="pt-2 text-muted-foreground">
                            This action will permanently erase the chat log and its context from the secure terminal database. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-2 sm:gap-0">
                        <Button 
                            variant="outline" 
                            onClick={() => setSessionToDelete(null)}
                            disabled={isDeleting}
                            className="bg-background/50 border-white/10 hover:bg-white/5"
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
                            Purge Log
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
