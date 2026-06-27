import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, Phone, Lock, Gift } from "lucide-react";
import { useEffect } from "react";

interface MemberRegistrationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: "ar" | "tr";
  onSuccess?: (memberId: number) => void;
}

type Step = "phone" | "otp" | "details";

const L = {
  title: { ar: "تسجيل عضوية جديدة", tr: "Yeni Üyelik Kaydı" },
  subtitle: { ar: "أنشئ حسابك للحصول على مزايا خاصة", tr: "Özel avantajlar için hesabınızı oluşturun" },
  offer: { ar: "عرض حصري", tr: "Özel Teklif" },
  freeService: { ar: "تنظيف بشرة مجاني", tr: "Ücretsiz Cilt Temizliği" },
  firstBooking: { ar: "عند أول حجز عبر الموقع", tr: "İlk rezervasyonda" },
  phone: { ar: "رقم الجوال", tr: "Telefon Numarası" },
  phonePh: { ar: "05xxxxxxxxx", tr: "05xxxxxxxxx" },
  sendOTP: { ar: "إرسال رمز التحقق", tr: "Doğrulama Kodunu Gönder" },
  otp: { ar: "رمز التحقق", tr: "Doğrulama Kodu" },
  otpDesc: { ar: "أدخل الرمز المرسل إلى جوالك", tr: "Telefonunuza gönderilen kodu girin" },
  verify: { ar: "التحقق", tr: "Doğrula" },
  name: { ar: "اسمك الكامل", tr: "Tam Adınız" },
  namePh: { ar: "أدخل اسمك", tr: "Adınızı girin" },
  email: { ar: "البريد الإلكتروني (اختياري)", tr: "E-posta (İsteğe Bağlı)" },
  emailPh: { ar: "example@email.com", tr: "example@email.com" },
  complete: { ar: "إنهاء التسجيل", tr: "Kaydı Tamamla" },
  resend: { ar: "إعادة إرسال", tr: "Yeniden Gönder" },
  resendIn: { ar: "إعادة إرسال في", tr: "Şu kadar sonra yeniden gönder" },
  back: { ar: "رجوع", tr: "Geri" },
  success: { ar: "تم التسجيل بنجاح!", tr: "Kayıt başarılı!" },
  errPhone: { ar: "يرجى إدخال رقم جوال صحيح", tr: "Lütfen geçerli bir telefon numarası girin" },
  errOTP: { ar: "رمز التحقق غير صحيح أو منتهي الصلاحية", tr: "Doğrulama kodu geçersiz veya süresi dolmuş" },
  errName: { ar: "يرجى إدخال اسمك", tr: "Lütfen adınızı girin" },
  errSendOTP: { ar: "خطأ في إرسال رمز التحقق", tr: "Doğrulama kodu gönderme hatası" },
  errRegister: { ar: "خطأ في التسجيل", tr: "Kayıt hatası" },
  maxAttempts: { ar: "تم تجاوز عدد المحاولات. يرجى المحاولة لاحقاً", tr: "Deneme sınırı aşıldı. Lütfen daha sonra tekrar deneyin" },
};

function t(key: keyof typeof L, lang: "ar" | "tr"): string {
  return L[key][lang];
}

export function MemberRegistration({
  open,
  onOpenChange,
  lang,
  onSuccess,
}: MemberRegistrationProps) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const isRTL = lang === "ar";
  const dir = isRTL ? "rtl" : "ltr";

  const requestOTPMutation = trpc.members.requestOTP.useMutation({
    onSuccess: () => {
      setStep("otp");
      setResendTimer(60);
      const interval = setInterval(() => {
        setResendTimer((t) => {
          if (t <= 1) {
            clearInterval(interval);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    },
    onError: (err) => {
      if (err.message.includes("attempts")) {
        toast.error(t("maxAttempts", lang));
      } else {
        toast.error(t("errSendOTP", lang));
      }
    },
  });

  const verifyAndRegisterMutation = trpc.members.verifyAndRegister.useMutation({
    onSuccess: (data) => {
      toast.success(t("success", lang));
      onSuccess?.(data.memberId || 0);
      onOpenChange(false);
      // Reset form
      setStep("phone");
      setPhone("");
      setOtp("");
      setName("");
      setEmail("");
    },
    onError: (err) => {
      if (err.message.includes("Invalid")) {
        toast.error(t("errOTP", lang));
      } else {
        toast.error(t("errRegister", lang));
      }
    },
  });

  const handleRequestOTP = () => {
    if (!phone.trim() || phone.length < 10) {
      toast.error(t("errPhone", lang));
      return;
    }
    requestOTPMutation.mutate({ phoneNumber: phone });
  };

  const handleVerifyAndRegister = () => {
    if (otp.length !== 6) {
      toast.error(t("errOTP", lang));
      return;
    }
    if (!name.trim()) {
      toast.error(t("errName", lang));
      return;
    }
    verifyAndRegisterMutation.mutate({
      phoneNumber: phone,
      code: otp,
      name: name.trim(),
      email: email.trim() || undefined,
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset on close
    setStep("phone");
    setPhone("");
    setOtp("");
    setName("");
    setEmail("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md bg-[#141414] border border-[#c9a84c]/20 rounded-3xl" dir={dir}>
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-white text-center">
            {t("title", lang)}
          </DialogTitle>
          <p className="text-xs text-gray-400 text-center mt-2">{t("subtitle", lang)}</p>
        </DialogHeader>

        {/* Exclusive Offer Banner */}
        <div className="bg-gradient-to-r from-[#c9a84c]/20 to-[#f0d080]/10 border border-[#c9a84c]/40 rounded-2xl p-4 flex items-start gap-3">
          <Gift className="w-5 h-5 text-[#c9a84c] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-bold text-[#c9a84c] uppercase tracking-wider">{t("offer", lang)}</p>
            <p className="text-sm font-bold text-white mt-1">{t("freeService", lang)}</p>
            <p className="text-xs text-gray-400 mt-1">{t("firstBooking", lang)}</p>
          </div>
        </div>
        <div className="space-y-4 py-4">
          {/* Phone Step */}
          {step === "phone" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#c9a84c]" />
                  {t("phone", lang)}
                </Label>
                <Input
                  type="tel"
                  placeholder={t("phonePh", lang)}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={requestOTPMutation.isPending}
                  className="bg-[#0a0a0a] border border-[#c9a84c]/20 text-white placeholder-gray-600 rounded-2xl h-11"
                />
              </div>
              <Button
                onClick={handleRequestOTP}
                disabled={requestOTPMutation.isPending}
                className="w-full bg-gradient-to-r from-[#c9a84c] to-[#f0d080] text-black font-bold rounded-2xl h-11 hover:shadow-lg hover:shadow-[#c9a84c]/30 transition-all active:scale-95"
              >
                {requestOTPMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("sendOTP", lang)}
                  </>
                ) : (
                  t("sendOTP", lang)
                )}
              </Button>
            </div>
          )}

          {/* OTP Step */}
          {step === "otp" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#c9a84c]" />
                  {t("otp", lang)}
                </Label>
                <p className="text-xs text-gray-500">{t("otpDesc", lang)}</p>
                <div className="flex justify-center pt-2">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    disabled={verifyAndRegisterMutation.isPending}
                  >
                    <InputOTPGroup className="flex gap-2">
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <InputOTPSlot
                          key={index}
                          index={index}
                          className="w-10 h-10 rounded-xl border border-[#c9a84c]/20 bg-[#0a0a0a] flex items-center justify-center text-white font-bold text-lg"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              {/* Resend button */}
              <div className="flex justify-center">
                {resendTimer > 0 ? (
                  <span className="text-xs text-gray-500">
                    {t("resendIn", lang)} {resendTimer}s
                  </span>
                ) : (
                  <button
                    onClick={handleRequestOTP}
                    disabled={requestOTPMutation.isPending}
                    className="text-xs text-[#c9a84c] hover:text-[#f0d080] transition-colors"
                  >
                    {t("resend", lang)}
                  </button>
                )}
              </div>

              <Button
                onClick={() => setStep("details")}
                disabled={otp.length !== 6 || verifyAndRegisterMutation.isPending}
                className="w-full bg-gradient-to-r from-[#c9a84c] to-[#f0d080] text-black font-bold rounded-2xl h-11 hover:shadow-lg hover:shadow-[#c9a84c]/30 transition-all active:scale-95"
              >
                {t("verify", lang)}
              </Button>

              <Button
                onClick={() => setStep("phone")}
                variant="outline"
                className="w-full border-[#c9a84c]/20 text-gray-400 rounded-2xl h-11"
              >
                {t("back", lang)}
              </Button>
            </div>
          )}

          {/* Details Step */}
          {step === "details" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">{t("name", lang)}</Label>
                <Input
                  type="text"
                  placeholder={t("namePh", lang)}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={verifyAndRegisterMutation.isPending}
                  className="bg-[#0a0a0a] border border-[#c9a84c]/20 text-white placeholder-gray-600 rounded-2xl h-11"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-300">{t("email", lang)}</Label>
                <Input
                  type="email"
                  placeholder={t("emailPh", lang)}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={verifyAndRegisterMutation.isPending}
                  className="bg-[#0a0a0a] border border-[#c9a84c]/20 text-white placeholder-gray-600 rounded-2xl h-11"
                />
              </div>

              <Button
                onClick={handleVerifyAndRegister}
                disabled={verifyAndRegisterMutation.isPending}
                className="w-full bg-gradient-to-r from-[#c9a84c] to-[#f0d080] text-black font-bold rounded-2xl h-11 hover:shadow-lg hover:shadow-[#c9a84c]/30 transition-all active:scale-95"
              >
                {verifyAndRegisterMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("complete", lang)}
                  </>
                ) : (
                  t("complete", lang)
                )}
              </Button>

              <Button
                onClick={() => setStep("otp")}
                variant="outline"
                className="w-full border-[#c9a84c]/20 text-gray-400 rounded-2xl h-11"
              >
                {t("back", lang)}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
