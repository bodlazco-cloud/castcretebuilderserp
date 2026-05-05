import { redirect } from "next/navigation";
export default function NewVendorRedirect() {
  redirect("/admin/suppliers/new");
}
