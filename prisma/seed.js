const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seeding...");

  // Clean existing database records
  await prisma.activity.deleteMany({});
  await prisma.leadNote.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("Cleaned existing records.");

  // Hash passwords
  const passwordHash = await bcrypt.hash("password123", 10);

  // Create Users
  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@example.com",
      passwordHash,
      role: "ADMIN",
    },
  });

  const member = await prisma.user.create({
    data: {
      name: "Member User",
      email: "member@example.com",
      passwordHash,
      role: "MEMBER",
    },
  });

  console.log("Seeded Users:", { admin: admin.email, member: member.email });

  // Create Leads
  const lead1 = await prisma.lead.create({
    data: {
      title: "Enterprise CRM Licensing",
      company: "Google Inc.",
      contactEmail: "procurement@google.com",
      phone: "+1-555-0101",
      status: "NEW",
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      title: "Cloud Migration Architecture",
      company: "Microsoft Corp.",
      contactEmail: "azure-ops@microsoft.com",
      phone: "+1-555-0202",
      status: "CONTACTED",
      assignedToId: member.id,
    },
  });

  const lead3 = await prisma.lead.create({
    data: {
      title: "Security Hardening Audit",
      company: "Amazon Web Services",
      contactEmail: "security-leads@amazon.com",
      phone: "+1-555-0303",
      status: "QUALIFIED",
      assignedToId: member.id,
    },
  });

  const lead4 = await prisma.lead.create({
    data: {
      title: "Ad Conversion Optimization",
      company: "Meta Platforms",
      contactEmail: "marketing@meta.com",
      phone: "+1-555-0404",
      status: "LOST",
      assignedToId: admin.id,
    },
  });

  const lead5 = await prisma.lead.create({
    data: {
      title: "Edge Delivery AI Agent",
      company: "Netflix Inc.",
      contactEmail: "delivery@netflix.com",
      phone: "+1-555-0505",
      status: "WON",
      assignedToId: admin.id,
    },
  });

  console.log("Seeded 5 demo leads.");

  // Create Lead Notes
  const note1 = await prisma.leadNote.create({
    data: {
      leadId: lead2.id,
      authorId: member.id,
      content: "Initial call done. They want a migration breakdown for 50 VMs by next Tuesday.",
    },
  });

  const note2 = await prisma.leadNote.create({
    data: {
      leadId: lead3.id,
      authorId: admin.id,
      content: "Approved custom scoping budget. Member User to coordinate detailed requirements discovery.",
    },
  });

  console.log("Seeded lead notes.");

  // Seed Activity Trails
  await prisma.activity.createMany({
    data: [
      {
        leadId: lead1.id,
        actorId: admin.id,
        actionType: "LEAD_CREATED",
        metadataJson: JSON.stringify({ message: "Lead captured via public form API." }),
      },
      {
        leadId: lead2.id,
        actorId: admin.id,
        actionType: "LEAD_CREATED",
        metadataJson: JSON.stringify({ message: "Lead created manually." }),
      },
      {
        leadId: lead2.id,
        actorId: admin.id,
        actionType: "ASSIGNED",
        metadataJson: JSON.stringify({ assignedTo: member.name }),
      },
      {
        leadId: lead2.id,
        actorId: member.id,
        actionType: "STATUS_CHANGE",
        metadataJson: JSON.stringify({ oldStatus: "NEW", newStatus: "CONTACTED" }),
      },
      {
        leadId: lead2.id,
        actorId: member.id,
        actionType: "NOTE_ADDED",
        metadataJson: JSON.stringify({ noteId: note1.id }),
      },
      {
        leadId: lead3.id,
        actorId: member.id,
        actionType: "STATUS_CHANGE",
        metadataJson: JSON.stringify({ oldStatus: "NEW", newStatus: "QUALIFIED" }),
      },
      {
        leadId: lead3.id,
        actorId: admin.id,
        actionType: "NOTE_ADDED",
        metadataJson: JSON.stringify({ noteId: note2.id }),
      },
    ],
  });

  console.log("Seeded activity trail logs.");
  console.log("Database successfully seeded!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
