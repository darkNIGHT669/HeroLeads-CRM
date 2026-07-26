import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createLeadSchema = z.object({
  title: z.string().min(2, "Title is too short"),
  company: z.string().min(2, "Company name is too short"),
  contactEmail: z.string().email("Invalid contact email"),
  phone: z.string().min(5, "Invalid phone number"),
});

// GET: Retrieve a list of leads (authenticated, paginated, filtered, searched)
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const status = searchParams.get("status");
    const assignedTo = searchParams.get("assignedTo");
    const q = searchParams.get("q");

    const skip = (page - 1) * limit;

    // Build the filter object
    const where: any = {};

    // Role-based filter enforcement
    if (session.role === "MEMBER") {
      // Members can only see leads assigned to themselves
      where.assignedToId = session.id;
    } else if (assignedTo) {
      // Admins can filter by assignee
      where.assignedToId = assignedTo;
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Search query
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { company: { contains: q } },
        { contactEmail: { contains: q } },
      ];
    }

    // Fetch leads and total count in parallel
    const [leads, total] = await Promise.all([
      db.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      db.lead.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        leads,
        meta: {
          total,
          page,
          limit,
          totalPages,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/v1/leads error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 }
    );
  }
}

// POST: Public lead capture form (unauthenticated)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate schema
    const validation = createLeadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, company, contactEmail, phone } = validation.data;

    // Create the lead
    const newLead = await db.lead.create({
      data: {
        title,
        company,
        contactEmail,
        phone,
        status: "NEW",
      },
    });

    // Log the activity (public submission has no actor)
    await db.activity.create({
      data: {
        leadId: newLead.id,
        actorId: null,
        actionType: "LEAD_CREATED",
        metadataJson: JSON.stringify({ message: "Lead captured via public form API." }),
      },
    });

    return NextResponse.json(newLead, { status: 201 });
  } catch (error) {
    console.error("POST /api/v1/leads error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 }
    );
  }
}
