import type { APIContext } from "astro";
import { createServiceClient, requirePrimaryAdmin, jsonResponse } from "../../../lib/adminAuth";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET({ cookies }: APIContext) {
  const auth = await requirePrimaryAdmin(cookies);
  if (!auth.session) return auth.response;

  const service = createServiceClient();
  const { data: profiles, error } = await service
    .from("profiles")
    .select("id, nickname, is_primary, created_at")
    .eq("role", "admin")
    .order("is_primary", { ascending: false })
    .order("nickname", { ascending: true });

  if (error) {
    return jsonResponse({ ok: false, message: error.message }, 500);
  }

  const admins = await Promise.all(
    (profiles || []).map(async (profile) => {
      const { data: authUser } = await service.auth.admin.getUserById(profile.id);
      return {
        id: profile.id,
        nickname: profile.nickname,
        email: authUser.user?.email ?? "",
        isPrimary: !!profile.is_primary,
        createdAt: profile.created_at,
      };
    })
  );

  return jsonResponse({ ok: true, admins }, 200);
}

export async function POST({ request, cookies }: APIContext) {
  const auth = await requirePrimaryAdmin(cookies);
  if (!auth.session) return auth.response;

  try {
    const body = await request.json();
    const nickname = typeof body?.nickname === "string" ? body.nickname.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!nickname || !email || !password) {
      return jsonResponse({ ok: false, message: "Vyplňte přezdívku, e-mail i heslo." }, 400);
    }
    if (!EMAIL_RE.test(email)) {
      return jsonResponse({ ok: false, message: "Neplatný formát e-mailu." }, 400);
    }
    if (password.length < 8) {
      return jsonResponse({ ok: false, message: "Heslo musí mít alespoň 8 znaků." }, 400);
    }

    const service = createServiceClient();
    const { data: created, error: createError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nickname },
    });

    if (createError || !created.user) {
      const message = createError?.message?.includes("already been registered")
        ? "Tento e-mail už je zaregistrovaný."
        : createError?.message || "Vytvoření účtu se nepodařilo.";
      return jsonResponse({ ok: false, message }, 400);
    }

    const { error: profileError } = await service.from("profiles").insert({
      id: created.user.id,
      nickname,
      role: "admin",
      is_primary: false,
    });

    if (profileError) {
      // Uklidit osiřelý auth účet, pokud se nepodaří založit profil (např. duplicitní přezdívka).
      await service.auth.admin.deleteUser(created.user.id);
      const message = profileError.code === "23505" ? "Tato přezdívka už je obsazená." : profileError.message;
      return jsonResponse({ ok: false, message }, 400);
    }

    return jsonResponse({ ok: true, id: created.user.id }, 201);
  } catch (error) {
    return jsonResponse({ ok: false, message: error instanceof Error ? error.message : "Neznámá chyba" }, 500);
  }
}

export async function PATCH({ request, cookies }: APIContext) {
  const auth = await requirePrimaryAdmin(cookies);
  if (!auth.session) return auth.response;

  try {
    const body = await request.json();
    const id = typeof body?.id === "string" ? body.id : "";
    const nickname = typeof body?.nickname === "string" ? body.nickname.trim() : undefined;
    const email = typeof body?.email === "string" ? body.email.trim() : undefined;
    const password = typeof body?.password === "string" && body.password ? body.password : undefined;

    if (!id) {
      return jsonResponse({ ok: false, message: "Chybí id upravovaného admina." }, 400);
    }
    if (email !== undefined && !EMAIL_RE.test(email)) {
      return jsonResponse({ ok: false, message: "Neplatný formát e-mailu." }, 400);
    }
    if (password !== undefined && password.length < 8) {
      return jsonResponse({ ok: false, message: "Heslo musí mít alespoň 8 znaků." }, 400);
    }

    const service = createServiceClient();

    if (nickname) {
      const { error: nicknameError } = await service.from("profiles").update({ nickname }).eq("id", id);
      if (nicknameError) {
        const message = nicknameError.code === "23505" ? "Tato přezdívka už je obsazená." : nicknameError.message;
        return jsonResponse({ ok: false, message }, 400);
      }
    }

    if (email !== undefined || password !== undefined) {
      const { error: authError } = await service.auth.admin.updateUserById(id, {
        ...(email !== undefined ? { email } : {}),
        ...(password !== undefined ? { password } : {}),
      });
      if (authError) {
        return jsonResponse({ ok: false, message: authError.message }, 400);
      }
    }

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    return jsonResponse({ ok: false, message: error instanceof Error ? error.message : "Neznámá chyba" }, 500);
  }
}

export async function DELETE({ request, cookies }: APIContext) {
  const auth = await requirePrimaryAdmin(cookies);
  if (!auth.session) return auth.response;

  try {
    const body = await request.json();
    const id = typeof body?.id === "string" ? body.id : "";
    if (!id) {
      return jsonResponse({ ok: false, message: "Chybí id mazaného admina." }, 400);
    }
    if (id === auth.session.userId) {
      return jsonResponse({ ok: false, message: "Nemůžete smazat sami sebe." }, 400);
    }

    const service = createServiceClient();
    const { data: target } = await service.from("profiles").select("is_primary").eq("id", id).maybeSingle();
    if (target?.is_primary) {
      return jsonResponse({ ok: false, message: "Primárního admina nelze smazat." }, 400);
    }

    const { error } = await service.auth.admin.deleteUser(id);
    if (error) {
      return jsonResponse({ ok: false, message: error.message }, 500);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    return jsonResponse({ ok: false, message: error instanceof Error ? error.message : "Neznámá chyba" }, 500);
  }
}
