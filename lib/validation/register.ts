

import { z } from "zod";

// 1️⃣ main schema (use for backend)
export const baseRegisterSchema = z.object({
    email: z
        .string()
        .min(1, "Email is required")
        .email("Please enter a valid email"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
});

// 2️⃣ Frontend schema (with refine “passwords do not match”)
export const registerFrontendSchema = baseRegisterSchema.refine(
    (data) => data.password === data.confirmPassword,
    {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    }
);

// 3️⃣ Backend schema (without confirmPassword)
export const registerBackendSchema = baseRegisterSchema
    .extend({
        confirmPassword: z.string().optional(),
    })
    .strict();