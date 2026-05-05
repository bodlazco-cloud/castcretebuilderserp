import { redirect } from "next/navigation";
export default async function MaterialDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/materials/${id}`);
}
