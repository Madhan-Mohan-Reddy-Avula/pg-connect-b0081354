import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get auth token from request
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { messages } = await req.json();

    // Fetch guest context
    const { data: guest } = await supabaseClient
      .from("guests")
      .select("*, bed:beds(bed_number, room:rooms(room_number, floor))")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!guest) throw new Error("Guest profile not found");

    // Fetch PG info, rent, announcements in parallel
    const [pgResult, rentsResult, announcementsResult] = await Promise.all([
      supabaseClient.from("pgs").select("name, address, city, contact_number, house_rules, owner_name").eq("id", guest.pg_id).single(),
      supabaseClient.from("rents").select("*").eq("guest_id", guest.id).order("month", { ascending: false }).limit(6),
      supabaseClient.from("announcements").select("title, content, priority, created_at").eq("pg_id", guest.pg_id).eq("is_active", true).order("created_at", { ascending: false }).limit(10),
    ]);

    const pg = pgResult.data;
    const rents = rentsResult.data || [];
    const announcements = announcementsResult.data || [];

    // Build context
    const contextParts = [];

    if (pg) {
      contextParts.push(`PG Name: ${pg.name}\nAddress: ${pg.address}, ${pg.city}\nOwner: ${pg.owner_name}\nContact: ${pg.contact_number}`);
      if (pg.house_rules) contextParts.push(`House Rules:\n${pg.house_rules}`);
    }

    contextParts.push(`Guest: ${guest.full_name}\nRoom: ${guest.bed?.room?.room_number || "N/A"}, Floor: ${guest.bed?.room?.floor || "N/A"}, Bed: ${guest.bed?.bed_number || "N/A"}\nMonthly Rent: ₹${guest.monthly_rent}`);

    if (rents.length > 0) {
      const rentInfo = rents.map(r => `${r.month}: ₹${r.amount} - ${r.status}${r.paid_date ? ` (paid ${r.paid_date})` : r.due_date ? ` (due ${r.due_date})` : ""}`).join("\n");
      contextParts.push(`Recent Rent Status:\n${rentInfo}`);
    }

    if (announcements.length > 0) {
      const annInfo = announcements.map(a => `[${a.priority}] ${a.title}: ${a.content}`).join("\n");
      contextParts.push(`Active Announcements:\n${annInfo}`);
    }

    const systemPrompt = `You are a helpful PG assistant for residents. Answer questions about the PG, house rules, rent, announcements, and general queries. Be friendly, concise, and helpful. Use the context below to answer accurately.

If asked something you don't have data for, say so politely and suggest contacting the PG owner.

Context:
${contextParts.join("\n\n")}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service unavailable. Please try later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI service error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("guest-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
