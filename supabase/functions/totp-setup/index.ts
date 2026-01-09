import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base32Encode } from "https://deno.land/std@0.168.0/encoding/base32.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization")! } },
      }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if 2FA is already enabled
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("two_factor_enabled, two_factor_secret")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (profile.two_factor_enabled) {
      return new Response(
        JSON.stringify({ error: "2FA is already enabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a random 20-byte secret and encode as Base32
    const secretBytes = new Uint8Array(20);
    crypto.getRandomValues(secretBytes);
    const secret = base32Encode(secretBytes).replace(/=/g, "");

    // Store the secret temporarily (not enabled yet)
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({ two_factor_secret: secret })
      .eq("user_id", user.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to store secret" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate otpauth URI for QR code
    const issuer = encodeURIComponent("PG Manager");
    const accountName = encodeURIComponent(user.email || user.id);
    const otpauthUri = `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    return new Response(
      JSON.stringify({ 
        success: true, 
        otpauthUri,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err as Error;
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
