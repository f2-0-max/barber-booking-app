import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { notifyOwner } from "./_core/notification";
import { getUpcomingUnnotifiedAppointments, markAppointmentNotified } from "./db";

export async function appointmentReminderHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    const upcoming = await getUpcomingUnnotifiedAppointments();

    if (upcoming.length === 0) {
      return res.json({ ok: true, notified: 0 });
    }

    let notifiedCount = 0;
    for (const appt of upcoming) {
      const [h, m] = appt.timeSlot.split(":").map(Number);
      const period = h >= 12 ? "م" : "ص";
      const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const displayTime = `${displayH}:${String(m).padStart(2, "0")} ${period}`;

      // Notify owner via Manus notification system
      await notifyOwner({
        title: `⏰ موعد قادم — ${appt.customerName}`,
        content: `حان موعد ${appt.customerName} الساعة ${displayTime}\nرقم الجوال: ${appt.phoneNumber}`,
      });

      // WhatsApp notification message
      const whatsappMsg = `🔔 موعد قادم!\n\n👤 ${appt.customerName}\n📱 ${appt.phoneNumber}\n⏰ ${displayTime}\n\nتأكد من الحضور في الموعد المحدد.`;
      console.log(`[WhatsApp] Reminder for ${appt.customerName}: ${whatsappMsg}`);

      await markAppointmentNotified(appt.id);
      notifiedCount++;
    }

    return res.json({ ok: true, notified: notifiedCount });
  } catch (err: any) {
    console.error("[appointmentReminder] Error:", err);
    return res.status(500).json({
      error: err?.message ?? "unknown",
      timestamp: new Date().toISOString(),
    });
  }
}
