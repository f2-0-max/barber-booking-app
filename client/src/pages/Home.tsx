import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { format, addDays, subDays, isToday } from "date-fns";
import { ar } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Scissors, Phone, User, Trash2, X, Plus, Clock } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, AlertTriangle } from "lucide-react";

// Generate time slots from 10:00 to 23:30 every 30 min
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 10; h < 24; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 23) slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  slots.push("23:30");
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function formatTimeArabic(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  const period = h >= 12 ? "م" : "ص";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDateArabic(date: Date): string {
  return format(date, "EEEE، d MMMM yyyy", { locale: ar });
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  const [viewAppt, setViewAppt] = useState<Appointment | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: appointments = [], refetch } = trpc.appointments.getByDate.useQuery(
    { date: dateStr },
    { refetchOnWindowFocus: true }
  );

  const bookedMap = useMemo(() => {
    const map: Record<string, Appointment> = {};
    for (const a of appointments as Appointment[]) {
      map[a.timeSlot] = a;
    }
    return map;
  }, [appointments]);

  const createMutation = trpc.appointments.create.useMutation({
    onSuccess: () => {
      refetch();
      setBookingSlot(null);
      setCustomerName("");
      setPhoneNumber("");
      toast.success("تم الحجز بنجاح!");
    },
    onError: () => toast.error("حدث خطأ أثناء الحجز"),
  });

  const deleteMutation = trpc.appointments.delete.useMutation({
    onSuccess: () => {
      refetch();
      setViewAppt(null);
      toast.success("تم إلغاء الموعد");
    },
    onError: () => toast.error("حدث خطأ أثناء الإلغاء"),
  });

  const handleBook = async () => {
    if (!customerName.trim() || !phoneNumber.trim()) {
      toast.error("يرجى إدخال الاسم ورقم الجوال");
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

  const goToPrev = () => setSelectedDate(d => subDays(d, 1));
  const goToNext = () => setSelectedDate(d => addDays(d, 1));
  const goToToday = () => setSelectedDate(new Date());

  const handleDeleteConfirmed = async () => {
    setConfirmDelete(false);
    await handleDelete();
  };

  const bookedCount = Object.keys(bookedMap).length;
  const totalSlots = TIME_SLOTS.length;

  // Scroll to current time on load
  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    if (h < 10 || h >= 24) return;
    const roundedM = m < 30 ? "00" : "30";
    const currentSlot = `${String(h).padStart(2, "0")}:${roundedM}`;
    const el = document.getElementById(`slot-${currentSlot}`);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
  }, [selectedDate]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-[#c9a84c]/20">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c9a84c] to-[#f0d080] flex items-center justify-center">
              <Scissors className="w-4 h-4 text-[#0a0a0a]" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#c9a84c] leading-none">مواعيدي</h1>
              <p className="text-[10px] text-gray-500 leading-none mt-0.5">نظام الحجوزات</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-xs text-gray-400">{bookedCount} / {totalSlots}</p>
            <p className="text-[10px] text-gray-600">موعد محجوز</p>
          </div>
        </div>

        {/* Date Navigator */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between bg-[#141414] rounded-2xl p-2 border border-[#c9a84c]/10">
            <button
              onClick={goToNext}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-[#c9a84c] hover:bg-[#c9a84c]/10 transition-all active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button className="text-center flex-1 mx-2 hover:opacity-80 transition-opacity">
                  <p className="text-sm font-semibold text-white">{formatDateArabic(selectedDate)}</p>
                  {isToday(selectedDate) ? (
                    <span className="text-[10px] text-[#c9a84c] font-medium">اليوم</span>
                  ) : (
                    <span className="text-[10px] text-gray-600 flex items-center justify-center gap-1">
                      <CalendarIcon className="w-2.5 h-2.5" />اضغط لتغيير
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-[#141414] border border-[#c9a84c]/20" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => { if (d) { setSelectedDate(d); setCalendarOpen(false); } }}
                  className="text-white [&_.rdp-day_button:hover]:bg-[#c9a84c]/20 [&_.rdp-day_button.rdp-day_selected]:bg-[#c9a84c] [&_.rdp-day_button.rdp-day_selected]:text-black"
                />
              </PopoverContent>
            </Popover>

            <button
              onClick={goToPrev}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-[#c9a84c] hover:bg-[#c9a84c]/10 transition-all active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {!isToday(selectedDate) && (
            <button
              onClick={goToToday}
              className="w-full mt-2 text-xs text-[#c9a84c] py-1.5 rounded-xl border border-[#c9a84c]/20 hover:bg-[#c9a84c]/10 transition-all active:scale-95"
            >
              العودة لليوم
            </button>
          )}
        </div>
      </header>

      {/* Time Slots */}
      <main className="px-4 py-4 pb-24 space-y-2">
        {TIME_SLOTS.map((slot) => {
          const appt = bookedMap[slot];
          const isBooked = !!appt;

          return (
            <button
              id={`slot-${slot}`}
              key={slot}
              onClick={() => {
                if (isBooked) {
                  setViewAppt(appt);
                } else {
                  setBookingSlot(slot);
                  setCustomerName("");
                  setPhoneNumber("");
                }
              }}
              className={`w-full rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 active:scale-[0.98] text-right
                ${isBooked
                  ? "bg-gradient-to-l from-[#c9a84c]/15 to-[#c9a84c]/5 border border-[#c9a84c]/40 shadow-[0_0_20px_rgba(201,168,76,0.08)]"
                  : "bg-[#141414] border border-white/5 hover:border-white/10 hover:bg-[#1a1a1a]"
                }`}
            >
              {/* Time */}
              <div className={`w-16 text-center shrink-0 ${isBooked ? "text-[#c9a84c]" : "text-gray-500"}`}>
                <p className="text-sm font-bold leading-none">{formatTimeArabic(slot)}</p>
              </div>

              {/* Divider */}
              <div className={`w-px h-10 shrink-0 ${isBooked ? "bg-[#c9a84c]/40" : "bg-white/10"}`} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                {isBooked ? (
                  <div>
                    <p className="text-sm font-semibold text-white truncate">{appt.customerName}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-gray-500" />
                      <p className="text-xs text-gray-400 font-mono">{appt.phoneNumber}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">فارغ — اضغط للحجز</p>
                )}
              </div>

              {/* Status icon */}
              <div className="shrink-0">
                {isBooked ? (
                  <div className="w-7 h-7 rounded-full bg-[#c9a84c]/20 flex items-center justify-center">
                    <Scissors className="w-3.5 h-3.5 text-[#c9a84c]" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5 text-gray-600" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </main>

      {/* Booking Dialog */}
      <Dialog open={!!bookingSlot} onOpenChange={(o) => !o && setBookingSlot(null)}>
        <DialogContent className="bg-[#141414] border border-[#c9a84c]/20 text-white rounded-3xl max-w-sm mx-auto" dir="rtl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#c9a84c] to-[#f0d080] flex items-center justify-center">
                <Scissors className="w-5 h-5 text-[#0a0a0a]" />
              </div>
              <div>
                <DialogTitle className="text-white text-base">حجز موعد جديد</DialogTitle>
                {bookingSlot && (
                  <p className="text-xs text-[#c9a84c] mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimeArabic(bookingSlot)} — {formatDateArabic(selectedDate)}
                  </p>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> اسم العميل
              </Label>
              <Input
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="أدخل اسم العميل"
                className="bg-[#0a0a0a] border-white/10 text-white placeholder:text-gray-600 rounded-xl h-11 focus:border-[#c9a84c]/50 focus:ring-[#c9a84c]/20"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-400 text-xs flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> رقم الجوال
              </Label>
              <Input
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="05xxxxxxxx"
                type="tel"
                inputMode="numeric"
                className="bg-[#0a0a0a] border-white/10 text-white placeholder:text-gray-600 rounded-xl h-11 focus:border-[#c9a84c]/50 focus:ring-[#c9a84c]/20 font-mono"
                onKeyDown={e => e.key === "Enter" && handleBook()}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleBook}
                disabled={isSubmitting}
                className="flex-1 h-12 rounded-2xl bg-gradient-to-l from-[#c9a84c] to-[#f0d080] text-[#0a0a0a] font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
              >
                {isSubmitting ? "جاري الحجز..." : "تأكيد الحجز"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setBookingSlot(null)}
                className="w-12 h-12 rounded-2xl border-white/10 bg-transparent text-gray-400 hover:bg-white/5 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="bg-[#141414] border border-red-500/20 text-white rounded-3xl max-w-xs mx-auto" dir="rtl">
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">تأكيد الإلغاء</h3>
            <p className="text-sm text-gray-400 mb-6">هل تريد إلغاء موعد <span className="text-white font-semibold">{viewAppt?.customerName}</span>؟</p>
            <div className="flex gap-3">
              <Button
                onClick={handleDeleteConfirmed}
                disabled={isDeleting}
                className="flex-1 h-11 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm"
              >
                {isDeleting ? "جاري..." : "نعم، إلغاء"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 h-11 rounded-2xl border-white/10 bg-transparent text-gray-300 hover:bg-white/5"
              >
                تراجع
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Appointment Dialog */}
      <Dialog open={!!viewAppt} onOpenChange={(o) => !o && setViewAppt(null)}>
        <DialogContent className="bg-[#141414] border border-[#c9a84c]/20 text-white rounded-3xl max-w-sm mx-auto" dir="rtl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#c9a84c]/20 to-[#c9a84c]/10 border border-[#c9a84c]/30 flex items-center justify-center">
                <Scissors className="w-5 h-5 text-[#c9a84c]" />
              </div>
              <div>
                <DialogTitle className="text-white text-base">تفاصيل الموعد</DialogTitle>
                {viewAppt && (
                  <p className="text-xs text-[#c9a84c] mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimeArabic(viewAppt.timeSlot)}
                  </p>
                )}
              </div>
            </div>
          </DialogHeader>

          {viewAppt && (
            <div className="space-y-4 mt-2">
              <div className="bg-[#0a0a0a] rounded-2xl p-4 space-y-3 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#c9a84c]/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-[#c9a84c]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">اسم العميل</p>
                    <p className="text-sm font-semibold text-white">{viewAppt.customerName}</p>
                  </div>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#c9a84c]/10 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-[#c9a84c]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">رقم الجوال</p>
                    <p className="text-sm font-semibold text-white font-mono">{viewAppt.phoneNumber}</p>
                  </div>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#c9a84c]/10 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-[#c9a84c]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">الموعد</p>
                    <p className="text-sm font-semibold text-white">
                      {formatTimeArabic(viewAppt.timeSlot)} — {formatDateArabic(selectedDate)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setConfirmDelete(true)}
                  disabled={isDeleting}
                  className="flex-1 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-semibold text-sm active:scale-[0.98] transition-all"
                  variant="outline"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  {isDeleting ? "جاري الإلغاء..." : "إلغاء الموعد"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setViewAppt(null)}
                  className="w-12 h-12 rounded-2xl border-white/10 bg-transparent text-gray-400 hover:bg-white/5 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
