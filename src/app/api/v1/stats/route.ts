import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const where: any = {};
    if (session.role === "MEMBER") {
      where.assignedToId = session.id;
    }

    // Run direct count aggregates in parallel
    const [total, newCount, contacted, qualified, won] = await Promise.all([
      db.lead.count({ where }),
      db.lead.count({ where: { ...where, status: "NEW" } }),
      db.lead.count({ where: { ...where, status: "CONTACTED" } }),
      db.lead.count({ where: { ...where, status: "QUALIFIED" } }),
      db.lead.count({ where: { ...where, status: "WON" } }),
    ]);

    return NextResponse.json(
      {
        total,
        new: newCount,
        contacted,
        qualified,
        won,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/v1/stats error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 }
    );
  }
}
