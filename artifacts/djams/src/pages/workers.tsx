import { useState } from "react";
import { Link } from "wouter";
import {
  useListWorkers,
  useCreateWorker,
  useDeleteWorker,
  useGetWorkerBalance,
  useLogAttendance,
  useCreateAdvance,
  useCreatePayout,
  getListWorkersQueryKey,
  getGetWorkerBalanceQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Trash2, Calendar, DollarSign, CheckSquare, ChevronLeft } from "lucide-react";

function formatDA(amount: number) {
  return `${amount.toLocaleString("ar-DZ")} دج`;
}

export default function Workers() {
  const { data: workers = [], isLoading } = useListWorkers();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5 md:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">إدارة الموظفين</h1>
          <p className="text-muted-foreground text-sm mt-1">تتبع الحضور والسلف والمستحقات</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          إضافة موظف
        </button>
      </div>

      {showAdd && <AddWorkerForm onClose={() => setShowAdd(false)} />}

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : workers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>لا يوجد موظفون. ابدأ بإضافة موظف جديد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {workers.map((worker) => (
            <WorkerCard key={worker.id} worker={worker} />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkerCard({ worker }: { worker: { id: number; name: string; role: string; dailyRate: number; createdAt: string } }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: balance } = useGetWorkerBalance(worker.id, {
    query: { queryKey: getGetWorkerBalanceQueryKey(worker.id) }
  });
  const { mutate: deleteWorker } = useDeleteWorker({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListWorkersQueryKey() });
        toast({ title: "تم حذف الموظف" });
      }
    }
  });
  const { mutate: logAtt } = useLogAttendance({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetWorkerBalanceQueryKey(worker.id) });
        toast({ title: "تم تسجيل الحضور" });
      }
    }
  });
  const { mutate: createAdvance } = useCreateAdvance({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetWorkerBalanceQueryKey(worker.id) });
        toast({ title: "تم تسجيل السلفة" });
      }
    }
  });
  const { mutate: createPayout } = useCreatePayout({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetWorkerBalanceQueryKey(worker.id) });
        toast({ title: "تمت تسوية الحساب" });
      }
    }
  });

  const [showAttForm, setShowAttForm] = useState(false);
  const [showAdvForm, setShowAdvForm] = useState(false);
  const [attUnits, setAttUnits] = useState("1");
  const [attCustom, setAttCustom] = useState("");
  const [attDate, setAttDate] = useState(new Date().toISOString().split("T")[0]);
  const [advAmount, setAdvAmount] = useState("");

  const handleAttendance = () => {
    const units = attUnits === "custom" ? Number(attCustom) : Number(attUnits);
    if (!units || units <= 0) return;
    logAtt({ data: { workerId: worker.id, date: attDate, units, note: "" } });
    setShowAttForm(false);
  };

  const handleAdvance = () => {
    const amount = Number(advAmount);
    if (!amount || amount <= 0) return;
    createAdvance({ data: { workerId: worker.id, amount, note: "سلفة" } });
    setAdvAmount("");
    setShowAdvForm(false);
  };

  const handlePayout = () => {
    const bal = balance?.currentBalance ?? 0;
    if (bal <= 0) {
      toast({ title: "لا يوجد رصيد للتسوية", variant: "destructive" });
      return;
    }
    if (confirm(`تأكيد تسوية حساب ${worker.name} بمبلغ ${formatDA(bal)}؟`)) {
      createPayout({ data: { workerId: worker.id, amount: bal, note: "تسوية شاملة" } });
    }
  };

  const bal = balance?.currentBalance ?? 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base md:text-lg font-bold truncate">{worker.name}</h3>
          <p className="text-muted-foreground text-sm">{worker.role}</p>
          <p className="text-primary text-sm font-medium mt-1">معدل يومي: {formatDA(worker.dailyRate)}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Link href={`/workers/${worker.id}`}>
            <button className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </Link>
          <button
            onClick={() => deleteWorker({ id: worker.id })}
            className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Balance display */}
      {balance && (
        <div className="bg-background rounded-lg p-3 md:p-4 border border-border/50">
          <div className="grid grid-cols-3 gap-2 text-center mb-3">
            <div>
              <p className="text-xs text-muted-foreground">المستحق</p>
              <p className="font-bold text-green-400 text-sm">{formatDA(balance.totalEarned)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">السلف</p>
              <p className="font-bold text-orange-400 text-sm">{formatDA(balance.totalAdvances)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">المدفوع</p>
              <p className="font-bold text-blue-400 text-sm">{formatDA(balance.totalPaidOut)}</p>
            </div>
          </div>
          <div className="border-t border-border pt-3 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">الرصيد المتبقي</span>
            <span className={`text-lg md:text-xl font-bold ${bal >= 0 ? "text-primary" : "text-destructive"}`}>
              {formatDA(bal)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {balance.totalWorkUnits} وحدة عمل × {formatDA(balance.dailyRate)}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setShowAttForm(!showAttForm)}
          className="flex items-center gap-1.5 text-xs sm:text-sm px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" />
          سجّل حضور
        </button>
        <button
          onClick={() => setShowAdvForm(!showAdvForm)}
          className="flex items-center gap-1.5 text-xs sm:text-sm px-3 py-2 bg-orange-500/10 text-orange-400 rounded-lg hover:bg-orange-500/20 transition-colors"
        >
          <DollarSign className="w-3.5 h-3.5" />
          سلفة
        </button>
        <button
          onClick={handlePayout}
          className="flex items-center gap-1.5 text-xs sm:text-sm px-3 py-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors"
        >
          <CheckSquare className="w-3.5 h-3.5" />
          تسوية الحساب
        </button>
      </div>

      {/* Attendance Form */}
      {showAttForm && (
        <div className="bg-background border border-border rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium">تسجيل الحضور</p>
          <input
            type="date"
            value={attDate}
            onChange={(e) => setAttDate(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[["1", "يوم كامل"], ["0.5", "نصف يوم"], ["0.25", "ربع يوم"], ["custom", "مخصص"]].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setAttUnits(v)}
                className={`text-xs py-2 rounded-lg border transition-colors ${attUnits === v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {attUnits === "custom" && (
            <input
              type="number"
              step="0.25"
              min="0.25"
              max="2"
              placeholder="0.75"
              value={attCustom}
              onChange={(e) => setAttCustom(e.target.value)}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
          <div className="flex gap-2">
            <button onClick={handleAttendance} className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              تأكيد
            </button>
            <button onClick={() => setShowAttForm(false)} className="flex-1 bg-muted text-foreground py-2 rounded-lg text-sm hover:bg-muted/80 transition-colors">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Advance Form */}
      {showAdvForm && (
        <div className="bg-background border border-border rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium">تسجيل سلفة</p>
          <input
            type="number"
            placeholder="المبلغ بالدينار"
            value={advAmount}
            onChange={(e) => setAdvAmount(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-2">
            <button onClick={handleAdvance} className="flex-1 bg-orange-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-orange-500/90 transition-colors">
              تأكيد
            </button>
            <button onClick={() => setShowAdvForm(false)} className="flex-1 bg-muted text-foreground py-2 rounded-lg text-sm hover:bg-muted/80 transition-colors">
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddWorkerForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { mutate: createWorker } = useCreateWorker({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListWorkersQueryKey() });
        toast({ title: "تم إضافة الموظف" });
        onClose();
      }
    }
  });
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [dailyRate, setDailyRate] = useState("");

  const handleSubmit = () => {
    if (!name || !role || !dailyRate) return;
    createWorker({ data: { name, role, dailyRate: Number(dailyRate) } });
  };

  return (
    <div className="bg-card border border-primary/20 rounded-xl p-4 md:p-6 space-y-4">
      <h3 className="font-semibold text-base md:text-lg">إضافة موظف جديد</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          placeholder="الاسم الكامل"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          placeholder="المنصب (طاهٍ، نادل...)"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          type="number"
          placeholder="الراتب اليومي (دج)"
          value={dailyRate}
          onChange={(e) => setDailyRate(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div className="flex gap-3">
        <button onClick={handleSubmit} className="bg-primary text-primary-foreground px-5 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm">
          إضافة
        </button>
        <button onClick={onClose} className="bg-muted text-foreground px-5 py-2 rounded-lg hover:bg-muted/80 transition-colors text-sm">
          إلغاء
        </button>
      </div>
    </div>
  );
}
