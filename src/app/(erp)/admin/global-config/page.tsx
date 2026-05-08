export const dynamic = "force-dynamic";
import { db } from "@/db";
import { globalSettings } from "@/db/schema";
import { getAuthUser } from "@/lib/supabase-server";
import GlobalConfigClient from "./GlobalConfigClient";

export default async function GlobalConfigPage() {
  await getAuthUser();

  let settings: Array<{ key: string; value: string | null; label: string; description: string | null }> = [];
  try {
    settings = await db
      .select({ key: globalSettings.key, value: globalSettings.value, label: globalSettings.label, description: globalSettings.description })
      .from(globalSettings)
      .orderBy(globalSettings.key);
  } catch {
    // table may not exist yet — show empty state
  }

  return <GlobalConfigClient settings={settings} />;
}
