"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleMilestoneDefinitionActive } from "@/actions/master-list";

export function MilestoneToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleMilestoneDefinitionActive(id, !isActive);
      router.refresh();
    });
  }

  return (
    <button onClick={handleToggle} disabled={isPending} style={{
      padding: "0.5rem 1rem", borderRadius: "6px",
      background: isActive ? "#fef2f2" : "#f0fdf4",
      color: isActive ? "#b91c1c" : "#166534",
      border: `1px solid ${isActive ? "#fecaca" : "#86efac"}`,
      fontSize: "0.8rem", fontWeight: 600,
      cursor: isPending ? "not-allowed" : "pointer",
    }}>
      {isPending ? "…" : isActive ? "Deactivate" : "Reactivate"}
    </button>
  );
}
