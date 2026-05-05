import { redirect } from "next/navigation";
export default async function SowDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/activity-defs/${id}`);
}
