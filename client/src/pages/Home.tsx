import { useState, useMemo, useEffect } from "react";
import { Star, BarChart } from "lucide-react";
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
const BARBER_NAME = "Ali";
const BARBER_NAME_AR = "علي";
const BARBER_PHONE = "0558394644";
const BARBER_PHONE_DISPLAY = "055 839 4644";
const BARBER_LOCATION_AR = "مدينة تبوك";
const BARBER_LOCATION_EN = "Tabuk";
const BARBER_LOCATION_MAPS = "https://maps.app.goo.gl/6sQ5Q2CQmnShikXh6?g_st=ic";

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
  appName:    { ar: "حجوزات علي",       tr: "Ali'nin Randevuları" },
  subtitle:   { ar: "Berber Ali • Premium Barbershop",   tr: "Berber Ali • Premium Barbershop" },
  barberCard: { ar: "بيانات الحلاق", tr: "Berber Bilgileri" },
  callBarber: { ar: "اتصل بعلي",        tr: "Ali'yi Ara" },
  whatsapp:   { ar: "واتسآب",           tr: "WhatsApp" },
  workHours:  { ar: "ساعات العمل",     tr: "Çalışma Saatleri" },
  workTime:   { ar: "10:00 ص — 11:00 م",   tr: "10:00 - 23:00" },
  location:   { ar: "الموقع",         tr: "Konum" },
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

function maskPhoneNumber(phone: string): string {
  // Show first 4 digits, mask last 5
  if (phone.length <= 4) return phone;
  return phone.slice(0, 4) + "•••••";
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

  const { data: stats } = trpc.statistics.getStats.useQuery();

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
  const occupancyRate = totalSlots > 0 ? Math.round((bookedCount / totalSlots) * 100) : 0;
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

      {/* ── BARBER INFO CARD ── */}
      <div className="px-4 pt-3 pb-1">
        <div className="relative rounded-3xl overflow-hidden border border-[#c9a84c]/20 bg-gradient-to-l from-[#0f0e00] via-[#111008] to-[#0a0a0a] shadow-[0_4px_32px_rgba(201,168,76,0.08)]">
          {/* Subtle gold shimmer line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c9a84c]/40 to-transparent" />

          <div className="flex items-center gap-4 px-4 py-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#c9a84c] to-[#8a6a1e] flex items-center justify-center shadow-lg shadow-[#c9a84c]/20">
                <span className="text-2xl font-black text-black">A</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[#0a0a0a]" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-base font-black text-white">
                  {lang === "ar" ? BARBER_NAME_AR : BARBER_NAME}
                </p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c9a84c]/15 text-[#c9a84c] font-bold border border-[#c9a84c]/20">
                  Berber
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 font-mono">{BARBER_PHONE_DISPLAY}</p>
              <p className="text-[10px] text-gray-600 mt-1">
                {t("workHours", lang)}: <span className="text-[#c9a84c]/70">{t("workTime", lang)}</span>
              </p>
              <a
                href={BARBER_LOCATION_MAPS}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-[10px] text-[#c9a84c] hover:text-[#f0d080] transition-colors group"
              >
                <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5z"/>
                </svg>
                <span className="font-semibold">{lang === "ar" ? BARBER_LOCATION_AR : BARBER_LOCATION_EN}</span>
              </a>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 shrink-0">
              <a
                href={`tel:${BARBER_PHONE}`}
                className="w-10 h-10 rounded-2xl bg-[#c9a84c]/10 border border-[#c9a84c]/20 flex items-center justify-center hover:bg-[#c9a84c]/20 transition-all active:scale-90"
              >
                <Phone className="w-4 h-4 text-[#c9a84c]" />
              </a>
              <a
                href={`https://wa.me/${BARBER_PHONE}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center hover:bg-green-500/20 transition-all active:scale-90"
              >
                <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </div>
          </div>
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
        {/* SEO H2 - Hidden but indexed */}
        <h2 className="sr-only">
          {lang === "ar" ? "جدول مواعيد حلاق علي" : "Ali'nin Berber Randevu Takvimi"}
        </h2>
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
                          <p className="text-xs text-gray-400 font-mono">{maskPhoneNumber(appt.phoneNumber)}</p>
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

      {/* Statistics Dashboard */}
      <section className="px-4 py-8 border-t border-white/5">
        <div className="flex items-center gap-2 mb-6">
          <BarChart className="w-5 h-5 text-[#c9a84c]" />
          <h2 className="text-lg font-bold text-white">
            {lang === "ar" ? "إحصائيات اليوم" : "Bugünün İstatistikleri"}
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gradient-to-br from-[#1a1500] to-[#0f0e00] rounded-2xl border border-[#c9a84c]/20 p-4 text-center">
            <p className="text-2xl font-black text-[#c9a84c]">{bookedCount}</p>
            <p className="text-[10px] text-gray-500 mt-1">{lang === "ar" ? "مواعيد" : "Randevu"}</p>
          </div>
          <div className="bg-gradient-to-br from-[#1a1500] to-[#0f0e00] rounded-2xl border border-[#c9a84c]/20 p-4 text-center">
            <p className="text-2xl font-black text-[#c9a84c]">{occupancyRate}%</p>
            <p className="text-[10px] text-gray-500 mt-1">{lang === "ar" ? "الإشغال" : "Doluluk"}</p>
          </div>
          <div className="bg-gradient-to-br from-[#1a1500] to-[#0f0e00] rounded-2xl border border-[#c9a84c]/20 p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <p className="text-2xl font-black text-[#c9a84c]">{stats?.averageRating.toFixed(1) || "0"}</p>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">{lang === "ar" ? "التقييم" : "Puan"}</p>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="px-4 py-8 border-t border-white/5">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-[#c9a84c]" />
          <h2 className="text-lg font-bold text-white">
            {lang === "ar" ? "تقييمات العملاء" : "Müşteri Yorumları"}
          </h2>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <p className="text-center text-gray-500 text-sm py-8">
            {lang === "ar" ? "لا توجد تقييمات حتى الآن" : "Henüz yorum yok"}
          </p>
        </div>
      </section>

      {/* Footer with Signature */}
      <footer className="px-4 py-12 border-t border-white/5 bg-gradient-to-b from-transparent to-[#0a0a0a]/50">
        <div className="flex flex-col items-center justify-center space-y-6">
          {/* Signature Image */}
          <div className="flex justify-center">
            <img
              src="/manus-storage/signature_5ebcf729.png"
              alt="Faris alKaldi Signature"
              className="h-32 object-contain opacity-90 hover:opacity-100 transition-opacity"
            />
          </div>

          {/* Copyright Text */}
          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500 tracking-widest uppercase">
              {lang === "ar" ? "تطبيق حجوزات احترافي" : "Profesyonel Randevu Uygulaması"}
            </p>
            <p className="text-[10px] text-gray-600">
              {lang === "ar"
                ? `© ${new Date().getFullYear()} حجوزات علي. جميع الحقوق محفوظة.`
                : `© ${new Date().getFullYear()} Ali's Barbershop. Tüm hakları saklıdır.`}
            </p>
            <p className="text-[9px] text-gray-700 mt-3">
              {lang === "ar"
                ? "تم بناء هذا التطبيق بواسطة Manus AI"
                : "Manus AI tarafından geliştirilmiştir"}
            </p>
          </div>

          {/* Decorative Line */}
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#c9a84c]/30 to-transparent" />
        </div>
      </footer>
    </div>
  );
}
