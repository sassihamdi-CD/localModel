"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import api from "@/lib/api"

const requestAccessSchema = z.object({
    email: z.string().email("Invalid email address"),
    name: z.string().min(2, "Name must be at least 2 characters"),
    department: z.string().optional(),
    reason: z.string().min(10, "Please provide a reason for access (min 10 characters)"),
})

type RequestAccessFormValues = z.infer<typeof requestAccessSchema>

export default function RequestAccessPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RequestAccessFormValues>({
        resolver: zodResolver(requestAccessSchema),
    })

    const onSubmit = async (data: RequestAccessFormValues) => {
        setIsLoading(true)
        try {
            await api.post("/auth/request-access", data)
            toast.success("Access request submitted successfully! An admin will review it shortly.")
            router.push("/login")
        } catch (error: any) {
            console.error(error)
            const message = error.response?.data?.detail || "Failed to submit request"
            toast.error(message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-muted/50">
            <Card className="w-full max-w-lg">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight">
                        Request Access
                    </CardTitle>
                    <CardDescription>
                        Submit your details to request access to the SecureDoc RAG platform
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                {...register("email")}
                                disabled={isLoading}
                            />
                            {errors.email && (
                                <p className="text-sm text-destructive">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                placeholder="John Doe"
                                {...register("name")}
                                disabled={isLoading}
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="department">Department (Optional)</Label>
                            <Input
                                id="department"
                                placeholder="Engineering, HR, etc."
                                {...register("department")}
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reason">Reason for Access</Label>
                            <Textarea
                                id="reason"
                                placeholder="I need access to verify project documentation..."
                                {...register("reason")}
                                disabled={isLoading}
                            />
                            {errors.reason && (
                                <p className="text-sm text-destructive">{errors.reason.message}</p>
                            )}
                        </div>

                        <Button className="w-full" type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Request
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2 text-center text-sm text-muted-foreground">
                    <div>
                        Already have an account?{" "}
                        <Link
                            href="/login"
                            className="text-primary hover:text-primary/90 underline-offset-4 hover:underline"
                        >
                            Sign In
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
