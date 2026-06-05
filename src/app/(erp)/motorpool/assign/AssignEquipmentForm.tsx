"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Equip = { id: string; code: string; name: string; type: string };
type Project = { id: string; name: string };
type CC = { id: string; code: string; name: string };
type Unit = { id: string; unitCode: string; projectId: string };
type Operator = { id: string; fullName: string; employeeCode: string };

export function AssignEquipmentForm({ equipment, projects, costCenters, units, operators }: {
  equipment: Equip[];
  projects: Project[];
  costCenters: CC[];
  units: Unit[];
  operators: Operator[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedProject, setSelectedProject] = useState("");
  const [rateType, setRateType] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");

  return (
    <div>
      <p>DEBUG v3: all hooks loaded OK. isPending={String(isPending)}, selectedProject=&quot;{selectedProject}&quot;, rateType={rateType}</p>
      <p>Props: equipment={equipment.length}, projects={projects.length}, costCenters={costCenters.length}, units={units.length}, operators={operators.length}</p>
      <button onClick={() => router.push("/motorpool")}>Test router.push</button>
      <button onClick={() => startTransition(() => {})}>Test startTransition</button>
      <button onClick={() => setSelectedProject("test")}>Test setState</button>
    </div>
  );
}
