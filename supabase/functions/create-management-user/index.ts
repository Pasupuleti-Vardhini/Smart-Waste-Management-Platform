import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, password, full_name, role, company_id, facility_id, job_title } = await req.json();

    if (!email || !password || !full_name || !role || !company_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, password, full_name, role, company_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["admin", "manager", "operator"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role. Must be admin, manager, or operator" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the caller is an authenticated admin using their JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerToken = authHeader.replace("Bearer ", "");
    const callerClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: { user: callerUser }, error: callerAuthError } = await callerClient.auth.getUser(callerToken);
    if (callerAuthError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the caller is an active admin in the same company
    const { data: callerMgmt, error: callerError } = await supabase
      .from("management_users")
      .select("role, is_active")
      .eq("user_id", callerUser.id)
      .eq("company_id", company_id)
      .maybeSingle();

    if (callerError || !callerMgmt || !callerMgmt.is_active || callerMgmt.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only company admins can create management users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the auth user
    const { data: newUserData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: "management" },
    });

    if (createError || !newUserData.user) {
      return new Response(
        JSON.stringify({ error: createError?.message || "Failed to create user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = newUserData.user.id;

    // Update the profile to set management role
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role: "management", full_name })
      .eq("id", userId);

    if (profileError) {
      // Try to insert if update didn't find a row
      await supabase
        .from("profiles")
        .insert({ id: userId, email, full_name, role: "management" });
    }

    // Create management_users record
    const { error: mgmtError } = await supabase
      .from("management_users")
      .insert({
        user_id: userId,
        company_id,
        facility_id: facility_id || null,
        role,
        job_title: job_title || null,
        is_active: true,
      });

    if (mgmtError) {
      // Clean up the created user if management record fails
      await supabase.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: mgmtError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log to system history
    await supabase.from("system_history").insert({
      facility_id: facility_id || null,
      category: "Management",
      action: "Management user created",
      entity_type: "management_users",
      entity_id: userId,
      description: `Created management user ${email} with role ${role}`,
      performed_by_name: full_name,
    });

    return new Response(
      JSON.stringify({ success: true, user_id: userId, email, role }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
