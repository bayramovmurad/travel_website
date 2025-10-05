//   Scaffold HotelList page and base layout
"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";

//   Validation schema for filters with cross-field rule
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

//   Form wiring (react-hook-form) and UI controls
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";

//   Base number coercion to handle string inputs from <input>
const nz = z.coerce.number();

//   Filter schema with preprocessing for empty strings and cross-field refinement
const filterSchema = z
  .object({
    rating: z.preprocess(
      (v) => (v === "" ? undefined : v),
      nz.min(0).max(5).optional()
    ),
    priceMin: z.preprocess(
      (v) => (v === "" ? undefined : v),
      nz.nonnegative().optional()
    ),
    priceMax: z.preprocess(
      (v) => (v === "" ? undefined : v),
      nz.nonnegative().optional()
    ),
  })
  .refine((v) => !(v.priceMin && v.priceMax) || v.priceMin <= v.priceMax, {
    path: ["priceMax"],
    message: "priceMin cannot be greater than priceMax.",
  });

//   Types derived from Zod
type FilterValues = z.infer<typeof filterSchema>;

//   Hotel response runtime validation & types
const hotelSchema = z.object({
  id: z.string().optional(),
  _id: z.any().optional(), // Allow Mongo-like IDs without strict typing
  name: z.string(),
  description: z.string().optional(),
  location: z.string().optional(),
  rating: z.number().optional(),
  pricePerNight: z.number(),
  photos: z.array(z.string()).optional(),
});
const hotelsResponseSchema = z.array(hotelSchema);
type Hotel = z.infer<typeof hotelSchema>;

//   Helpers to read/write numeric params safely
const readNum = (v: string | null): number | undefined => {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const filtersFromParams = (sp: URLSearchParams | ReadonlyURLSearchParams) => {
  return {
    rating: readNum(sp.get("rating")),
    priceMin: readNum(sp.get("priceMin")),
    priceMax: readNum(sp.get("priceMax")),
  } as Partial<FilterValues>;
};

const buildQueryFromFilters = (
  cur: URLSearchParams | ReadonlyURLSearchParams,
  filters: Partial<FilterValues>
) => {
  const next = new URLSearchParams(cur.toString());
  (["rating", "priceMin", "priceMax"] as const).forEach((k) => {
    const v = filters[k];
    if (typeof v === "number" && !Number.isNaN(v)) next.set(k, String(v));
    else next.delete(k);
  });
  return next;
};

// -------------------------------------------

//  + 5: Component scaffold and state hooks
const HotelList: React.FC = () => {
  //   Local state for data, loading, and errors
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  //   Router hooks for URL-driven state
  const searchParams = useSearchParams();
  const router = useRouter();

  //   react-hook-form bound to our Zod schema
  const form = useForm<FilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      rating: undefined,
      priceMin: undefined,
      priceMax: undefined,
    },
    mode: "onSubmit",
  });

  //   Abort logic so we never race older requests against newer ones
  const abortRef = useRef<AbortController | null>(null);
  const cancelPending = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  //   Build API URL based on current (or provided) filters
  const buildUrl = useCallback((filters?: Partial<FilterValues>) => {
    let url = "/api/hotels";
    const p = new URLSearchParams();

    if (typeof filters?.rating === "number")
      p.append("rating", String(filters.rating));
    if (typeof filters?.priceMin === "number")
      p.append("priceMin", String(filters.priceMin));
    if (typeof filters?.priceMax === "number")
      p.append("priceMax", String(filters.priceMax));
    if ([...p.keys()].length) url += `?${p.toString()}`;
    return url;
  }, []);

  //   Fetch with robust error mapping from server → form/API/UI
  const fetchHotels = useCallback(
    async (filters?: Partial<FilterValues>) => {
      setLoading(true);
      setError(null);
      setApiError(null);
      form.clearErrors();

      cancelPending();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const url = buildUrl(filters);
        const res = await fetch(url, { cache: "no-store", signal: ac.signal });

        let data: any = null;
        try {
          data = await res.json();
        } catch {
          data = null;
        }

        if (!res.ok) {
          // Map server field errors (e.g., 422 validation) back to form fields
          if (res.status === 422 && data?.details?.fieldErrors) {
            const fe: Record<string, string[]> = data.details.fieldErrors;

            (["rating", "priceMin", "priceMax"] as const).forEach((name) => {
              const msg = fe?.[name]?.[0];
              if (msg) {
                form.setError(name, { type: "server", message: msg });
              }
            });
          } else if (typeof data?.error === "string") {
            // Specific cross-field error surfaced by backend
            if (
              data.error.toLowerCase().includes("pricemin cannot be greater")
            ) {
              form.setError("priceMax", {
                type: "server",
                message: data.error,
              });
            } else {
              setApiError(data.error);
            }
          } else {
            setApiError(`Request failed (HTTP ${res.status})`);
          }

          setHotels([]);
          return;
        }

        // Validate response shape defensively at runtime
        const parsed = hotelsResponseSchema.safeParse(data);
        if (!parsed.success) {
          console.error(parsed.error);
          throw new Error("Invalid response shape from /api/hotels");
        }

        setHotels(parsed.data);
      } catch (e: any) {
        if (e?.name === "AbortError") return; // latest request won the race
        console.error(e);
        setError(e?.message || "Failed to fetch hotels.");
        setHotels([]);
      } finally {
        setLoading(false);
      }
    },
    [buildUrl, cancelPending, form]
  );

  //   Keep the form & data in sync with the URL at all times
  useEffect(() => {
    const f = filtersFromParams(searchParams);
    form.reset(f as FilterValues, { keepDefaultValues: true });
    fetchHotels(f);
    return () => cancelPending();
  }, [searchParams]);

  //   On submit, we only update the URL (source of truth)
  const onSubmit = useCallback(
    (values: FilterValues) => {
      const next = buildQueryFromFilters(searchParams, values);
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  //   Derived “empty” state memo
  const showEmpty = useMemo(
    () => !loading && !error && hotels.length === 0,
    [loading, error, hotels.length]
  );

  //  + 11: Page layout, aria-busy for a11y
  return (
    <div className="container mx-auto p-4" aria-busy={loading}>
      <h1 className="text-2xl font-bold mb-4">Hotels</h1>

      {/*   Top-level API error banner */}
      {apiError && (
        <div className="mb-3 text-center text-red-600 font-semibold">
          {apiError}
        </div>
      )}

      {/*   Filter form wired to react-hook-form + Zod */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rating (0–5)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder="e.g., 4.5"
                    inputMode="decimal" // mobile keypad hint
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priceMin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price Min</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder="Minimum price"
                    inputMode="numeric"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priceMax"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price Max</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder="Maximum price"
                    inputMode="numeric"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Apply</Button>
        </form>
      </Form>

      {/*   Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/*   Operational error (network, parsing, etc.) */}
      {error && (
        <div className="text-center text-red-500 font-semibold">{error}</div>
      )}

      {/*   Empty state */}
      {showEmpty && (
        <div className="text-center text-blue-500 font-semibold">
          No hotels found.
        </div>
      )}

      {/*  : List of hotels */}
      {!loading && !error && hotels.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hotels.map((hotel) => {
            // Prefer backend-provided stable id, fallback to _id, final fallback to randomUUID
            const key = hotel.id ?? String(hotel._id ?? crypto.randomUUID());
            const cover = hotel.photos?.[0] || "/placeholder.jpg";
            return (
              <Card key={key} className="shadow-md">
                <CardHeader>
                  <Image
                    width={800}
                    height={400}
                    src={cover}
                    alt={hotel.name}
                    className="w-full h-48 object-cover rounded"
                    priority
                  />
                  <CardTitle className="text-lg font-semibold mt-2">
                    {hotel.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">
                    {typeof hotel.rating === "number"
                      ? `${hotel.rating} ★`
                      : "—"}
                  </p>
                  <p className="text-gray-700">{hotel.description ?? "—"}</p>
                  <p className="text-sm text-gray-500">
                    {hotel.location ?? "—"}
                  </p>
                  <p className="text-lg font-bold">
                    ${hotel.pricePerNight} / night
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HotelList;
