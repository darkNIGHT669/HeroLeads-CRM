import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const updateLeadSchema = z.object({
  title: z.string().optional(),
  company: z.string().optional(),
  contactEmail: z.string().email("Invalid email").optional(),
  phone: z.string().optional(),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "LOST", "WON"]).optional(),
  assignedToId: z.string().nullable().optional(),
});

// GET: Retrieve a single lead, notes, and activity history
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const lead = await db.lead.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        notes: {
          include: {
            author: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        activities: {
          include: {
            actor: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Member access guard
    if (session.role === "MEMBER" && lead.assignedToId !== session.id) {
      return NextResponse.json(
        { error: "Forbidden: You do not have access to this lead" },
        { status: 403 }
      );
    }

    return NextResponse.json(lead, { status: 200 });
  } catch (error) {
    console.error("GET /api/v1/leads/[id] error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 }
    );
  }
}

// PATCH: Update a lead (status, assignee, fields)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const validation = updateLeadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const lead = await db.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const { title, company, contactEmail, phone, status, assignedToId } = validation.data;

    // MEMBER role validation
    if (session.role === "MEMBER") {
      // Members can only edit leads assigned to them
      if (lead.assignedToId !== session.id) {
        return NextResponse.json(
          { error: "Forbidden: You can only edit leads assigned to you" },
          { status: 403 }
        );
      }

      // Members cannot reassign or change other text fields
      if (
        title !== undefined ||
        company !== undefined ||
        contactEmail !== undefined ||
        phone !== undefined ||
        assignedToId !== undefined
      ) {
        return NextResponse.json(
          { error: "Forbidden: Members are only permitted to update lead status" },
          { status: 403 }
        );
      }

      // Members can only update status
      if (status && status !== lead.status) {
        const updatedLead = await db.lead.update({
          where: { id },
          data: { status },
        });

        await db.activity.create({
          data: {
            leadId: id,
            actorId: session.id,
            actionType: "STATUS_CHANGE",
            metadataJson: JSON.stringify({ oldStatus: lead.status, newStatus: status }),
          },
        });

        return NextResponse.json(updatedLead, { status: 200 });
      }

      return NextResponse.json(lead, { status: 200 });
    }

    // ADMIN role validation (Full CRUD)
    const updateData: any = {};
    const activitiesToCreate = [];

    if (title !== undefined) updateData.title = title;
    if (company !== undefined) updateData.company = company;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (phone !== undefined) updateData.phone = phone;

    if (status !== undefined && status !== lead.status) {
      updateData.status = status;
      activitiesToCreate.push({
        leadId: id,
        actorId: session.id,
        actionType: "STATUS_CHANGE",
        metadataJson: JSON.stringify({ oldStatus: lead.status, newStatus: status }),
      });
    }

    if (assignedToId !== undefined && assignedToId !== lead.assignedToId) {
      updateData.assignedToId = assignedToId;
      
      let assigneeName = "None";
      if (assignedToId) {
        const newAssignee = await db.user.findUnique({
          where: { id: assignedToId },
          select: { name: true },
        });
        assigneeName = newAssignee?.name || "None";
      }

      activitiesToCreate.push({
        leadId: id,
        actorId: session.id,
        actionType: "ASSIGNED",
        metadataJson: JSON.stringify({ assignedTo: assigneeName }),
      });
    }

    const updatedLead = await db.lead.update({
      where: { id },
      data: updateData,
    });

    // Create activity logs in background
    if (activitiesToCreate.length > 0) {
      await db.activity.createMany({
        data: activitiesToCreate,
      });
    }

    return NextResponse.json(updatedLead, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/v1/leads/[id] error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a lead (Admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can delete leads" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const lead = await db.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    await db.lead.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Lead successfully deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/v1/leads/[id] error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 }
    );
  }
}
