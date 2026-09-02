import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

type ClerkWebhookEvent = {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;
    public_metadata?: Record<string, unknown>;
    deleted?: boolean;
  };
};

export async function POST(request: Request) {
  if (!CLERK_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "CLERK_WEBHOOK_SECRET is not configured" },
      { status: 500 },
    );
  }

  const svix = new Webhook(CLERK_WEBHOOK_SECRET);

  const headers = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };

  let payload: string;
  try {
    payload = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let event: ClerkWebhookEvent;
  try {
    event = svix.verify(payload, headers) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  try {
    await handleClerkWebhook(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Clerk webhook handler failed:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}

async function handleClerkWebhook(event: ClerkWebhookEvent) {
  const supabase = await createClient();
  if (!supabase) {
    console.warn("Supabase not configured; skipping Clerk webhook sync");
    return;
  }

  const { type, data } = event;

  if (type === "user.created" || type === "user.updated") {
    const email = data.email_addresses?.[0]?.email_address ?? null;
    const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;

    await supabase.from("users").upsert(
      {
        id: data.id,
        email,
        name: fullName,
        image: data.image_url,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    return;
  }

  if (type === "user.deleted") {
    await supabase.from("users").delete().eq("id", data.id);
    return;
  }
}
