import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { appointments, InsertAppointment, InsertUser, users, reviews, InsertReview, phoneNumbers, InsertPhoneNumber } from "../drizzle/schema";
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
    .where(and(sql`${appointments.appointmentDate} = ${date}`, eq(appointments.timeSlot, timeSlot)))
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
