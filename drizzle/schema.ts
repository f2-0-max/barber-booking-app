import { date, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Appointments table
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId"),                            // Optional: registered member ID
  customerName: varchar("customerName", { length: 255 }).notNull(),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
  appointmentDate: date("appointmentDate").notNull(),   // YYYY-MM-DD
  timeSlot: varchar("timeSlot", { length: 5 }).notNull(), // HH:MM (24h)
  status: mysqlEnum("status", ["pending", "confirmed", "rejected"]).default("pending").notNull(), // pending = waiting for barber approval
  notified: int("notified").default(0).notNull(),        // 0 = not notified, 1 = notified
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;
export type AppointmentStatus = "pending" | "confirmed" | "rejected";

// Reviews table
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  appointmentId: int("appointmentId").notNull(),
  rating: int("rating").notNull(), // 1-5 stars
  comment: text("comment"), // Optional comment
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

// Phone number tracking table
export const phoneNumbers = mysqlTable("phoneNumbers", {
  id: int("id").autoincrement().primaryKey(),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull().unique(),
  bookingCount: int("bookingCount").default(0).notNull(),
  lastBookingDate: date("lastBookingDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PhoneNumber = typeof phoneNumbers.$inferSelect;
export type InsertPhoneNumber = typeof phoneNumbers.$inferInsert;

// Members table (customers who register with phone number)
export const members = mysqlTable("members", {
  id: int("id").autoincrement().primaryKey(),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  role: mysqlEnum("role", ["member", "supervisor", "admin"]).default("member").notNull(),
  status: mysqlEnum("status", ["active", "inactive", "blocked"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Member = typeof members.$inferSelect;
export type InsertMember = typeof members.$inferInsert;

// OTP codes table
export const otpCodes = mysqlTable("otpCodes", {
  id: int("id").autoincrement().primaryKey(),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  attempts: int("attempts").default(0).notNull(),
  verified: int("verified").default(0).notNull(), // 0 = not verified, 1 = verified
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = typeof otpCodes.$inferInsert;

// Supervisors table (barber + staff with approval permissions)
export const supervisors = mysqlTable("supervisors", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull(),
  addedBy: int("addedBy").notNull(), // admin who added this supervisor
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Supervisor = typeof supervisors.$inferSelect;
export type InsertSupervisor = typeof supervisors.$inferInsert;

// Promotions/Offers table
export const promotions = mysqlTable("promotions", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  offerType: mysqlEnum("offerType", ["free_service", "discount_percentage", "discount_amount"]).notNull(),
  serviceType: varchar("serviceType", { length: 255 }), // e.g., "skin_care", "hair_cut", etc.
  discountValue: decimal("discountValue", { precision: 10, scale: 2 }), // For discount_percentage or discount_amount
  isActive: int("isActive").default(1).notNull(), // 1 = active, 0 = inactive
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  maxUsagePerUser: int("maxUsagePerUser").default(1).notNull(), // How many times one user can use this offer
  totalUsageLimit: int("totalUsageLimit"), // Total times this offer can be used (null = unlimited)
  currentUsageCount: int("currentUsageCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = typeof promotions.$inferInsert;

// Coupons table
export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  promotionId: int("promotionId").notNull(),
  memberId: int("memberId"), // null = can be used by anyone, otherwise specific member
  isUsed: int("isUsed").default(0).notNull(), // 0 = not used, 1 = used
  usedAt: timestamp("usedAt"),
  usedForAppointmentId: int("usedForAppointmentId"), // Which appointment this coupon was used for
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

// Member Promotions (track which promotions have been used by which members)
export const memberPromotions = mysqlTable("memberPromotions", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull(),
  promotionId: int("promotionId").notNull(),
  usageCount: int("usageCount").default(0).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MemberPromotion = typeof memberPromotions.$inferSelect;
export type InsertMemberPromotion = typeof memberPromotions.$inferInsert;
