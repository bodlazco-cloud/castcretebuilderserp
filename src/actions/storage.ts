"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";

// ─── Bucket names ─────────────────────────────────────────────────────────────
export const BUCKETS = {
  SITE_PHOTOS:   "site-photos",
  DOCUMENTS:     "documents",
  NTP:           "ntp-documents",
  PROFORMA:      "proforma-invoices",
} as const;

type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

// ─── Permission matrix ────────────────────────────────────────────────────────
// Maps which departments may upload to which buckets.
const BUCKET_PERMISSIONS: Record<BucketName, string[]> = {
  [BUCKETS.SITE_PHOTOS]: ["CONSTRUCTION", "AUDIT"],
  [BUCKETS.DOCUMENTS]:   ["CONSTRUCTION", "PROCUREMENT", "FINANCE", "AUDIT", "HR"],
  [BUCKETS.NTP]:         ["CONSTRUCTION", "ADMIN", "BOD"],
  [BUCKETS.PROFORMA]:    ["PROCUREMENT"],
};

const UploadSchema = z.object({
  bucket:    z.enum([BUCKETS.SITE_PHOTOS, BUCKETS.DOCUMENTS, BUCKETS.NTP, BUCKETS.PROFORMA]),
  folder:    z.string().min(1),   // e.g. "projects/{projectId}/units/{unitId}"
  fileName:  z.string().min(1),
});

export type UploadResult =
  | { success: true; path: string; publicUrl: string }
  | { success: false; error: string };

/**
 * Upload a file to Supabase Storage and return the stored path.
 * The path is saved in the relevant Drizzle table column (e.g. milestone_documents.file_url).
 *
 * Security:
 *  - Supabase Auth session is verified server-side.
 *  - Department-level bucket permission is enforced before upload.
 *  - File type is restricted to images and PDFs.
 */
export async function uploadFile(
  formData: FormData,
  meta: z.infer<typeof UploadSchema>,
): Promise<UploadResult> {
  const parsed = UploadSchema.safeParse(meta);
  if (!parsed.success) {
    return { success: false, error: "Invalid upload parameters." };
  }

  const { bucket, folder, fileName } = parsed.data;

  // ── Auth: get the calling user's session ────────────────────────────────────
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated." };
  }

  // ── Permission: check department bucket access ───────────────────────────────
  const userDept: string = user.user_metadata?.dept_code ?? "";
  const allowedDepts = BUCKET_PERMISSIONS[bucket];
  if (!allowedDepts.includes(userDept)) {
    return { success: false, error: `Department '${userDept}' cannot upload to '${bucket}'.` };
  }

  // ── File validation ──────────────────────────────────────────────────────────
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "No file provided." };
  }

  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { success: false, error: "Only JPEG, PNG, WEBP, and PDF files are allowed." };
  }

  const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
  if (file.size > MAX_SIZE_BYTES) {
    return { success: false, error: "File exceeds the 20 MB size limit." };
  }

  // ── Build a collision-resistant path ─────────────────────────────────────────
  const ext = file.name.split(".").pop() ?? "bin";
  const safeName = `${Date.now()}_${fileName.replace(/[^a-z0-9_\-\.]/gi, "_")}.${ext}`;
  const storagePath = `${folder}/${safeName}`;

  // ── Upload ───────────────────────────────────────────────────────────────────
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file, { upsert: false, contentType: file.type });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);

  return { success: true, path: storagePath, publicUrl: urlData.publicUrl };
}
