import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COMPLAINT_TOOL = {
  type: "function" as const,
  function: {
    name: "file_complaint",
    description: "File a complaint on behalf of the guest. Use when the guest wants to raise/report an issue, problem, or complaint about their PG accommodation.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short title summarizing the complaint (max 100 chars)" },
        description: { type: "string", description: "Detailed description of the issue" },
      },
      required: ["title", "description"],
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { messages } = await req.json();

    const { data: guest } = await supabaseClient
      .from("guests")
      .select("*, bed:beds(bed_number, room:rooms(room_number, floor))")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!guest) throw new Error("Guest profile not found");

    const [pgResult, rentsResult, announcementsResult] = await Promise.all([
      supabaseClient.from("pgs").select("name, address, city, contact_number, house_rules, owner_name").eq("id", guest.pg_id).single(),
      supabaseClient.from("rents").select("*").eq("guest_id", guest.id).order("month", { ascending: false }).limit(6),
      supabaseClient.from("announcements").select("title, content, priority, created_at").eq("pg_id", guest.pg_id).eq("is_active", true).order("created_at", { ascending: false }).limit(10),
    ]);

    const pg = pgResult.data;
    const rents = rentsResult.data || [];
    const announcements = announcementsResult.data || [];

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

You can also help guests file complaints. When a guest describes a problem or issue they want to report, use the file_complaint tool to submit it. Before filing, briefly confirm the title and description with the guest unless it's very clear what they want.

If asked something you don't have data for, say so politely and suggest contacting the PG owner.

Context:
${contextParts.join("\n\n")}`;

    // First AI call (may return tool calls)
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        tools: [COMPLAINT_TOOL],
        stream: false,
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

    const aiResult = await response.json();
    const choice = aiResult.choices?.[0];
    const assistantMessage = choice?.message;

    // Check for tool calls
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolResults = [];

      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.function.name === "file_complaint") {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const { error } = await supabaseClient.from("complaints").insert({
              guest_id: guest.id,
              pg_id: guest.pg_id,
              title: args.title.slice(0, 100),
              description: args.description,
              status: "open",
            });

            if (error) throw error;
            toolResults.push({
              tool_call_id: toolCall.id,
              role: "tool" as const,
              content: JSON.stringify({ success: true, message: "Complaint filed successfully" }),
            });
          } catch (e: any) {
            toolResults.push({
              tool_call_id: toolCall.id,
              role: "tool" as const,
              content: JSON.stringify({ success: false, error: e.message }),
            });
          }
        }
      }

      // Second AI call with tool results, streamed
      const followUpMessages = [
        ...aiMessages,
        assistantMessage,
        ...toolResults,
      ];

      const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: followUpMessages,
          stream: true,
        }),
      });

      if (!streamResponse.ok) {
        const t = await streamResponse.text();
        console.error("Follow-up AI error:", streamResponse.status, t);
        throw new Error("AI service error");
      }

      return new Response(streamResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No tool calls - stream the response directly
    // Re-do the call with streaming since first was non-streaming
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!streamResponse.ok) {
      const t = await streamResponse.text();
      console.error("Stream AI error:", streamResponse.status, t);
      throw new Error("AI service error");
    }

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("guest-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
