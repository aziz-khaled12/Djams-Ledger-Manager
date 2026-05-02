import { useRoute, Link } from "wouter";
import {
  useGetWorker,
  useGetWorkerBalance,
  useListAttendance,
  useListAdvances,
  useListPayouts,
  useDeleteAttendance,
  useDeleteAdvance,
  getGetWorkerBalanceQueryKey,
  getListAttendanceQueryKey,
  getListAdvancesQueryKey,
  getListPayoutsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Trash2 } from "lucide-react";

function formatDA(amount: number) {
  return `${amount.toLocaleString("ar-DZ")} دج`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ar-DZ");
}

export default function WorkerDetail() {
  const [, params] = useRoute("/workers/:id");
  const id = Number(params?.id);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: worker } = useGetWorker(id, { query: { enabled: !!id } });
  const { data: balance } = useGetWorkerBalance(id, { query: { enabled: !!id, queryKey: getGetWorkerBalanceQueryKey(id) } });
  const { data: attendance = [] } = useListAttendance({ workerId: id }, { query: { enabled: !!id, queryKey: getListAttendanceQueryKey({ workerId: id }) } });
  const { data: advances = [] } = useListAdvances({ workerId: id }, { query: { enabled: !!id, queryKey: getListAdvancesQueryKey({ workerId: id }) } });
  const { data: payouts = [] } = useListPayouts({ workerId: id }, { query: { enabled: !!id, queryKey: getListPayoutsQueryKey({ workerId: id }) } });

  const { mutate: deleteAtt } = useDeleteAttendance({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListAttendanceQueryKey({ workerId: id }) });
        qc.invalidateQueries({ queryKey: getGetWorkerBalanceQueryKey(id) });
        toast({ title: "تم حذف سجل الحضور" });
      }
    }
  });

  const { mutate: deleteAdv } = useDeleteAdvance({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListAdvancesQueryKey({ workerId: id }) });
        qc.invalidateQueries({ queryKey: getGetWorkerBalanceQueryKey(id) });
        toast({ title: "تم حذف السلفة" });
      }
    }
  });

  if (!worker) return <div className="p-6 text-muted-foreground">جاري التحميل...</div>;

  const bal = balance?.currentBalance ?? 0;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/workers">
          <button className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors flex-shrink-0">
            <ArrowRight className="w-5 h-5" />
          </button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl md:text-3xl font-bold truncate">{worker.name}</h1>
          <p className="text-muted-foreground text-sm">{worker.role} — {formatDA(worker.dailyRate)} / يوم</p>
        </div>
      </div>

      {/* Balance Summary */}
      {balance && (
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <h2 className="font-semibold mb-4 text-primary">ملخص الحساب</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">وحدات العمل</p>
              <p className="text-xl md:text-2xl font-bold">{balance.totalWorkUnits}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">المستحق الإجمالي</p>
              <p className="text-xl md:text-2xl font-bold text-green-400">{formatDA(balance.totalEarned)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">إجمالي السلف</p>
              <p className="text-xl md:text-2xl font-bold text-orange-400">{formatDA(balance.totalAdvances)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">الرصيد المتبقي</p>
              <p className={`text-xl md:text-2xl font-bold ${bal >= 0 ? "text-primary" : "text-destructive"}`}>
                {formatDA(bal)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* History grids — 1 col on mobile, 3 on large */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Attendance */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <h3 className="font-semibold mb-4">سجل الحضور ({attendance.length})</h3>
          {attendance.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">لا يوجد سجل حضور</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {[...attendance].reverse().map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{formatDate(a.date)}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.units === 1 ? "يوم كامل" : a.units === 0.5 ? "نصف يوم" : `${a.units} وحدة`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-primary text-sm font-bold">{a.units}</span>
                    <button onClick={() => deleteAtt({ id: a.id })} className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Advances */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <h3 className="font-semibold mb-4">السلف ({advances.length})</h3>
          {advances.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">لا توجد سلف</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {[...advances].reverse().map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-bold text-orange-400">{formatDA(a.amount)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString("ar-DZ")}</p>
                    {a.note && <p className="text-xs text-muted-foreground">{a.note}</p>}
                  </div>
                  <button onClick={() => deleteAdv({ id: a.id })} className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payouts */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <h3 className="font-semibold mb-4">التسويات ({payouts.length})</h3>
          {payouts.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">لا توجد تسويات</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {[...payouts].reverse().map((p) => (
                <div key={p.id} className="py-2 border-b border-border/50 last:border-0">
                  <p className="text-sm font-bold text-green-400">{formatDA(p.amount)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("ar-DZ")}</p>
                  {p.note && <p className="text-xs text-muted-foreground">{p.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
