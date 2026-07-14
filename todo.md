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


## Member Registration & Roles System
- [x] Create `members` table (id, phoneNumber, name, email, role, status, createdAt)
- [x] Create `otp_codes` table (id, phoneNumber, code, expiresAt, attempts)
- [x] Create `supervisors` table (id, memberId, addedBy, createdAt)
- [x] Add DB helpers for OTP generation, verification, member creation
- [x] Add tRPC procedures: requestOTP, verifyOTP, registerMember, getSupervisors, addSupervisor, removeSupervisor
- [x] Build registration form with phone number + OTP verification
- [x] Build admin dashboard to manage supervisors
- [x] Update appointment creation to track member ID
- [x] Update appointment approval/rejection to show supervisor name
- [x] Write vitest for OTP and member registration


## Security & Improvements
- [x] Fix OTP verification to increment attempts and reject reused codes
- [x] Secure supervisor management with admin-only authorization
- [x] Increment OTP attempt count on failed verification attempts and enforce lockout after 3 attempts
- [x] Add real OTP delivery mechanism (SMS/WhatsApp via Manus Data API)

## Promotional Offers & Coupons System
- [x] Create promotions, coupons, and memberPromotions tables
- [x] Add DB helpers for promotions and coupons management
- [x] Add tRPC procedures for promotions and coupons
- [x] Design attractive promotional banner
- [x] Integrate PromoBanner component in Home page
- [ ] Add coupon generation UI to admin dashboard
- [ ] Add coupon code input to appointment booking form
- [x] Display promotion details in member registration flow

## VIP Clients Section
- [x] Design 3D VIP client cards with premium aesthetic
- [x] Build VIPClients component with animations
- [x] Add 3 VIP client names (محمد الأحمري, فهد العتيبي, سلطان الدوسري)
- [x] Integrate VIPClients section in Home page
- [x] Add hover effects and floating animations

## Coupon System UI
- [x] Add coupon code input field in booking form
- [x] Add coupon creation UI in admin dashboard
- [x] Add validation and error handling for coupon fields
