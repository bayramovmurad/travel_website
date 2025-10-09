import { prismadb } from "@/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
// import { z } from "zod";
import { registerBackendSchema } from "@/lib/validation/register";

// 1️⃣ Input validation schema
// const registerSchema = z
//     .object({
//         email: z.string().email("Invalid email format."),
//         username: z.string().min(3, "Username must be at least 3 characters."),
//         password: z.string().min(6, "Password must be at least 6 characters."), 
//         confirmPassword: z.string().optional(),
//         firstName: z.string().min(1, "First name is required."),
//         lastName: z.string().min(1, "Last name is required."),
//     })
//     .strict();



export async function POST(request: Request) {
   

    try {
        // 2️⃣ Parse & validate request body
        const json = await request.json();
        console.log("Received body:", json);
        const parsed = registerBackendSchema.safeParse(json);

        if (!parsed.success) {
            console.error("Validation errors:", parsed.error.flatten().fieldErrors);
            return NextResponse.json(
                { error: "Invalid input", received: json, details: parsed.error.flatten().fieldErrors },
                { status: 422 }
            );
        }

        const { email, username, password, firstName, lastName } = parsed.data;

        // 3️⃣ Check if user exists
        const existingUser = await prismadb.user.findFirst({
            where: { OR: [{ email }, { username }] },
            select: { id: true, email: true, username: true },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "User with this email or username already exists." },
                { status: 409 }
            );
        }

        // 4️⃣ Hash password safely
        const hashedPassword = await bcrypt.hash(password, 12);

        // 5️⃣ Create new user
        const newUser = await prismadb.user.create({
            data: {
                email,
                username,
                firstName,
                lastName,
                hashedPassword,
                photo: "",
            },
            
            
            select: { id: true, email: true, username: true },
        });
console.log(newUser)
        // 6️⃣ Return consistent success response
        return NextResponse.json(
            { data: newUser, message: "User registered successfully" },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("Registration error:", error);

        if (error instanceof SyntaxError) {
            // JSON parse error
            return NextResponse.json(
                { error: "Invalid JSON format." },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}
