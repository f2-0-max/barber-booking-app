import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { appointments, InsertAppointment, InsertUser, users, reviews, InsertReview, phoneNumbers, InsertPhoneNumber, AppointmentStatus, members, InsertMember, otpCodes, InsertOtpCode, supervisors, InsertSupervisor, promotions, InsertPromotion, Promotion, coupons, InsertCoupon, memberPromotions, InsertMemberPromotion } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Appointment Helpers ───────────────────────────────────────────────────

export async function getAppointmentsByDate(date: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appointments).where(sql`${appointments.appointmentDate} = ${date}`);
}

// Get confirmed appointments only (for display to customers)
export async function getConfirmedAppointmentsByDate(date: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appointments)
    .where(and(sql`${appointments.appointmentDate} = ${date}`, eq(appointments.status, 'confirmed')));
}

// Get all appointments including pending (for barber dashboard)
export async function getAllAppointmentsByDate(date: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appointments)
    .where(sql`${appointments.appointmentDate} = ${date}`)
    .orderBy(appointments.timeSlot);
}

// Get pending appointments only
export async function getPendingAppointments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appointments)
    .where(eq(appointments.status, 'pending'))
    .orderBy(sql`${appointments.createdAt} DESC`);
}

// Update appointment status
export async function updateAppointmentStatus(id: number, status: AppointmentStatus) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(appointments).set({ status }).where(eq(appointments.id, id));
}

export async function createAppointment(data: InsertAppointment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(appointments).values(data).$returningId();
  return result;
}

export async function deleteAppointment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(appointments).where(eq(appointments.id, id));
}

export async function getUpcomingUnnotifiedAppointments() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const allToday = await db.select().from(appointments)
    .where(and(sql`${appointments.appointmentDate} = ${todayStr}`, eq(appointments.notified, 0)));
  // Notify when appointment is between 10 and 20 minutes away (15 min target)
  return allToday.filter(appt => {
    const [h, m] = appt.timeSlot.split(":").map(Number);
    const apptTime = new Date(now);
    apptTime.setHours(h, m, 0, 0);
    const diffMs = apptTime.getTime() - now.getTime();
    return diffMs > 10 * 60 * 1000 && diffMs <= 20 * 60 * 1000;
  });
}

export async function checkSlotAvailable(date: string, timeSlot: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return true;
  const existing = await db.select().from(appointments)
    .where(and(sql`${appointments.appointmentDate} = ${date}`, eq(appointments.timeSlot, timeSlot), eq(appointments.status, 'confirmed')))
    .limit(1);
  return existing.length === 0;
}

export async function markAppointmentNotified(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(appointments).set({ notified: 1 }).where(eq(appointments.id, id));
}

// ─── Review Helpers ───────────────────────────────────────────────────────

export async function createReview(data: InsertReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(reviews).values(data).$returningId();
  return result;
}

export async function getReviewsByAppointment(appointmentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviews).where(eq(reviews.appointmentId, appointmentId));
}

export async function getAllReviews() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviews).orderBy(sql`${reviews.createdAt} DESC`);
}

// ─── Phone Number Tracking ───────────────────────────────────────────────────

export async function trackPhoneNumber(phoneNumber: string, date: string) {
  const db = await getDb();
  if (!db) return;
  try {
    const existing = await db.select().from(phoneNumbers)
      .where(eq(phoneNumbers.phoneNumber, phoneNumber))
      .limit(1);
    
    if (existing.length > 0) {
      await db.update(phoneNumbers)
        .set({
          bookingCount: existing[0].bookingCount + 1,
          lastBookingDate: new Date(date),
        })
        .where(eq(phoneNumbers.phoneNumber, phoneNumber));
    } else {
      await db.insert(phoneNumbers).values({
        phoneNumber,
        bookingCount: 1,
        lastBookingDate: new Date(date),
      });
    }
  } catch (error) {
    console.error("[trackPhoneNumber] Error:", error);
  }
}

export async function getPhoneNumberStats(phoneNumber: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(phoneNumbers)
    .where(eq(phoneNumbers.phoneNumber, phoneNumber))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

// ─── Statistics ──────────────────────────────────────────────────────────────

export async function getStatistics() {
  const db = await getDb();
  if (!db) return { totalAppointments: 0, averageRating: 0, totalReviews: 0 };
  
  const appointmentCount = await db.select({ count: sql<number>`COUNT(*)` })
    .from(appointments);
  
  const reviewStats = await db.select({ 
    count: sql<number>`COUNT(*)`,
    avgRating: sql<number>`AVG(${reviews.rating})` 
  }).from(reviews);
  
  return {
    totalAppointments: appointmentCount[0]?.count || 0,
    totalReviews: reviewStats[0]?.count || 0,
    averageRating: reviewStats[0]?.avgRating ? parseFloat(reviewStats[0].avgRating.toFixed(1)) : 0,
  };
}

export async function getTopPhoneNumbers(limit: number = 5) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(phoneNumbers)
    .orderBy(sql`${phoneNumbers.bookingCount} DESC`)
    .limit(limit);
}


// ─── Member Registration & OTP ───────────────────────────────────────────────

export async function generateOTP(phoneNumber: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  // Delete old OTP codes for this phone number
  await db.delete(otpCodes).where(eq(otpCodes.phoneNumber, phoneNumber));
  
  // Insert new OTP code
  await db.insert(otpCodes).values({
    phoneNumber,
    code,
    expiresAt,
    attempts: 0,
    verified: 0,
  });
  
  return code;
}

export async function verifyOTP(phoneNumber: string, code: string): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Find any OTP for this phone (to check attempts even if code is wrong)
  const anyOtp = await db.select().from(otpCodes)
    .where(eq(otpCodes.phoneNumber, phoneNumber))
    .limit(1);
  
  if (anyOtp.length > 0) {
    const otp = anyOtp[0];
    // Check if already verified (single-use)
    if (otp.verified === 1) return false;
    // Check if max attempts reached
    if (otp.attempts >= 3) return false;
    // Check if expired
    if (otp.expiresAt < new Date()) return false;
  }
  
  // Find the correct code
  const result = await db.select().from(otpCodes)
    .where(and(
      eq(otpCodes.phoneNumber, phoneNumber),
      eq(otpCodes.code, code)
    ))
    .limit(1);
  
  if (result.length === 0) {
    // Code is wrong - increment attempts
    if (anyOtp.length > 0) {
      await db.update(otpCodes)
        .set({ attempts: anyOtp[0].attempts + 1 })
        .where(eq(otpCodes.id, anyOtp[0].id));
    }
    return false;
  }
  
  const otp = result[0];
  // Code is correct - mark as verified
  await db.update(otpCodes)
    .set({ verified: 1, attempts: otp.attempts + 1 })
    .where(eq(otpCodes.id, otp.id));
  
  return true;
}

export async function registerMember(phoneNumber: string, name: string, email?: string): Promise<InsertMember> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(members).values({
    phoneNumber,
    name,
    email,
    role: "member",
    status: "active",
  });
  
  return { phoneNumber, name, email, role: "member", status: "active" };
}

export async function getMemberByPhone(phoneNumber: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(members)
    .where(eq(members.phoneNumber, phoneNumber))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function getMemberById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(members)
    .where(eq(members.id, id))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

// ─── Supervisors Management ──────────────────────────────────────────────────

export async function addSupervisor(memberId: number, addedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Update member role to supervisor
  await db.update(members)
    .set({ role: "supervisor" })
    .where(eq(members.id, memberId));
  
  // Add to supervisors table
  await db.insert(supervisors).values({
    memberId,
    addedBy,
  });
}

export async function removeSupervisor(memberId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Update member role back to member
  await db.update(members)
    .set({ role: "member" })
    .where(eq(members.id, memberId));
  
  // Remove from supervisors table
  await db.delete(supervisors)
    .where(eq(supervisors.memberId, memberId));
}

export async function getSupervisors() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    id: supervisors.id,
    memberId: supervisors.memberId,
    phoneNumber: members.phoneNumber,
    name: members.name,
    createdAt: supervisors.createdAt,
  })
  .from(supervisors)
  .innerJoin(members, eq(supervisors.memberId, members.id));
}

export async function isSupervisor(memberId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.select().from(supervisors)
    .where(eq(supervisors.memberId, memberId))
    .limit(1);
  
  return result.length > 0;
}


// ============ PROMOTIONS & COUPONS ============

export async function getActivePromotions(): Promise<Promotion[]> {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  const result = await db.select().from(promotions)
    .where(and(
      eq(promotions.isActive, 1),
      sql`(${promotions.startDate} IS NULL OR ${promotions.startDate} <= ${now})`,
      sql`(${promotions.endDate} IS NULL OR ${promotions.endDate} >= ${now})`
    ));
  
  return result;
}

export async function getPromotionById(id: number): Promise<Promotion | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(promotions)
    .where(eq(promotions.id, id))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function createPromotion(data: InsertPromotion): Promise<Promotion> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(promotions).values(data);
  const promotionId = result[0].insertId;
  
  const created = await getPromotionById(Number(promotionId));
  if (!created) throw new Error("Failed to create promotion");
  
  return created;
}

export async function generateCoupon(promotionId: number, memberId?: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Generate unique coupon code
  const code = `PROMO-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  
  await db.insert(coupons).values({
    code,
    promotionId,
    memberId,
  });
  
  return code;
}

export async function validateAndUseCoupon(code: string, memberId: number, appointmentId: number): Promise<{ valid: boolean; promotion?: Promotion; message: string }> {
  const db = await getDb();
  if (!db) return { valid: false, message: "Database not available" };
  
  // Find coupon
  const couponResult = await db.select().from(coupons)
    .where(eq(coupons.code, code))
    .limit(1);
  
  if (couponResult.length === 0) {
    return { valid: false, message: "Coupon not found" };
  }
  
  const coupon = couponResult[0];
  
  // Check if already used
  if (coupon.isUsed) {
    return { valid: false, message: "Coupon already used" };
  }
  
  // Check if coupon is for specific member
  if (coupon.memberId && coupon.memberId !== memberId) {
    return { valid: false, message: "This coupon is not valid for your account" };
  }
  
  // Get promotion
  const promotion = await getPromotionById(coupon.promotionId);
  if (!promotion) {
    return { valid: false, message: "Promotion not found" };
  }
  
  // Check if promotion is active
  const now = new Date();
  if (promotion.isActive === 0) {
    return { valid: false, message: "Promotion is not active" };
  }
  
  if (promotion.startDate && promotion.startDate > now) {
    return { valid: false, message: "Promotion has not started yet" };
  }
  
  if (promotion.endDate && promotion.endDate < now) {
    return { valid: false, message: "Promotion has expired" };
  }
  
  // Check usage limits
  if (promotion.totalUsageLimit && promotion.currentUsageCount >= promotion.totalUsageLimit) {
    return { valid: false, message: "Promotion usage limit reached" };
  }
  
  // Check member usage count
  const memberPromoResult = await db.select().from(memberPromotions)
    .where(and(
      eq(memberPromotions.memberId, memberId),
      eq(memberPromotions.promotionId, promotion.id)
    ))
    .limit(1);
  
  if (memberPromoResult.length > 0) {
    const memberPromo = memberPromoResult[0];
    if (memberPromo.usageCount >= promotion.maxUsagePerUser) {
      return { valid: false, message: `You can only use this promotion ${promotion.maxUsagePerUser} time(s)` };
    }
  }
  
  // Mark coupon as used
  await db.update(coupons)
    .set({
      isUsed: 1,
      usedAt: new Date(),
      usedForAppointmentId: appointmentId,
    })
    .where(eq(coupons.id, coupon.id));
  
  // Update member promotion usage
  if (memberPromoResult.length > 0) {
    await db.update(memberPromotions)
      .set({
        usageCount: sql`${memberPromotions.usageCount} + 1`,
        lastUsedAt: new Date(),
      })
      .where(eq(memberPromotions.id, memberPromoResult[0].id));
  } else {
    await db.insert(memberPromotions).values({
      memberId,
      promotionId: promotion.id,
      usageCount: 1,
      lastUsedAt: new Date(),
    });
  }
  
  // Update promotion usage count
  await db.update(promotions)
    .set({
      currentUsageCount: sql`${promotions.currentUsageCount} + 1`,
    })
    .where(eq(promotions.id, promotion.id));
  
  return { valid: true, promotion, message: "Coupon applied successfully" };
}

export async function getMemberPromotionUsage(memberId: number, promotionId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select().from(memberPromotions)
    .where(and(
      eq(memberPromotions.memberId, memberId),
      eq(memberPromotions.promotionId, promotionId)
    ))
    .limit(1);
  
  return result.length > 0 ? result[0].usageCount : 0;
}
