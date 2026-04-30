/**
 * One-time script: invite a user via Supabase Admin API with user_metadata.
 * Usage: npx tsx scripts/invite-user.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function inviteUser() {
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(
    "bod.lazco@gmail.com",
    {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/confirm`,
      data: {
        dept_code: "ADMIN",
        full_name: "Lesley M Ventura",
      },
    },
  );

  if (error) {
    console.error("❌ Failed to invite user:", error.message);
    process.exit(1);
  }

  console.log("✅ Invite sent to:", data.user.email);
  console.log("   User ID  :", data.user.id);
  console.log("   Metadata :", data.user.user_metadata);
}

inviteUser();
