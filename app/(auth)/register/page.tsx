"use client";

import React, { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { registerFrontendSchema } from "@/lib/validation/register";

type RegisterFormValues = z.infer<typeof registerFrontendSchema>;

// 2️⃣ — Runtime validation for API responses
const apiResponseSchema = z.object({
  message: z.string().optional(),
  error: z.string().optional(),
});

const RegisterPage = () => {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiSuccess, setApiSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // 3️⃣ — Abort köməkçisi (HotelList-də olduğu kimi)
  const cancelPending = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  // 4️⃣ — Form setup (zod + react-hook-form)
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFrontendSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
    },
    mode: "onSubmit",
  });

  // 5️⃣ — Əsas submit funksiyası
  const onSubmit = useCallback(
    async (data: RegisterFormValues) => {
      setApiError(null);
      setApiSuccess(null);
      setLoading(true);
      cancelPending();

      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          signal: ac.signal,
        });

        let json: any = null;
        try {
          json = await res.json();
        } catch {
          json = {};
        }

        const parsed = apiResponseSchema.safeParse(json);
        if (!parsed.success) throw new Error("Invalid server response format");

        if (!res.ok) {
          const errMsg =
            parsed.data.error ||
            parsed.data.message ||
            `Registration failed (HTTP ${res.status})`;
          setApiError(errMsg);
          return;
        }

        setApiSuccess("Registration successful! Redirecting...");
        setTimeout(() => router.push("/login"), 3000);
      } catch (e: any) {
        if (e.name === "AbortError") return;
        console.error(e);
        setApiError(e.message || "Unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    },
    [router, cancelPending]
  );

  // 6️⃣ — UI Layout
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div
        className="bg-slate-50 shadow-md rounded px-8 pt-6 pb-8 w-full max-w-md"
        aria-busy={loading}>
        <h1 className="text-2xl font-bold mb-6 text-center">Register</h1>

        {/* Error və Success Banner */}
        {apiError && (
          <div className="text-center text-red-600 font-semibold mb-3">
            {apiError}
          </div>
        )}
        {apiSuccess && (
          <div className="text-center text-green-600 font-semibold mb-3">
            {apiSuccess}
          </div>
        )}

        {/* Skeleton Loading State */}
        {loading && <Skeleton className="h-12 w-full mb-4 rounded-md" />}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="jsmith@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      minLength={3}
                      placeholder="username"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-row items-center justify-between">
              <Button type="submit" disabled={loading}>
                {loading ? "Registering..." : "Register"}
              </Button>
              <Link
                className="font-bold text-sm text-blue-500 hover:text-blue-800"
                href="/login">
                Login
              </Link>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default RegisterPage;
