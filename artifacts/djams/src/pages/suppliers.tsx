import { useState } from "react";
import {
  useListSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  useGetSuppliersMonthlyTotal,
  getListSuppliersQueryKey,
  getGetSuppliersMonthlyTotalQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, Trash2, Edit2, Check, X } from "lucide-react";

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

type Supplier = {
  id: number;
  supplierName: string;
  item: string;
  amount: number;
  date: string;
  note?: string | null;
  createdAt: string;
};

export default function Suppliers() {
  const [month, setMonth] = useState(currentMonth());
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const params = month ? { month } : undefined;
  const { data: suppliers = [], isLoading } = useListSuppliers(params, {
    query: { queryKey: getListSuppliersQueryKey(params) }
  });
  const { data: monthlyTotal } = useGetSuppliersMonthlyTotal(
    { month: month || currentMonth() },
    { query: { enabled: !!month, queryKey: getGetSuppliersMonthlyTotalQueryKey({ month: month || currentMonth() }) } }
  );

  const { mutate: deleteSupplier } = useDeleteSupplier({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
        qc.invalidateQueries({ queryKey: getGetSuppliersMonthlyTotalQueryKey({ month: month || currentMonth() }) });
        toast({ title: "تم حذف السجل" });
      }
    }
  });

  const months = getAvailableMonths();

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5 md:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">الموردون والمصاريف</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة مصاريف الموردين والمشتريات</p>
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
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            إضافة
          </button>
        </div>
      </div>

      {/* Monthly total */}
      {month && monthlyTotal && (
        <div className="bg-card border border-primary/20 rounded-xl p-4 md:p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">إجمالي مصاريف {monthLabel(month)}</p>
            <p className="text-2xl md:text-3xl font-bold text-primary mt-1">{formatDA(monthlyTotal.total)}</p>
          </div>
          <Package className="w-10 h-10 md:w-12 md:h-12 text-primary/30" />
        </div>
      )}

      {showAdd && <SupplierForm onClose={() => setShowAdd(false)} month={month} />}

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>لا توجد مصاريف لهذه الفترة</p>
        </div>
      ) : (
        /* Scrollable table wrapper on mobile */
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground whitespace-nowrap">المورد</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground whitespace-nowrap">الصنف</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground whitespace-nowrap">التاريخ</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground whitespace-nowrap">المبلغ</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  editId === s.id ? (
                    <EditSupplierRow key={s.id} supplier={s} onClose={() => setEditId(null)} month={month} />
                  ) : (
                    <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{s.supplierName}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{s.item}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(s.date).toLocaleDateString("ar-DZ")}</td>
                      <td className="px-4 py-3 font-bold text-primary whitespace-nowrap">{formatDA(s.amount)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => setEditId(s.id)} className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteSupplier({ id: s.id })} className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SupplierForm({ onClose, month }: { onClose: () => void; month: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { mutate: createSupplier } = useCreateSupplier({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
        qc.invalidateQueries({ queryKey: getGetSuppliersMonthlyTotalQueryKey({ month }) });
        toast({ title: "تمت الإضافة" });
        onClose();
      }
    }
  });
  const [supplierName, setSupplierName] = useState("");
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");

  const handleSubmit = () => {
    if (!supplierName || !item || !amount || !date) return;
    createSupplier({ data: { supplierName, item, amount: Number(amount), date, note } });
  };

  return (
    <div className="bg-card border border-primary/20 rounded-xl p-4 md:p-6 space-y-4">
      <h3 className="font-semibold">إضافة مصروف جديد</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input placeholder="اسم المورد" value={supplierName} onChange={(e) => setSupplierName(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        <input placeholder="الصنف / المنتج" value={item} onChange={(e) => setItem(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        <input type="number" placeholder="المبلغ (دج)" value={amount} onChange={(e) => setAmount(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        <input placeholder="ملاحظة (اختياري)" value={note} onChange={(e) => setNote(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary sm:col-span-2" />
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

function EditSupplierRow({ supplier, onClose, month }: { supplier: Supplier; onClose: () => void; month: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { mutate: updateSupplier } = useUpdateSupplier({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
        qc.invalidateQueries({ queryKey: getGetSuppliersMonthlyTotalQueryKey({ month }) });
        toast({ title: "تم التحديث" });
        onClose();
      }
    }
  });
  const [supplierName, setSupplierName] = useState(supplier.supplierName);
  const [item, setItem] = useState(supplier.item);
  const [amount, setAmount] = useState(String(supplier.amount));
  const [date, setDate] = useState(supplier.date);

  return (
    <tr className="border-b border-border/50 bg-primary/5">
      <td className="px-4 py-2">
        <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)}
          className="w-full bg-background border border-primary rounded px-2 py-1 text-sm focus:outline-none" />
      </td>
      <td className="px-4 py-2">
        <input value={item} onChange={(e) => setItem(e.target.value)}
          className="w-full bg-background border border-primary rounded px-2 py-1 text-sm focus:outline-none" />
      </td>
      <td className="px-4 py-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="w-full bg-background border border-primary rounded px-2 py-1 text-sm focus:outline-none" />
      </td>
      <td className="px-4 py-2">
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
          className="w-24 bg-background border border-primary rounded px-2 py-1 text-sm focus:outline-none" />
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => updateSupplier({ id: supplier.id, data: { supplierName, item, amount: Number(amount), date } })}
            className="p-1.5 text-green-400 hover:bg-green-400/10 rounded transition-colors">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
