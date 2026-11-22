import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/permissions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { TenantRole } from "@/lib/types/database";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase não configurado." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const target = String(formData.get("target") ?? "profile");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Nenhum arquivo de imagem enviado." },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Formato inválido. Use PNG, JPG ou WEBP." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "A imagem deve ter no máximo 2 MB." },
      { status: 400 }
    );
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";

  let objectPath = `profiles/${user.id}/avatar-${Date.now()}.${ext}`;

  if (target === "tenant_logo" || target === "tenant_avatar") {
    const { data: membership } = await supabase
      .from("tenant_members")
      .select("tenant_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (
      !membership ||
      !hasPermission(membership.role as TenantRole, "branding:manage")
    ) {
      return NextResponse.json(
        { error: "Sem permissão para enviar imagens do mandato." },
        { status: 403 }
      );
    }

    objectPath = `tenants/${membership.tenant_id}/${target}-${Date.now()}.${ext}`;
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("mandato-media")
    .upload(objectPath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      {
        error:
          "Não foi possível enviar a imagem. Confirme se a migração 0007 (bucket mandato-media) foi aplicada no Supabase.",
      },
      { status: 500 }
    );
  }

  const { data: publicUrlData } = supabase.storage
    .from("mandato-media")
    .getPublicUrl(objectPath);

  return NextResponse.json({
    publicUrl: publicUrlData.publicUrl,
  });
}
