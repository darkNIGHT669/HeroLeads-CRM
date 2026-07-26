import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { GET as getLeads, POST as postLead } from "@/app/api/v1/leads/route";
import {
  GET as getLeadDetail,
  PATCH as patchLead,
  DELETE as deleteLead,
} from "@/app/api/v1/leads/[id]/route";
import { POST as postNote } from "@/app/api/v1/leads/[id]/notes/route";
import { db } from "@/lib/db";
import * as auth from "@/lib/auth";

// Mock the auth getSession method
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof auth>();
  return {
    ...actual,
    getSession: vi.fn(),
  };
});

describe("CRM Leads and RBAC Integration Tests", () => {
  let testAdmin: any;
  let testMember: any;
  let testMember2: any;
  let sharedLead: any;

  beforeAll(async () => {
    // Generate distinct test users
    testAdmin = await db.user.create({
      data: {
        name: "Test Admin",
        email: "test-admin@test.com",
        passwordHash: "mockedhash",
        role: "ADMIN",
      },
    });

    testMember = await db.user.create({
      data: {
        name: "Test Member 1",
        email: "test-member1@test.com",
        passwordHash: "mockedhash",
        role: "MEMBER",
      },
    });

    testMember2 = await db.user.create({
      data: {
        name: "Test Member 2",
        email: "test-member2@test.com",
        passwordHash: "mockedhash",
        role: "MEMBER",
      },
    });

    // Create a base lead for RBAC testing
    sharedLead = await db.lead.create({
      data: {
        title: "Test Lead Title",
        company: "Test Company Inc.",
        contactEmail: "contact@testcompany.com",
        phone: "555-123-4567",
        status: "NEW",
        assignedToId: testMember.id, // assigned to member 1
      },
    });
  });

  afterAll(async () => {
    // Cleanup created records to keep database clean
    const leadIds = await db.lead.findMany({
      where: {
        company: { in: ["Test Company Inc.", "Lifecycle Corp"] },
      },
      select: { id: true },
    });

    const ids = leadIds.map((l) => l.id);

    await db.activity.deleteMany({ where: { leadId: { in: ids } } });
    await db.leadNote.deleteMany({ where: { leadId: { in: ids } } });
    await db.lead.deleteMany({ where: { id: { in: ids } } });
    await db.user.deleteMany({
      where: {
        email: { in: ["test-admin@test.com", "test-member1@test.com", "test-member2@test.com"] },
      },
    });
  });

  const mockSession = (user: any) => {
    vi.mocked(auth.getSession).mockResolvedValue(user);
  };

  describe("RBAC Permissions Verification", () => {
    it("should allow Admin to fetch any lead detail", async () => {
      mockSession({
        id: testAdmin.id,
        name: testAdmin.name,
        email: testAdmin.email,
        role: "ADMIN",
      });

      const req = new Request("http://localhost/api/v1/leads/" + sharedLead.id);
      const res = await getLeadDetail(req, { params: Promise.resolve({ id: sharedLead.id }) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.id).toBe(sharedLead.id);
    });

    it("should allow assigned Member to fetch their lead detail", async () => {
      mockSession({
        id: testMember.id,
        name: testMember.name,
        email: testMember.email,
        role: "MEMBER",
      });

      const req = new Request("http://localhost/api/v1/leads/" + sharedLead.id);
      const res = await getLeadDetail(req, { params: Promise.resolve({ id: sharedLead.id }) });
      expect(res.status).toBe(200);
    });

    it("should reject unassigned Member trying to view a lead (403 Forbidden)", async () => {
      mockSession({
        id: testMember2.id,
        name: testMember2.name,
        email: testMember2.email,
        role: "MEMBER",
      });

      const req = new Request("http://localhost/api/v1/leads/" + sharedLead.id);
      const res = await getLeadDetail(req, { params: Promise.resolve({ id: sharedLead.id }) });
      expect(res.status).toBe(403);

      const data = await res.json();
      expect(data.error).toContain("Forbidden");
    });

    it("should reject Member trying to delete a lead (403 Forbidden)", async () => {
      mockSession({
        id: testMember.id,
        name: testMember.name,
        email: testMember.email,
        role: "MEMBER",
      });

      const req = new Request("http://localhost/api/v1/leads/" + sharedLead.id, {
        method: "DELETE",
      });
      const res = await deleteLead(req, { params: Promise.resolve({ id: sharedLead.id }) });
      expect(res.status).toBe(403);
    });

    it("should permit Admin to delete a lead", async () => {
      mockSession({
        id: testAdmin.id,
        name: testAdmin.name,
        email: testAdmin.email,
        role: "ADMIN",
      });

      // Create a temporary lead to delete
      const tempLead = await db.lead.create({
        data: {
          title: "Temporary",
          company: "Test Company Inc.",
          contactEmail: "temp@test.com",
          phone: "123",
          status: "NEW",
        },
      });

      const req = new Request("http://localhost/api/v1/leads/" + tempLead.id, {
        method: "DELETE",
      });
      const res = await deleteLead(req, { params: Promise.resolve({ id: tempLead.id }) });
      expect(res.status).toBe(200);

      // Verify DB removal
      const check = await db.lead.findUnique({ where: { id: tempLead.id } });
      expect(check).toBeNull();
    });
  });

  describe("Lead Lifecycle and Audit trail logging", () => {
    it("should run complete lead lifecycle from capture to status update and note creation", async () => {
      // 1. Capture public lead
      const capturePayload = {
        title: "Lifecycle Integration Test",
        company: "Lifecycle Corp",
        contactEmail: "inquiry@lifecycle.com",
        phone: "555-987-6543",
      };

      const captureReq = new Request("http://localhost/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(capturePayload),
      });

      const captureRes = await postLead(captureReq);
      expect(captureRes.status).toBe(201);

      const capturedLead = await captureRes.json();
      expect(capturedLead.id).toBeDefined();
      expect(capturedLead.status).toBe("NEW");

      // Verify LEAD_CREATED ActivityTrail was created
      const creationActivity = await db.activity.findFirst({
        where: { leadId: capturedLead.id, actionType: "LEAD_CREATED" },
      });
      expect(creationActivity).not.toBeNull();

      // 2. Admin assigns lead to Member 1
      mockSession({
        id: testAdmin.id,
        name: testAdmin.name,
        email: testAdmin.email,
        role: "ADMIN",
      });

      const patchAssignReq = new Request("http://localhost/api/v1/leads/" + capturedLead.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: testMember.id }),
      });

      const patchAssignRes = await patchLead(patchAssignReq, {
        params: Promise.resolve({ id: capturedLead.id }),
      });
      expect(patchAssignRes.status).toBe(200);

      // Verify ASSIGNED ActivityTrail was created
      const assignActivity = await db.activity.findFirst({
        where: { leadId: capturedLead.id, actionType: "ASSIGNED" },
      });
      expect(assignActivity).not.toBeNull();
      const assignMeta = JSON.parse(assignActivity!.metadataJson);
      expect(assignMeta.assignedTo).toBe(testMember.name);

      // 3. Member 1 updates Status to CONTACTED
      mockSession({
        id: testMember.id,
        name: testMember.name,
        email: testMember.email,
        role: "MEMBER",
      });

      const patchStatusReq = new Request("http://localhost/api/v1/leads/" + capturedLead.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONTACTED" }),
      });

      const patchStatusRes = await patchLead(patchStatusReq, {
        params: Promise.resolve({ id: capturedLead.id }),
      });
      expect(patchStatusRes.status).toBe(200);

      // Verify STATUS_CHANGE ActivityTrail was created
      const statusActivity = await db.activity.findFirst({
        where: { leadId: capturedLead.id, actionType: "STATUS_CHANGE" },
      });
      expect(statusActivity).not.toBeNull();
      const statusMeta = JSON.parse(statusActivity!.metadataJson);
      expect(statusMeta.oldStatus).toBe("NEW");
      expect(statusMeta.newStatus).toBe("CONTACTED");

      // 4. Member 1 appends discussion note
      const noteReq = new Request("http://localhost/api/v1/leads/" + capturedLead.id + "/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Verified details, client is scheduling meeting." }),
      });

      const noteRes = await postNote(noteReq, {
        params: Promise.resolve({ id: capturedLead.id }),
      });
      expect(noteRes.status).toBe(201);

      // Verify Note in database
      const note = await db.leadNote.findFirst({
        where: { leadId: capturedLead.id },
      });
      expect(note).not.toBeNull();
      expect(note!.content).toBe("Verified details, client is scheduling meeting.");

      // Verify NOTE_ADDED ActivityTrail was created
      const noteActivity = await db.activity.findFirst({
        where: { leadId: capturedLead.id, actionType: "NOTE_ADDED" },
      });
      expect(noteActivity).not.toBeNull();
    });
  });
});
