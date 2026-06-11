import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { format, addDays, subDays, isToday } from "date-fns";
import { ar } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, Scissors, Phone, User,
  Trash2, X, Plus, Clock, CalendarIcon, AlertTriangle, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const BANNER_URL = "/manus-storage/barber-banner_018cae17.jpg";

// Hourly slots: 10:00 → 23:00
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 10; h <= 23; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
  }
  return slots;
}
const TIME_SLOTS = generateTimeSlots();

// Bilingual labels
const L = {
  appName:    { ar: "مواعيدي",         tr: "Randevularım" },
  subtitle:   { ar: "نظام الحجوزات",   tr: "Rezervasyon Sistemi" },
  today:      { ar: "اليوم",           tr: "Bugün" },
  backToday:  { ar: "العودة لليوم",    tr: "Bugüne Dön" },
  tapChange:  { ar: "اضغط لتغيير",    tr: "Değiştir" },
  empty:      { ar: "فارغ — اضغط للحجز", tr: "Boş — Rezerve Et" },
  booked:     { ar: "موعد محجوز",     tr: "Randevu Alındı" },
  newBooking: { ar: "حجز موعد جديد",  tr: "Yeni Randevu" },
  name:       { ar: "اسم العميل",      tr: "Müşteri Adı" },
  namePh:     { ar: "أدخل الاسم",      tr: "Adı girin" },
  phone:      { ar: "رقم الجوال",      tr: "Telefon Numarası" },
  phonePh:    { ar: "05xxxxxxxx",      tr: "05xxxxxxxx" },
  confirm:    { ar: "تأكيد الحجز",     tr: "Onayla" },
  booking:    { ar: "جاري الحجز...",   tr: "Kaydediliyor..." },
  details:    { ar: "تفاصيل الموعد",   tr: "Randevu Detayları" },
  cancel:     { ar: "إلغاء الموعد",    tr: "Randevuyu İptal Et" },
  cancelling: { ar: "جاري الإلغاء...", tr: "İptal ediliyor..." },
  confirmDel: { ar: "تأكيد الإلغاء",  tr: "İptal Onayı" },
  confirmQ:   { ar: "هل تريد إلغاء موعد", tr: "Randevuyu iptal etmek istiyor musunuz?" },
  yes:        { ar: "نعم، إلغاء",      tr: "Evet, İptal" },
  back:       { ar: "تراجع",           tr: "Geri" },
  errFields:  { ar: "يرجى إدخال الاسم ورقم الجوال", tr: "Lütfen ad ve telefon girin" },
  errBook:    { ar: "حدث خطأ أثناء الحجز", tr: "Rezervasyon hatası" },
  errDel:     { ar: "حدث خطأ أثناء الإلغاء", tr: "İptal hatası" },
  successBook:{ ar: "تم الحجز بنجاح!", tr: "Rezervasyon başarılı!" },
  successDel: { ar: "تم إلغاء الموعد", tr: "Randevu iptal edildi" },
};

type Lang = "ar" | "tr";

function t(key: keyof typeof L, lang: Lang): string {
  return L[key][lang];
}

function formatTimeDisplay(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  const period = h >= 12 ? "م" : "ص";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

function formatTimeTR(slot: string): string {
  return slot; // 24h format for Turkish
}

function formatDateArabic(date: Date): string {
  return format(date, "EEEE، d MMMM yyyy", { locale: ar });
}

function formatDateTR(date: Date): string {
  const days = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];
  const months = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

type Appointment = {
  id: number;
  customerName: string;
  phoneNumber: string;
  appointmentDate: string | Date;
  timeSlot: string;
  notified: number;
  createdAt: Date;
};

export default function Home() {
  const [lang, setLang] = useState<Lang>("ar");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  const [viewAppt, setViewAppt] = useState<Appointment | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const isRTL = lang === "ar";
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: appointments = [], refetch } = trpc.appointments.getByDate.useQuery(
    { date: dateStr },
    { refetchOnWindowFocus: true }
  );

  const bookedMap = useMemo(() => {
    const map: Record<string, Appointment> = {};
    for (const a of appointments as Appointment[]) map[a.timeSlot] = a;
    return map;
  }, [appointments]);

  const createMutation = trpc.appointments.create.useMutation({
    onSuccess: () => {
      refetch();
      setBookingSlot(null);
      setCustomerName("");
      setPhoneNumber("");
      toast.success(t("successBook", lang));
    },
    onError: () => toast.error(t("errBook", lang)),
  });

  const deleteMutation = trpc.appointments.delete.useMutation({
    onSuccess: () => {
      refetch();
      setViewAppt(null);
      toast.success(t("successDel", lang));
    },
    onError: () => toast.error(t("errDel", lang)),
  });

  const handleBook = async () => {
    if (!customerName.trim() || !phoneNumber.trim()) {
      toast.error(t("errFields", lang));
      return;
    }
    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync({
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        appointmentDate: dateStr,
        timeSlot: bookingSlot!,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!viewAppt) return;
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync({ id: viewAppt.id });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    setConfirmDelete(false);
    await handleDelete();
  };

  // Scroll to current time slot on today
  useEffect(() => {
    if (!isToday(selectedDate)) return;
    const now = new Date();
    const h = now.getHours();
    if (h < 10 || h > 23) return;
    const slot = `${String(h).padStart(2, "0")}:00`;
    const el = document.getElementById(`slot-${slot}`);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 400);
  }, [selectedDate]);

  const bookedCount = Object.keys(bookedMap).length;
  const totalSlots = TIME_SLOTS.length;
  const dir = isRTL ? "rtl" : "ltr";

  return (
    <div className="min-h-screen bg-[#080808] text-white" dir={dir}>

      {/* ── HERO BANNER ── */}
      <div className="relative w-full overflow-hidden" style={{ height: "52vw", maxHeight: 280, minHeight: 180 }}>
        <img
          src={BANNER_URL}
          alt="Premium Barbershop"
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-[#080808]" />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#080808] to-transparent" />

        {/* Lang toggle — top corner */}
        <div className={`absolute top-3 ${isRTL ? "left-3" : "right-3"} z-10`}>
          <button
            onClick={() => setLang(l => l === "ar" ? "tr" : "ar")}
            className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-[#c9a84c]/40 text-[#c9a84c] text-xs font-bold tracking-wider hover:bg-black/70 transition-all active:scale-95"
          >
            {lang === "ar" ? "TR" : "AR"}
          </button>
        </div>

        {/* Banner text overlay */}
        <div className={`absolute bottom-6 ${isRTL ? "right-4" : "left-4"} z-10`}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#c9a84c] to-[#f0d080] flex items-center justify-center">
              <Scissors className="w-3 h-3 text-black" />
            </div>
            <span className="text-[10px] text-[#c9a84c] font-bold tracking-widest uppercase">Premium Barbershop</span>
          </div>
          <h1 className="text-2xl font-black text-white leading-tight drop-shadow-lg">
            {t("appName", lang)}
          </h1>
          <p className="text-xs text-gray-300 mt-0.5">{t("subtitle", lang)}</p>
        </div>
      </div>

      {/* ── STICKY DATE NAVIGATOR ── */}
      <div className="sticky top-0 z-20 bg-[#080808]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        {/* Stats row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#c9a84c]" />
            <span className="text-xs text-gray-400">
              {bookedCount} / {totalSlots}{" "}
              <span className="text-gray-600">{t("booked", lang)}</span>
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#c9a84c] to-[#f0d080] rounded-full transition-all duration-500"
              style={{ width: `${(bookedCount / totalSlots) * 100}%` }}
            />
          </div>
        </div>

        {/* Date row */}
        <div className="flex items-center gap-2">
          <button
            onClick={isRTL ? () => setSelectedDate(d => addDays(d, 1)) : () => setSelectedDate(d => subDays(d, 1))}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-gray-500 hover:text-[#c9a84c] hover:bg-[#c9a84c]/10 border border-white/5 hover:border-[#c9a84c]/20 transition-all active:scale-90"
          >
            {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button className="flex-1 h-10 rounded-2xl bg-[#141414] border border-white/5 hover:border-[#c9a84c]/20 px-3 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                <CalendarIcon className="w-3.5 h-3.5 text-[#c9a84c] shrink-0" />
                <div className="text-center">
                  <span className="text-sm font-semibold text-white">
                    {lang === "ar" ? formatDateArabic(selectedDate) : formatDateTR(selectedDate)}
                  </span>
                  {isToday(selectedDate) && (
                    <span className="mr-2 text-[10px] text-[#c9a84c] font-bold">
                      {" "}• {t("today", lang)}
                    </span>
                  )}
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[#141414] border border-[#c9a84c]/20 rounded-2xl shadow-2xl" align="center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => { if (d) { setSelectedDate(d); setCalendarOpen(false); } }}
                className="text-white"
              />
            </PopoverContent>
          </Popover>

          <button
            onClick={isRTL ? () => setSelectedDate(d => subDays(d, 1)) : () => setSelectedDate(d => addDays(d, 1))}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-gray-500 hover:text-[#c9a84c] hover:bg-[#c9a84c]/10 border border-white/5 hover:border-[#c9a84c]/20 transition-all active:scale-90"
          >
            {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>

        {!isToday(selectedDate) && (
          <button
            onClick={() => setSelectedDate(new Date())}
            className="w-full mt-2 text-xs text-[#c9a84c] py-1.5 rounded-xl border border-[#c9a84c]/15 hover:bg-[#c9a84c]/8 transition-all active:scale-[0.98]"
          >
            {t("backToday", lang)}
          </button>
        )}
      </div>

      {/* ── TIME SLOTS ── */}
      <main className="px-4 py-4 pb-28 space-y-2.5">
        {TIME_SLOTS.map((slot) => {
          const appt = bookedMap[slot];
          const isBooked = !!appt;
          const timeAR = formatTimeDisplay(slot);
          const timeTR = formatTimeTR(slot);

          return (
            <button
              key={slot}
              id={`slot-${slot}`}
              onClick={() => {
                if (isBooked) {
                  setViewAppt(appt);
                } else {
                  setBookingSlot(slot);
                  setCustomerName("");
                  setPhoneNumber("");
                }
              }}
              className={`w-full rounded-3xl transition-all duration-200 active:scale-[0.97] text-right overflow-hidden
                ${isBooked
                  ? "bg-gradient-to-l from-[#1a1500] via-[#1c1600] to-[#141414] border border-[#c9a84c]/35 shadow-[0_4px_24px_rgba(201,168,76,0.10)]"
                  : "bg-[#111111] border border-white/[0.04] hover:border-white/10 hover:bg-[#161616]"
                }`}
            >
              <div className="flex items-center gap-0 p-0">
                {/* Gold left bar for booked */}
                {isBooked && (
                  <div className={`w-1 self-stretch bg-gradient-to-b from-[#c9a84c] to-[#f0d080] ${isRTL ? "rounded-r-3xl" : "rounded-l-3xl"}`} />
                )}

                <div className="flex items-center gap-3.5 px-4 py-4 flex-1">
                  {/* Time block */}
                  <div className={`shrink-0 text-center w-14 ${isBooked ? "" : "opacity-50"}`}>
                    <p className={`text-base font-black leading-none ${isBooked ? "text-[#c9a84c]" : "text-gray-500"}`}>
                      {lang === "ar" ? timeAR : timeTR}
                    </p>
                    {lang === "ar" && isBooked && (
                      <p className="text-[9px] text-gray-600 mt-0.5 font-mono">{timeTR}</p>
                    )}
                    {lang === "tr" && isBooked && (
                      <p className="text-[9px] text-gray-600 mt-0.5">{timeAR}</p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className={`w-px h-10 shrink-0 ${isBooked ? "bg-[#c9a84c]/25" : "bg-white/5"}`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {isBooked ? (
                      <div>
                        <p className="text-sm font-bold text-white truncate leading-tight">{appt.customerName}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Phone className="w-3 h-3 text-[#c9a84c]/60 shrink-0" />
                          <p className="text-xs text-gray-400 font-mono">{appt.phoneNumber}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">{t("empty", lang)}</p>
                    )}
                  </div>

                  {/* Icon */}
                  <div className="shrink-0">
                    {isBooked ? (
                      <div className="w-9 h-9 rounded-2xl bg-[#c9a84c]/10 border border-[#c9a84c]/20 flex items-center justify-center">
                        <Scissors className="w-4 h-4 text-[#c9a84c]" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
                        <Plus className="w-4 h-4 text-gray-600" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </main>

      {/* ── BOOKING DIALOG ── */}
      <Dialog open={!!bookingSlot} onOpenChange={(o) => !o && setBookingSlot(null)}>
        <DialogContent
          className="bg-[#111111] border border-[#c9a84c]/20 text-white rounded-3xl max-w-sm mx-auto shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
          dir={dir}
        >
          <DialogHeader>
            <div className={`flex items-center gap-3 mb-2 ${isRTL ? "" : "flex-row-reverse text-right"}`}>
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#c9a84c] to-[#f0d080] flex items-center justify-center shadow-lg shadow-[#c9a84c]/20">
                <Scissors className="w-5 h-5 text-black" />
              </div>
              <div>
                <DialogTitle className="text-white text-base font-bold">{t("newBooking", lang)}</DialogTitle>
                {bookingSlot && (
                  <p className="text-xs text-[#c9a84c] mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {lang === "ar" ? formatTimeDisplay(bookingSlot) : formatTimeTR(bookingSlot)}
                    {" — "}
                    {lang === "ar" ? formatDateArabic(selectedDate) : formatDateTR(selectedDate)}
                  </p>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#c9a84c]" />
                {t("name", lang)}
              </Label>
              <Input
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder={t("namePh", lang)}
                className="bg-[#0a0a0a] border-white/8 text-white placeholder:text-gray-700 rounded-2xl h-12 text-sm focus:border-[#c9a84c]/40 focus:ring-0"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#c9a84c]" />
                {t("phone", lang)}
              </Label>
              <Input
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder={t("phonePh", lang)}
                type="tel"
                inputMode="numeric"
                className="bg-[#0a0a0a] border-white/8 text-white placeholder:text-gray-700 rounded-2xl h-12 text-sm font-mono focus:border-[#c9a84c]/40 focus:ring-0"
                onKeyDown={e => e.key === "Enter" && handleBook()}
              />
            </div>

            <div className="flex gap-2.5 pt-1">
              <Button
                onClick={handleBook}
                disabled={isSubmitting}
                className="flex-1 h-12 rounded-2xl bg-gradient-to-l from-[#b8922e] via-[#c9a84c] to-[#f0d080] text-black font-bold text-sm hover:opacity-90 active:scale-[0.97] transition-all shadow-lg shadow-[#c9a84c]/20"
              >
                {isSubmitting ? t("booking", lang) : t("confirm", lang)}
              </Button>
              <Button
                variant="outline"
                onClick={() => setBookingSlot(null)}
                className="w-12 h-12 rounded-2xl border-white/8 bg-transparent text-gray-500 hover:bg-white/5 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── VIEW APPOINTMENT DIALOG ── */}
      <Dialog open={!!viewAppt} onOpenChange={(o) => !o && setViewAppt(null)}>
        <DialogContent
          className="bg-[#111111] border border-[#c9a84c]/20 text-white rounded-3xl max-w-sm mx-auto shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
          dir={dir}
        >
          <DialogHeader>
            <div className={`flex items-center gap-3 mb-2 ${isRTL ? "" : "flex-row-reverse"}`}>
              <div className="w-11 h-11 rounded-2xl bg-[#c9a84c]/10 border border-[#c9a84c]/25 flex items-center justify-center">
                <Scissors className="w-5 h-5 text-[#c9a84c]" />
              </div>
              <div>
                <DialogTitle className="text-white text-base font-bold">{t("details", lang)}</DialogTitle>
                {viewAppt && (
                  <p className="text-xs text-[#c9a84c] mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {lang === "ar" ? formatTimeDisplay(viewAppt.timeSlot) : formatTimeTR(viewAppt.timeSlot)}
                  </p>
                )}
              </div>
            </div>
          </DialogHeader>

          {viewAppt && (
            <div className="space-y-4 mt-1">
              <div className="bg-[#0a0a0a] rounded-2xl border border-white/5 overflow-hidden">
                {[
                  { icon: User, label: t("name", lang), value: viewAppt.customerName },
                  { icon: Phone, label: t("phone", lang), value: viewAppt.phoneNumber, mono: true },
                  { icon: Clock, label: lang === "ar" ? "الوقت / Saat" : "Saat / الوقت",
                    value: `${lang === "ar" ? formatTimeDisplay(viewAppt.timeSlot) : formatTimeTR(viewAppt.timeSlot)} — ${lang === "ar" ? formatDateArabic(selectedDate) : formatDateTR(selectedDate)}` },
                ].map((row, i) => (
                  <div key={i}>
                    {i > 0 && <div className="h-px bg-white/5" />}
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <div className="w-8 h-8 rounded-xl bg-[#c9a84c]/8 flex items-center justify-center shrink-0">
                        <row.icon className="w-3.5 h-3.5 text-[#c9a84c]" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-600">{row.label}</p>
                        <p className={`text-sm font-semibold text-white ${row.mono ? "font-mono" : ""}`}>{row.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2.5">
                <Button
                  onClick={() => setConfirmDelete(true)}
                  disabled={isDeleting}
                  className="flex-1 h-12 rounded-2xl bg-red-500/8 border border-red-500/20 text-red-400 hover:bg-red-500/15 font-semibold text-sm active:scale-[0.97] transition-all"
                  variant="outline"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isDeleting ? t("cancelling", lang) : t("cancel", lang)}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setViewAppt(null)}
                  className="w-12 h-12 rounded-2xl border-white/8 bg-transparent text-gray-500 hover:bg-white/5 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── CONFIRM DELETE DIALOG ── */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent
          className="bg-[#111111] border border-red-500/20 text-white rounded-3xl max-w-xs mx-auto shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
          dir={dir}
        >
          <div className="text-center py-3">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">{t("confirmDel", lang)}</h3>
            <p className="text-sm text-gray-400 mb-2">{t("confirmQ", lang)}</p>
            <p className="text-base font-bold text-white mb-6">{viewAppt?.customerName}</p>
            <div className="flex gap-3">
              <Button
                onClick={handleDeleteConfirmed}
                disabled={isDeleting}
                className="flex-1 h-11 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-500/20"
              >
                {isDeleting ? "..." : t("yes", lang)}
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 h-11 rounded-2xl border-white/10 bg-transparent text-gray-300 hover:bg-white/5"
              >
                {t("back", lang)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
