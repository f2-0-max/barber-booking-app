import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  checkSlotAvailable,
  createAppointment,
  deleteAppointment,
  getAppointmentsByDate,
  getConfirmedAppointmentsByDate,
  getAllAppointmentsByDate,
  getPendingAppointments,
  updateAppointmentStatus,
  createReview,
  getAllReviews,
  getStatistics,
  getPhoneNumberStats,
  trackPhoneNumber,
  getTopPhoneNumbers,
  generateOTP,
  verifyOTP,
  registerMember,
  getMemberByPhone,
  getMemberById,
  addSupervisor,
  removeSupervisor,
  getSupervisors,
  isSupervisor,
} from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  appointments: router({
    // Get confirmed appointments only (for customers)
    getConfirmedByDate: publicProcedure
      .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
      .query(async ({ input }) => {
        return getConfirmedAppointmentsByDate(input.date);
      }),

    // Get all appointments including pending (for barber dashboard)
    getAllByDate: publicProcedure
      .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
      .query(async ({ input }) => {
        return getAllAppointmentsByDate(input.date);
      }),

    // Get pending appointments (for barber notifications)
    getPending: publicProcedure.query(async () => {
      return getPendingAppointments();
    }),

    // Approve appointment (barber only)
    approve: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await updateAppointmentStatus(input.id, 'confirmed');
        return { success: true };
      }),

    // Reject appointment (barber only)
    reject: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await updateAppointmentStatus(input.id, 'rejected');
        return { success: true };
      }),

    // Get all appointments for a given date (YYYY-MM-DD) - backward compatibility
    getByDate: publicProcedure
      .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
      .query(async ({ input }) => {
        return getConfirmedAppointmentsByDate(input.date);
      }),

    // Create a new appointment (starts as pending)
    create: publicProcedure
      .input(z.object({
        customerName: z.string().min(1).max(255),
        phoneNumber: z.string().min(7).max(20),
        appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        timeSlot: z.string().regex(/^\d{2}:\d{2}$/),
      }))
      .mutation(async ({ input }) => {
        const available = await checkSlotAvailable(input.appointmentDate, input.timeSlot);
        if (!available) {
          throw new TRPCError({ code: "CONFLICT", message: "هذا الوقت محجوز مسبقاً" });
        }
        const result = await createAppointment({
          customerName: input.customerName,
          phoneNumber: input.phoneNumber,
          appointmentDate: input.appointmentDate as unknown as Date,
          timeSlot: input.timeSlot,
          status: 'pending',
        });
        // Track phone number
        await trackPhoneNumber(input.phoneNumber, input.appointmentDate);
        return result;
      }),

    // Delete an appointment by id
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteAppointment(input.id);
        return { success: true };
      }),
  }),

  reviews: router({
    // Create a new review
    create: publicProcedure
      .input(z.object({
        appointmentId: z.number(),
        rating: z.number().min(1).max(5),
        comment: z.string().max(500).optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await createReview({
          appointmentId: input.appointmentId,
          rating: input.rating,
          comment: input.comment || null,
        });
        return result;
      }),

    // Get all reviews
    getAll: publicProcedure.query(async () => {
      return getAllReviews();
    }),
  }),

  statistics: router({
    // Get general statistics
    getStats: publicProcedure.query(async () => {
      return getStatistics();
    }),

    // Get phone number booking count
    getPhoneStats: publicProcedure
      .input(z.object({ phoneNumber: z.string() }))
      .query(async ({ input }) => {
        return getPhoneNumberStats(input.phoneNumber);
      }),

    // Get top repeated phone numbers
    getTopPhones: publicProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        return getTopPhoneNumbers(input.limit || 5);
      }),
  }),

  members: router({
    // Request OTP
    requestOTP: publicProcedure
      .input(z.object({ phoneNumber: z.string() }))
      .mutation(async ({ input }) => {
        const code = await generateOTP(input.phoneNumber);
        console.log(`[OTP] Code for ${input.phoneNumber}: ${code}`);
        return { success: true, message: "OTP sent to phone" };
      }),

    // Verify OTP and register
    verifyAndRegister: publicProcedure
      .input(z.object({
        phoneNumber: z.string(),
        code: z.string().length(6),
        name: z.string().min(1),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ input }) => {
        const verified = await verifyOTP(input.phoneNumber, input.code);
        if (!verified) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired OTP" });
        
        const existing = await getMemberByPhone(input.phoneNumber);
        if (existing) return { success: true, memberId: existing.id, isNew: false };
        
        await registerMember(input.phoneNumber, input.name, input.email);
        return { success: true, isNew: true };
      }),

    // Get member by phone
    getByPhone: publicProcedure
      .input(z.object({ phoneNumber: z.string() }))
      .query(async ({ input }) => {
        return getMemberByPhone(input.phoneNumber);
      }),

    // Get member by ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getMemberById(input.id);
      }),
  }),

  supervisors: router({
    // Get all supervisors
    getAll: publicProcedure.query(async () => {
      return getSupervisors();
    }),

    // Add supervisor (admin only)
    add: publicProcedure
      .input(z.object({ memberId: z.number() }))
      .mutation(async ({ input }) => {
        await addSupervisor(input.memberId, 1);
        return { success: true };
      }),

    // Remove supervisor (admin only)
    remove: publicProcedure
      .input(z.object({ memberId: z.number() }))
      .mutation(async ({ input }) => {
        await removeSupervisor(input.memberId);
        return { success: true };
      }),

    // Check if member is supervisor
    isSupervisor: publicProcedure
      .input(z.object({ memberId: z.number() }))
      .query(async ({ input }) => {
        return isSupervisor(input.memberId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
