import { useState } from "react";
import {
  useListRevenue,
  useCreateRevenue,
  useDeleteRevenue,
  getListRevenueQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Plus, Trash2 } from "lucide-react";

function formatDA(amount: number) {
  return `${amount.toLocaleString("ar-DZ")} دج`;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function getAvailableMonths() {
  const months = [""];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  return months;
}

function monthLabel(m: string) {
  if (!m) return "جميع الأشهر";
  const [y, mo] = m.split("-");
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return d.toLocaleDateString("ar-DZ", { month: "long", year: "numeric" });
}

export default function Revenue() {
  const [month, setMonth] = useState(currentMonth());
  const [showAdd, setShowAdd] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const params = month ? { month } : undefined;
  const { data: revenues = [], isLoading } = useListRevenue(params, {
    query: { queryKey: getListRevenueQueryKey(params) }
  });

  const { mutate: createRevenue } = useCreateRevenue({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListRevenueQueryKey() });
        toast({ title: "تمت إضافة إيراد اليوم" });
        setAmount("");
        setNote("");
        setShowAdd(false);
      }
    }
  });

  const { mutate: deleteRevenue } = useDeleteRevenue({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListRevenueQueryKey() });
        toast({ title: "تم حذف الإيراد" });
      }
    }
  });

  const total = revenues.reduce((sum, r) => sum + r.amount, 0);
  const months = getAvailableMonths();

  const handleSubmit = () => {
    if (!amount || !date) return;
    createRevenue({ data: { date, amount: Number(amount), note } });
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5 md:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">الإيرادات</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة تقارير Z اليومية والإيرادات</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            إضافة تقرير Z
          </button>
        </div>
      </div>

      {/* Total card */}
      <div className="bg-card border border-green-500/20 rounded-xl p-4 md:p-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{month ? `إجمالي ${monthLabel(month)}` : "إجمالي الإيرادات"}</p>
          <p className="text-3xl md:text-4xl font-bold text-green-400 mt-1">{formatDA(total)}</p>
          <p className="text-muted-foreground text-sm mt-1">{revenues.length} إدخال</p>
        </div>
        <TrendingUp className="w-12 h-12 md:w-14 md:h-14 text-green-400/30" />
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-card border border-primary/20 rounded-xl p-4 md:p-6 space-y-4">
          <h3 className="font-semibold">إدخال تقرير Z اليومي</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <input type="number" placeholder="المبلغ الإجمالي (دج)" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <input placeholder="ملاحظة (اختياري)" value={note} onChange={(e) => setNote(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSubmit} className="bg-primary text-primary-foreground px-5 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm">
              إضافة
            </button>
            <button onClick={() => setShowAdd(false)} className="bg-muted text-foreground px-5 py-2 rounded-lg hover:bg-muted/80 transition-colors text-sm">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Revenue list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : revenues.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>لا توجد إيرادات لهذه الفترة</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground whitespace-nowrap">التاريخ</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground whitespace-nowrap">المبلغ</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground whitespace-nowrap">ملاحظة</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {[...revenues].reverse().map((r) => (
                  <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{new Date(r.date).toLocaleDateString("ar-DZ")}</td>
                    <td className="px-4 py-3 font-bold text-green-400 whitespace-nowrap">{formatDA(r.amount)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">{r.note || "—"}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteRevenue({ id: r.id })} className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
