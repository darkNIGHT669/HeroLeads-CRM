import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createNoteSchema = z.object({
  content: z.string().min(1, "Note content cannot be empty"),
});

// POST: Add a note to a lead
export async function POST(
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

    const validation = createNoteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { content } = validation.data;

    const lead = await db.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Member access guard
    if (session.role === "MEMBER" && lead.assignedToId !== session.id) {
      return NextResponse.json(
        { error: "Forbidden: You can only add notes to leads assigned to you" },
        { status: 403 }
      );
    }

    const newNote = await db.leadNote.create({
      data: {
        leadId: id,
        authorId: session.id,
        content,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // Log activity
    await db.activity.create({
      data: {
        leadId: id,
        actorId: session.id,
        actionType: "NOTE_ADDED",
        metadataJson: JSON.stringify({ noteId: newNote.id }),
      },
    });

    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    console.error("POST /api/v1/leads/[id]/notes error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 }
    );
  }
}
