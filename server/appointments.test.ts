import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db functions
vi.mock("./db", () => ({
  getAppointmentsByDate: vi.fn().mockResolvedValue([
    {
      id: 1,
      customerName: "أحمد محمد",
      phoneNumber: "0501234567",
      appointmentDate: "2026-06-11",
      timeSlot: "10:00",
      notified: 0,
      createdAt: new Date(),
    },
  ]),
  createAppointment: vi.fn().mockResolvedValue({ id: 2 }),
  deleteAppointment: vi.fn().mockResolvedValue(undefined),
  checkSlotAvailable: vi.fn().mockResolvedValue(true),
  trackPhoneNumber: vi.fn().mockResolvedValue(undefined),
  getStatistics: vi.fn().mockResolvedValue({ totalAppointments: 0, totalReviews: 0, averageRating: 0 }),
  getPhoneNumberStats: vi.fn().mockResolvedValue(null),
  getTopPhoneNumbers: vi.fn().mockResolvedValue([]),
  createReview: vi.fn().mockResolvedValue({ id: 1 }),
  getAllReviews: vi.fn().mockResolvedValue([]),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("appointments.getByDate", () => {
  it("returns appointments for a given date", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.appointments.getByDate({ date: "2026-06-11" });
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toMatchObject({ customerName: "أحمد محمد", timeSlot: "10:00" });
  });
});

describe("appointments.create", () => {
  it("creates a new appointment and returns id", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.appointments.create({
      customerName: "سالم العمري",
      phoneNumber: "0559876543",
      appointmentDate: "2026-06-11",
      timeSlot: "14:30",
    });
    expect(result).toMatchObject({ id: 2 });
  });

  it("rejects empty customerName", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.appointments.create({
        customerName: "",
        phoneNumber: "0559876543",
        appointmentDate: "2026-06-11",
        timeSlot: "14:30",
      })
    ).rejects.toThrow();
  });

  it("rejects invalid date format", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.appointments.create({
        customerName: "سالم",
        phoneNumber: "0559876543",
        appointmentDate: "11-06-2026",
        timeSlot: "14:30",
      })
    ).rejects.toThrow();
  });
});

describe("appointments.delete", () => {
  it("deletes an appointment by id", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.appointments.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});
