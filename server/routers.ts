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
  createReview,
  getAllReviews,
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
    // Get all appointments for a given date (YYYY-MM-DD)
    getByDate: publicProcedure
      .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
      .query(async ({ input }) => {
        return getAppointmentsByDate(input.date);
      }),

    // Create a new appointment
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
        });
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
});

export type AppRouter = typeof appRouter;
