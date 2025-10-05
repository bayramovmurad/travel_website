import { prismadb } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const ratingStr = searchParams.get("rating");
    const priceMinStr = searchParams.get("priceMin");
    const priceMaxStr = searchParams.get("priceMax");

    // Parse numbers
    const rating = ratingStr !== null ? Number(ratingStr) : undefined;
    const priceMin = priceMinStr !== null ? Number(priceMinStr) : undefined;
    const priceMax = priceMaxStr !== null ? Number(priceMaxStr) : undefined;

    // Validation
    if (ratingStr !== null && (Number.isNaN(rating) || rating < 0 || rating > 5)) {
        return NextResponse.json(
            { error: "Rating must be a number between 0 and 5." },
            { status: 400 }
        );
    }

    if (priceMinStr !== null && Number.isNaN(priceMin)) {
        return NextResponse.json(
            { error: "priceMin must be a valid number." },
            { status: 400 }
        );
    }

    if (priceMaxStr !== null && Number.isNaN(priceMax)) {
        return NextResponse.json(
            { error: "priceMax must be a valid number." },
            { status: 400 }
        );
    }

    if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
        return NextResponse.json(
            { error: "priceMin cannot be greater than priceMax." },
            { status: 400 }
        );
    }

    // Build filters
    const and: any[] = [];

    if (priceMin !== undefined || priceMax !== undefined) {
        const priceFilter: Record<string, number> = {};
        if (priceMin !== undefined) priceFilter.gte = priceMin;
        if (priceMax !== undefined) priceFilter.lte = priceMax;

        // Important: match the actual DB field name (likely pricePerNight)
        and.push({ pricePerNight: priceFilter });
    }

    if (rating !== undefined) {
        and.push({ rating: { gte: rating } });
    }

    const where = and.length ? { AND: and } : {};

    try {
        const hotels = await prismadb.hotel.findMany({
            where,
            include: { rooms: true },
        });

        return NextResponse.json(hotels);
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Something went wrong while fetching hotels." },
            { status: 500 }
        );
    }
}
