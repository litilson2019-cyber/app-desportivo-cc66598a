import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the caller is an admin
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub;

    // Check if caller has admin role
    const { data: roleData } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Sem permissão de Super Admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { primeiro_nome, ultimo_nome, email, password, team_profile_id, role } = await req.json();

    // Validate required fields
    if (!primeiro_nome || !ultimo_nome || !email || !password || !team_profile_id) {
      return new Response(JSON.stringify({ error: "Todos os campos são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (String(password).length < 6) {
      return new Response(JSON.stringify({ error: "Senha deve ter no mínimo 6 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if email/phone already exists
    const emailStr = String(email);
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const alreadyExists = existingUsers?.users?.some(
      (u: any) => u.email === emailStr || u.phone === emailStr
    );

    if (alreadyExists) {
      return new Response(JSON.stringify({ error: "Email ou telefone já cadastrado" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nomeCompleto = `${String(primeiro_nome).trim()} ${String(ultimo_nome).trim()}`;
    const tipoConta = role === "admin" ? "super_admin" : "admin";

    // Create the auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: emailStr,
      password: String(password),
      email_confirm: true,
      user_metadata: {
        nome_completo: nomeCompleto,
        tipo_conta: tipoConta,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user.id;

    // Update profile with extra fields
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        tipo_conta: tipoConta,
        criado_por: String(callerId),
        telefone: emailStr.includes("@") ? null : emailStr,
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Error updating profile:", profileError);
    }

    // Assign role
    const assignedRole = role === "admin" ? "admin" : "moderator";
    const { error: roleError } = await adminClient.from("user_roles").insert({
      user_id: userId,
      role: assignedRole,
      team_profile_id: String(team_profile_id),
    });

    if (roleError) {
      console.error("Error assigning role:", roleError);
      return new Response(JSON.stringify({ error: "Conta criada mas erro ao atribuir perfil" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the action
    await adminClient.from("admin_logs").insert({
      admin_id: String(callerId),
      acao: "criar_funcionario",
      detalhes: {
        funcionario_id: userId,
        nome: nomeCompleto,
        email: emailStr,
        perfil: team_profile_id,
        role: assignedRole,
      },
    });

    return new Response(
      JSON.stringify({ message: "Funcionário criado com sucesso", userId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
