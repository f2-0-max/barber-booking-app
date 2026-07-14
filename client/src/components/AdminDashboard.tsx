import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, User, Phone, Mail } from "lucide-react";

interface AdminDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: "ar" | "tr";
}

const L = {
  title: { ar: "لوحة تحكم المالك", tr: "Yönetici Paneli" },
  supervisors: { ar: "المشرفون", tr: "Denetçiler" },
  addSupervisor: { ar: "إضافة مشرف جديد", tr: "Yeni Denetçi Ekle" },
  memberPhone: { ar: "رقم جوال العضو", tr: "Üye Telefon Numarası" },
  memberPhonePh: { ar: "05xxxxxxxxx", tr: "05xxxxxxxxx" },
  add: { ar: "إضافة", tr: "Ekle" },
  remove: { ar: "حذف", tr: "Sil" },
  name: { ar: "الاسم", tr: "Ad" },
  phone: { ar: "الجوال", tr: "Telefon" },
  email: { ar: "البريد", tr: "E-posta" },
  status: { ar: "الحالة", tr: "Durum" },
  actions: { ar: "الإجراءات", tr: "İşlemler" },
  noSupervisors: { ar: "لا توجد مشرفون بعد", tr: "Henüz denetçi yok" },
  loading: { ar: "جاري التحميل...", tr: "Yükleniyor..." },
  addingMember: { ar: "جاري الإضافة...", tr: "Ekleniyor..." },
  removingMember: { ar: "جاري الحذف...", tr: "Siliniyor..." },
  success: { ar: "تمت العملية بنجاح", tr: "İşlem başarılı" },
  errPhone: { ar: "يرجى إدخال رقم جوال صحيح", tr: "Lütfen geçerli bir telefon numarası girin" },
  errAdd: { ar: "خطأ في إضافة المشرف", tr: "Denetçi ekleme hatası" },
  errRemove: { ar: "خطأ في حذف المشرف", tr: "Denetçi silme hatası" },
  errFetch: { ar: "خطأ في تحميل البيانات", tr: "Veri yükleme hatası" },
  confirmRemove: { ar: "هل تريد حذف هذا المشرف؟", tr: "Bu denetçiyi silmek istiyor musunuz?" },
  yes: { ar: "نعم", tr: "Evet" },
  cancel: { ar: "إلغاء", tr: "İptal" },
};

function t(key: keyof typeof L, lang: "ar" | "tr"): string {
  return L[key][lang];
}

interface Supervisor {
  id: number;
  memberId: number;
  name: string;
  phoneNumber: string;
  email?: string;
  addedBy: number;
  createdAt: Date;
}

export function AdminDashboard({
  open,
  onOpenChange,
  lang,
}: AdminDashboardProps) {
  const [memberPhone, setMemberPhone] = useState("");
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);
  const isRTL = lang === "ar";
  const dir = isRTL ? "rtl" : "ltr";

  // Fetch supervisors
  const { data: supervisorsList, isLoading, refetch } = trpc.supervisors.getAll.useQuery(
    undefined,
    { refetchInterval: 5000 }
  );

  useEffect(() => {
    if (supervisorsList) {
      setSupervisors(supervisorsList as Supervisor[]);
    }
  }, [supervisorsList]);

  // Add supervisor
  const addMutation = trpc.supervisors.add.useMutation({
    onSuccess: () => {
      toast.success(t("success", lang));
      setMemberPhone("");
      refetch();
    },
    onError: () => toast.error(t("errAdd", lang)),
  });

  // Remove supervisor
  const removeMutation = trpc.supervisors.remove.useMutation({
    onSuccess: () => {
      toast.success(t("success", lang));
      setConfirmRemoveId(null);
      refetch();
    },
    onError: () => toast.error(t("errRemove", lang)),
  });

  // Query to get member by phone
  const [queryPhone, setQueryPhone] = useState("");
  const [memberNotFound, setMemberNotFound] = useState(false);
  const { data: queriedMember, isLoading: isLoadingMember } = trpc.members.getByPhone.useQuery(
    { phoneNumber: queryPhone },
    { enabled: !!queryPhone && queryPhone.length >= 10 }
  );

  // When member is found, add as supervisor
  useEffect(() => {
    if (queryPhone && queryPhone === memberPhone && memberPhone) {
      if (queriedMember) {
        setMemberNotFound(false);
        addMutation.mutate({ memberId: queriedMember.id });
        setQueryPhone("");
      } else if (!isLoadingMember) {
        setMemberNotFound(true);
      }
    }
  }, [queriedMember, memberPhone, queryPhone, isLoadingMember]);

  const handleAddSupervisor = async () => {
    if (!memberPhone.trim() || memberPhone.length < 10) {
      toast.error(t("errPhone", lang));
      return;
    }

    setMemberNotFound(false);
    // Trigger query to fetch member
    setQueryPhone(memberPhone);
  };

  const handleRemoveSupervisor = async (memberId: number) => {
    await removeMutation.mutateAsync({ memberId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl bg-[#141414] border border-[#c9a84c]/20 rounded-3xl max-h-[90vh] overflow-y-auto" dir={dir}>
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-white">
            {t("title", lang)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add Supervisor Section */}
          <div className="space-y-3 p-4 rounded-2xl bg-[#0a0a0a] border border-[#c9a84c]/10">
            <h3 className="text-sm font-bold text-[#c9a84c]">{t("addSupervisor", lang)}</h3>
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder={t("memberPhonePh", lang)}
                value={memberPhone}
                onChange={(e) => {
                  setMemberPhone(e.target.value);
                  setMemberNotFound(false);
                }}
                disabled={addMutation.isPending || isLoadingMember}
                className="flex-1 bg-[#000] border border-[#c9a84c]/20 text-white placeholder-gray-600 rounded-2xl h-10"
              />
              <Button
                onClick={handleAddSupervisor}
                disabled={addMutation.isPending || isLoadingMember}
                className="bg-gradient-to-r from-[#c9a84c] to-[#f0d080] text-black font-bold rounded-2xl h-10 px-4 hover:shadow-lg hover:shadow-[#c9a84c]/30 transition-all active:scale-95"
              >
                {addMutation.isPending || isLoadingMember ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </Button>
            </div>
            {memberNotFound && (
              <p className="text-xs text-red-400">
                {lang === "ar" ? "العضو غير موجود" : "Üye bulunamadı"}
              </p>
            )}
          </div>

          {/* Supervisors List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#c9a84c]">{t("supervisors", lang)}</h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-[#c9a84c]" />
                <span className="ml-2 text-gray-400">{t("loading", lang)}</span>
              </div>
            ) : supervisors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {t("noSupervisors", lang)}
              </div>
            ) : (
              <div className="space-y-2">
                {supervisors.map((supervisor) => (
                  <div
                    key={supervisor.id}
                    className="p-3 rounded-2xl bg-[#0a0a0a] border border-[#c9a84c]/10 hover:border-[#c9a84c]/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c9a84c] to-[#8a6a1e] flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-black" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{supervisor.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Phone className="w-3 h-3 text-[#c9a84c]/60 shrink-0" />
                              <p className="text-xs text-gray-400 font-mono">{supervisor.phoneNumber}</p>
                            </div>
                            {supervisor.email && (
                              <div className="flex items-center gap-2 mt-1">
                                <Mail className="w-3 h-3 text-[#c9a84c]/60 shrink-0" />
                                <p className="text-xs text-gray-400 truncate">{supervisor.email}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Remove button */}
                      <div className="flex gap-2 shrink-0">
                        {confirmRemoveId === supervisor.id ? (
                          <>
                            <Button
                              onClick={() => handleRemoveSupervisor(supervisor.memberId)}
                              disabled={removeMutation.isPending}
                              size="sm"
                              className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 rounded-lg h-8 px-2 text-xs"
                            >
                              {removeMutation.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                t("yes", lang)
                              )}
                            </Button>
                            <Button
                              onClick={() => setConfirmRemoveId(null)}
                              size="sm"
                              variant="outline"
                              className="border-[#c9a84c]/20 text-gray-400 rounded-lg h-8 px-2 text-xs"
                            >
                              {t("cancel", lang)}
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => setConfirmRemoveId(supervisor.id)}
                            size="sm"
                            className="bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20 hover:bg-[#c9a84c]/20 rounded-lg h-8 px-2"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
