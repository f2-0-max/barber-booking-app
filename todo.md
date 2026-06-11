# Barber Booking App - TODO

## Database & Backend
- [x] Create `appointments` table in drizzle schema (id, customer_name, phone, date, time_slot, created_at)
- [x] Add DB query helpers in server/db.ts
- [x] Add tRPC procedures: getAppointments, createAppointment, deleteAppointment
- [x] Add notifyOwner integration for appointment reminders
- [x] Add heartbeat/scheduled job to check upcoming appointments and send notifications 15 min before

## Frontend - Main Page
- [x] Design mobile-first layout with luxury barber aesthetic (dark gold theme)
- [x] Add date picker (today as default)
- [x] Build time slots list (10:00 AM to 12:00 AM, every 30 min = 28 slots)
- [x] Show booked vs available slots visually
- [x] Tap empty slot → open booking form dialog
- [x] Tap booked slot → open details dialog with delete option

## Frontend - Booking Form Dialog
- [x] Form with only: customer name + phone number
- [x] Validate fields before submit
- [x] Optimistic update on submit

## Frontend - Appointment Details Dialog
- [x] Show customer name, phone, time
- [x] Delete/cancel button with confirmation

## Design & Polish
- [x] Luxury dark theme with gold accents
- [x] Arabic RTL support
- [x] Smooth animations and transitions
- [x] Mobile-optimized touch targets

## Testing & Delivery
- [x] Write vitest for backend procedures
- [x] Save checkpoint

## Fixes & Improvements
- [x] Add server-side conflict check to prevent double-booking same date/time slot
- [x] Fix reminder window to exactly 15 min (currently 20 min)
- [x] Add confirmation dialog before deleting an appointment
- [x] Add real date picker (calendar popup) alongside day navigation
