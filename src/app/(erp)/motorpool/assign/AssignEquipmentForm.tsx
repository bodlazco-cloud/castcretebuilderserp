"use client";

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
  return (
    <div>
      <p>DEBUG v2: no hooks, no imports. Props received:</p>
      <p>equipment={equipment.length}, projects={projects.length}, costCenters={costCenters.length}, units={units.length}, operators={operators.length}</p>
    </div>
  );
}
