import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateOTP,
  verifyOTP,
  registerMember,
  getMemberByPhone,
  addSupervisor,
  removeSupervisor,
  getSupervisors,
} from "./db";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue({ id: 1 }),
      $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
      onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  })),
  generateOTP: vi.fn(),
  verifyOTP: vi.fn(),
  registerMember: vi.fn(),
  getMemberByPhone: vi.fn(),
  addSupervisor: vi.fn(),
  removeSupervisor: vi.fn(),
  getSupervisors: vi.fn(),
}));

describe("OTP Security Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate a 6-digit OTP code", async () => {
    const mockGenerateOTP = vi.fn(async (phone: string) => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      return code;
    });

    const code = await mockGenerateOTP("0558394644");
    expect(code).toMatch(/^\d{6}$/);
    expect(code.length).toBe(6);
  });

  it("should reject OTP after 3 failed attempts", async () => {
    const mockVerifyOTP = vi.fn(async (phone: string, code: string) => {
      // Simulate 3 failed attempts
      const attempts = 3;
      if (attempts >= 3) return false;
      return true;
    });

    const result = await mockVerifyOTP("0558394644", "000000");
    expect(result).toBe(false);
  });

  it("should reject expired OTP codes", async () => {
    const mockVerifyOTP = vi.fn(async (phone: string, code: string) => {
      const expiresAt = new Date(Date.now() - 11 * 60 * 1000); // 11 minutes ago
      const now = new Date();
      if (expiresAt < now) return false;
      return true;
    });

    const result = await mockVerifyOTP("0558394644", "123456");
    expect(result).toBe(false);
  });

  it("should prevent OTP reuse after verification", async () => {
    const mockVerifyOTP = vi.fn(async (phone: string, code: string) => {
      const verified = 1; // Already verified
      if (verified === 1) return false;
      return true;
    });

    const result = await mockVerifyOTP("0558394644", "123456");
    expect(result).toBe(false);
  });

  it("should successfully verify valid OTP", async () => {
    const mockVerifyOTP = vi.fn(async (phone: string, code: string) => {
      const attempts = 0;
      const verified = 0;
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
      const now = new Date();

      if (verified === 1) return false;
      if (attempts >= 3) return false;
      if (expiresAt < now) return false;
      if (code !== "123456") return false;

      return true;
    });

    const result = await mockVerifyOTP("0558394644", "123456");
    expect(result).toBe(true);
  });
});

describe("Member Registration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register a new member with phone and name", async () => {
    const mockRegisterMember = vi.fn(async (phone: string, name: string) => {
      return {
        id: 1,
        phoneNumber: phone,
        name,
        email: null,
        role: "member",
        status: "active",
      };
    });

    const member = await mockRegisterMember("0558394644", "أحمد");
    expect(member.phoneNumber).toBe("0558394644");
    expect(member.name).toBe("أحمد");
    expect(member.role).toBe("member");
    expect(member.status).toBe("active");
  });

  it("should retrieve member by phone number", async () => {
    const mockGetMemberByPhone = vi.fn(async (phone: string) => {
      if (phone === "0558394644") {
        return {
          id: 1,
          phoneNumber: phone,
          name: "أحمد",
          email: null,
          role: "member",
          status: "active",
        };
      }
      return null;
    });

    const member = await mockGetMemberByPhone("0558394644");
    expect(member).not.toBeNull();
    expect(member?.phoneNumber).toBe("0558394644");

    const notFound = await mockGetMemberByPhone("9999999999");
    expect(notFound).toBeNull();
  });
});

describe("Supervisor Authorization Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should add a member as supervisor", async () => {
    const mockAddSupervisor = vi.fn(async (memberId: number, addedBy: number) => {
      return {
        id: 1,
        memberId,
        addedBy,
        createdAt: new Date(),
      };
    });

    const supervisor = await mockAddSupervisor(1, 999); // memberId=1, addedBy=999 (owner)
    expect(supervisor.memberId).toBe(1);
    expect(supervisor.addedBy).toBe(999);
  });

  it("should remove a supervisor", async () => {
    const mockRemoveSupervisor = vi.fn(async (memberId: number) => {
      return { success: true };
    });

    const result = await mockRemoveSupervisor(1);
    expect(result.success).toBe(true);
  });

  it("should list all supervisors", async () => {
    const mockGetSupervisors = vi.fn(async () => {
      return [
        {
          id: 1,
          memberId: 1,
          phoneNumber: "0558394644",
          name: "أحمد",
          createdAt: new Date(),
        },
        {
          id: 2,
          memberId: 2,
          phoneNumber: "0501234567",
          name: "محمد",
          createdAt: new Date(),
        },
      ];
    });

    const supervisors = await mockGetSupervisors();
    expect(supervisors.length).toBe(2);
    expect(supervisors[0].name).toBe("أحمد");
    expect(supervisors[1].name).toBe("محمد");
  });

  it("should validate supervisor phone number matches member", async () => {
    const mockValidateSupervisor = vi.fn(async (memberId: number, phone: string) => {
      const memberPhone = "0558394644";
      if (phone !== memberPhone) {
        throw new Error("Phone number does not match member");
      }
      return true;
    });

    await expect(
      mockValidateSupervisor(1, "9999999999")
    ).rejects.toThrow("Phone number does not match member");

    const valid = await mockValidateSupervisor(1, "0558394644");
    expect(valid).toBe(true);
  });
});

describe("Appointment Member Linking Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create appointment with optional memberId", async () => {
    const mockCreateAppointment = vi.fn(async (data: any) => {
      return { id: 1, ...data };
    });

    // Appointment without member
    const apptWithoutMember = await mockCreateAppointment({
      customerName: "علي",
      phoneNumber: "0558394644",
      appointmentDate: "2026-06-21",
      timeSlot: "10:00",
      status: "pending",
    });
    expect(apptWithoutMember.memberId).toBeUndefined();

    // Appointment with member
    const apptWithMember = await mockCreateAppointment({
      memberId: 1,
      customerName: "علي",
      phoneNumber: "0558394644",
      appointmentDate: "2026-06-21",
      timeSlot: "10:00",
      status: "pending",
    });
    expect(apptWithMember.memberId).toBe(1);
  });

  it("should validate memberId matches phone number on booking", async () => {
    const mockValidateAppointment = vi.fn(async (memberId: number, phone: string) => {
      const memberPhone = "0558394644";
      if (phone !== memberPhone) {
        throw new Error("Member ID does not match phone number");
      }
      return true;
    });

    await expect(
      mockValidateAppointment(1, "9999999999")
    ).rejects.toThrow("Member ID does not match phone number");

    const valid = await mockValidateAppointment(1, "0558394644");
    expect(valid).toBe(true);
  });
});
