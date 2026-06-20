import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { appointments, InsertAppointment, InsertUser, users, reviews, InsertReview, phoneNumbers, InsertPhoneNumber, AppointmentStatus, members, InsertMember, otpCodes, InsertOtpCode, supervisors, InsertSupervisor } from "../drizzle/schema";
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
  
  const result = await db.select().from(otpCodes)
    .where(and(
      eq(otpCodes.phoneNumber, phoneNumber),
      eq(otpCodes.code, code)
    ))
    .limit(1);
  
  if (result.length === 0) return false;
  
  const otp = result[0];
  if (!otp || otp.expiresAt < new Date()) return false;
  if (otp.attempts >= 3) return false;
  if (otp.verified === 1) return false; // Already verified, single-use only
  
  // Increment attempts and mark as verified
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
