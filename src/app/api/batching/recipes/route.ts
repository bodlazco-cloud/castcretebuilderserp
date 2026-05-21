import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { mixDesigns, mixDesignBom, materials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mixId = searchParams.get("mix_design_id");
  if (!mixId) return NextResponse.json({ error: "mix_design_id is required" }, { status: 400 });

  const [mix] = await db
    .select()
    .from(mixDesigns)
    .where(eq(mixDesigns.id, mixId))
    .limit(1);

  if (!mix) return NextResponse.json({ error: "Mix design not found" }, { status: 404 });

  const bomItems = await db
    .select({
      id:               mixDesignBom.id,
      raw_material_id:  mixDesignBom.materialId,
      required_quantity: mixDesignBom.requiredQuantity,
      unit_of_measure:  mixDesignBom.unitOfMeasure,
      sort_order:       mixDesignBom.sortOrder,
      notes:            mixDesignBom.notes,
      material_name:    materials.name,
      material_code:    materials.code,
      material_unit:    materials.unit,
    })
    .from(mixDesignBom)
    .leftJoin(materials, eq(mixDesignBom.materialId, materials.id))
    .where(eq(mixDesignBom.mixDesignId, mixId))
    .orderBy(mixDesignBom.sortOrder);

  return NextResponse.json({
    mix: {
      id:               mix.id,
      mix_code:         mix.code,
      description:      mix.name,
      is_active:        mix.isActive,
      created_at:       mix.createdAt,
    },
    bomItems,
  });
}
