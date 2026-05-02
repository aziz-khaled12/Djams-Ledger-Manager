import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Wallet, Plus, Trash2, Edit2, Check, X, AlertTriangle,
  TrendingUp, TrendingDown, Tag, Settings, ShoppingCart, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function api(path: string, opts?: RequestInit) {
  return fetch(`${BASE}/api${path}`, { credentials: "include", ...opts });
}
function apiJson(path: string, opts?: RequestInit) {
  return api(path, { ...opts, headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) } });
}

function formatDA(n: number) {
  return `${n.toLocaleString("ar-DZ")} دج`;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}
function getAvailableMonths() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return d.toISOString().slice(0, 7);
  });
}
function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("ar-DZ", { month: "long", year: "numeric" });
}

const CATEGORY_COLORS = [
  "#f59e0b", "#22c55e", "#ef4444", "#8b5cf6", "#06b6d4",
  "#3b82f6", "#f97316", "#ec4899", "#14b8a6", "#6b7280",
];

type Category = { id: number; name: string; color: string };
type Expense = {
  id: number; categoryId: number; categoryName: string; categoryColor: string;
  itemName: string; quantity: number; unitPrice: number; totalAmount: number;
  date: string; note: string | null;
};
type BudgetAlert = { id: number; categoryId: number; categoryName: string; categoryColor: string; monthlyLimit: number };
type BudgetStatus = BudgetAlert & { spent: number; percentage: number; exceeded: boolean };
type Summary = {
  totalIncome: number; totalExpenses: number; netBalance: number;
  byCategory: { categoryId: number; categoryName: string; categoryColor: string; total: number }[];
  budgetStatus: BudgetStatus[];
};

type Tab = "dashboard" | "log" | "categories" | "budgets";

export default function ExpensesPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [month, setMonth] = useState(currentMonth());
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [catsRes, expsRes, budgetsRes, sumRes] = await Promise.all([
        api("/expense-categories").then((r) => r.json()),
        api(`/expenses?month=${month}`).then((r) => r.json()),
        api("/budget-alerts").then((r) => r.json()),
        api(`/expenses/summary?month=${month}`).then((r) => r.json()),
      ]);
      setCategories(catsRes);
      setExpenses(expsRes);
      setBudgetAlerts(budgetsRes);
      setSummary(sumRes);
    } catch (e) {
      toast({ title: "خطأ في تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "dashboard", label: "لوحة المتابعة", icon: TrendingUp },
    { id: "log", label: "تسجيل مصروف", icon: ShoppingCart },
    { id: "categories", label: "الفئات", icon: Tag },
    { id: "budgets", label: "الميزانية", icon: Settings },
  ];

  const exceededCount = summary?.budgetStatus.filter((b) => b.exceeded).length ?? 0;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" />
            إدارة المصاريف
          </h1>
          <p className="text-muted-foreground text-sm mt-1">تتبع النفقات والميزانية التفصيلية</p>
        </div>
        <div className="flex items-center gap-3">
          {exceededCount > 0 && (
            <div className="flex items-center gap-1.5 bg-destructive/10 border border-destructive/30 text-destructive px-3 py-1.5 rounded-full text-xs font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              {exceededCount} تنبيه ميزانية
            </div>
          )}
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {getAvailableMonths().map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 border border-border rounded-xl p-1 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium flex-shrink-0 transition-all ${
              tab === id
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <>
          {tab === "dashboard" && (
            <DashboardTab summary={summary} month={month} expenses={expenses} />
          )}
          {tab === "log" && (
            <LogTab categories={categories} month={month} expenses={expenses} onRefresh={fetchAll} />
          )}
          {tab === "categories" && (
            <CategoriesTab categories={categories} onRefresh={fetchAll} />
          )}
          {tab === "budgets" && (
            <BudgetsTab categories={categories} budgetAlerts={budgetAlerts} summary={summary} onRefresh={fetchAll} />
          )}
        </>
      )}
    </div>
  );
}

/* ─── Dashboard Tab ─── */
function DashboardTab({ summary, month, expenses }: { summary: Summary | null; month: string; expenses: Expense[] }) {
  if (!summary) return null;

  const incomeVsExpense = [
    { name: "الإيرادات", value: summary.totalIncome, fill: "#22c55e" },
    { name: "المصاريف", value: summary.totalExpenses, fill: "#ef4444" },
  ];

  const pieData = summary.byCategory.filter((c) => c.total > 0);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-card border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs text-muted-foreground">إجمالي الإيرادات</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-green-400">{formatDA(summary.totalIncome)}</p>
        </div>
        <div className="bg-card border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-xs text-muted-foreground">إجمالي المصاريف</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-red-400">{formatDA(summary.totalExpenses)}</p>
        </div>
        <div className={`bg-card border rounded-xl p-4 col-span-2 md:col-span-1 ${summary.netBalance >= 0 ? "border-primary/20" : "border-destructive/20"}`}>
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">صافي الرصيد</span>
          </div>
          <p className={`text-xl md:text-2xl font-bold ${summary.netBalance >= 0 ? "text-primary" : "text-destructive"}`}>
            {formatDA(summary.netBalance)}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar chart */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <h3 className="font-semibold mb-4">الإيرادات مقابل المصاريف</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={incomeVsExpense} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatDA(v)} contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, direction: "rtl" }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {incomeVsExpense.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <h3 className="font-semibold mb-4">توزيع المصاريف بالفئة</h3>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              لا توجد مصاريف هذا الشهر
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="total" nameKey="categoryName" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.categoryColor || CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatDA(v)} contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, direction: "rtl" }} />
                <Legend iconType="circle" iconSize={10} formatter={(v) => <span style={{ fontSize: 11, color: "#9ca3af" }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category Breakdown List */}
      {summary.byCategory.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 md:p-6">
          <h3 className="font-semibold mb-4">تفصيل المصاريف بالفئة</h3>
          <div className="space-y-3">
            {[...summary.byCategory].sort((a, b) => b.total - a.total).map((cat) => {
              const pct = summary.totalExpenses > 0 ? (cat.total / summary.totalExpenses) * 100 : 0;
              return (
                <div key={cat.categoryId}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.categoryColor }} />
                      <span className="font-medium">{cat.categoryName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{pct.toFixed(1)}%</span>
                      <span className="font-bold text-primary">{formatDA(cat.total)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: cat.categoryColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Budget alerts summary */}
      {summary.budgetStatus.some((b) => b.exceeded) && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h3 className="font-semibold text-destructive">تنبيهات تجاوز الميزانية</h3>
          </div>
          {summary.budgetStatus.filter((b) => b.exceeded).map((b) => (
            <div key={b.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: b.categoryColor }} />
                <span>{b.categoryName}</span>
              </div>
              <div className="text-destructive font-bold">
                {formatDA(b.spent)} / {formatDA(b.monthlyLimit)} ({b.percentage}%)
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expense table */}
      {expenses.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">سجل المصاريف — {monthLabel(month)}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-border bg-background/50 text-right text-xs text-muted-foreground">
                  <th className="px-4 py-3 whitespace-nowrap">التاريخ</th>
                  <th className="px-4 py-3 whitespace-nowrap">الصنف</th>
                  <th className="px-4 py-3 whitespace-nowrap">الفئة</th>
                  <th className="px-4 py-3 whitespace-nowrap">الكمية</th>
                  <th className="px-4 py-3 whitespace-nowrap">سعر الوحدة</th>
                  <th className="px-4 py-3 whitespace-nowrap">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {[...expenses].reverse().map((e) => (
                  <tr key={e.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{new Date(e.date).toLocaleDateString("ar-DZ")}</td>
                    <td className="px-4 py-3 text-sm font-medium">{e.itemName}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full" style={{ background: `${e.categoryColor}20`, color: e.categoryColor }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: e.categoryColor }} />
                        {e.categoryName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{e.quantity}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{formatDA(e.unitPrice)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-red-400 whitespace-nowrap">{formatDA(e.totalAmount)}</td>
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

/* ─── Log / Market Tab ─── */
function LogTab({ categories, month, expenses, onRefresh }: {
  categories: Category[]; month: string; expenses: Expense[]; onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id ?? 0);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const totalAmount = (Number(quantity) || 0) * (Number(unitPrice) || 0);

  const handleSubmit = async () => {
    if (!categoryId || !itemName || !quantity || !unitPrice || !date) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await apiJson("/expenses", {
        method: "POST",
        body: JSON.stringify({ categoryId: Number(categoryId), itemName, quantity: Number(quantity), unitPrice: Number(unitPrice), date, note }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "تم تسجيل المصروف" });
      setItemName(""); setQuantity("1"); setUnitPrice(""); setNote("");
      onRefresh();
    } catch {
      toast({ title: "فشل الحفظ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await api(`/expenses/${id}`, { method: "DELETE" });
      toast({ title: "تم الحذف" });
      onRefresh();
    } catch {
      toast({ title: "فشل الحذف", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick-entry form */}
      <div className="bg-card border border-primary/20 rounded-xl p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">سجل مشتريات اليوم</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Date */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">التاريخ</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">الفئة *</label>
            <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Item Name */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">اسم الصنف *</label>
            <input placeholder="مثال: طماطم، دجاج..." value={itemName} onChange={(e) => setItemName(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          {/* Quantity */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">الكمية (كغ / قطعة)</label>
            <input type="number" min="0.01" step="0.25" value={quantity} onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          {/* Unit Price */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">سعر الوحدة (دج) *</label>
            <input type="number" min="0" placeholder="0.00" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          {/* Auto-calculated total */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">الإجمالي (محسوب تلقائياً)</label>
            <div className="w-full bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-sm font-bold text-primary">
              {formatDA(totalAmount)}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
            <label className="text-xs text-muted-foreground">ملاحظة (اختياري)</label>
            <input placeholder="أي ملاحظة إضافية..." value={note} onChange={(e) => setNote(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 text-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          تسجيل المصروف
        </button>
      </div>

      {/* Expense list for the month */}
      {expenses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>لا توجد مصاريف مسجلة هذا الشهر</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold">سجل المصاريف</h3>
            <span className="text-sm text-muted-foreground">{expenses.length} إدخال</span>
          </div>
          <div className="divide-y divide-border/50">
            {[...expenses].reverse().map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: `${e.categoryColor}20`, color: e.categoryColor }}>
                    {e.itemName[0]}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{e.itemName}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.quantity} × {formatDA(e.unitPrice)} · {new Date(e.date).toLocaleDateString("ar-DZ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-400">{formatDA(e.totalAmount)}</p>
                    <p className="text-xs" style={{ color: e.categoryColor }}>{e.categoryName}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(e.id)}
                    disabled={deletingId === e.id}
                    className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors"
                  >
                    {deletingId === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-border flex items-center justify-between bg-background/50">
            <span className="text-sm font-medium">الإجمالي</span>
            <span className="text-lg font-bold text-red-400">{formatDA(expenses.reduce((s, e) => s + e.totalAmount, 0))}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Categories Tab ─── */
function CategoriesTab({ categories, onRefresh }: { categories: Category[]; onRefresh: () => void }) {
  const { toast } = useToast();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#f59e0b");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await apiJson("/expense-categories", { method: "POST", body: JSON.stringify({ name: newName.trim(), color: newColor }) });
      if (!res.ok) throw new Error();
      toast({ title: "تمت إضافة الفئة" });
      setNewName(""); setNewColor("#f59e0b");
      onRefresh();
    } catch {
      toast({ title: "فشل الحفظ", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleUpdate = async (id: number) => {
    try {
      await apiJson(`/expense-categories/${id}`, { method: "PUT", body: JSON.stringify({ name: editName, color: editColor }) });
      toast({ title: "تم التحديث" });
      setEditId(null);
      onRefresh();
    } catch { toast({ title: "فشل", variant: "destructive" }); }
  };

  const handleDelete = async (id: number) => {
    try {
      await api(`/expense-categories/${id}`, { method: "DELETE" });
      toast({ title: "تم الحذف" });
      onRefresh();
    } catch { toast({ title: "فشل الحذف", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="bg-card border border-primary/20 rounded-xl p-4 md:p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Tag className="w-4 h-4 text-primary" /> إضافة فئة جديدة</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-40 space-y-1">
            <label className="text-xs text-muted-foreground">اسم الفئة</label>
            <input placeholder="مثال: خضروات وفواكه" value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">اللون</label>
            <div className="flex items-center gap-2">
              <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-background" />
              <span className="text-xs text-muted-foreground">{newColor}</span>
            </div>
          </div>
          <button onClick={handleAdd} disabled={saving || !newName.trim()}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 text-sm">
            <Plus className="w-4 h-4" /> إضافة
          </button>
        </div>
      </div>

      {/* Category list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">الفئات المحفوظة ({categories.length})</h3>
        </div>
        {categories.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground text-sm">لا توجد فئات. ابدأ بإضافة فئة.</p>
        ) : (
          <div className="divide-y divide-border/50">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20">
                {editId === cat.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)}
                      className="w-8 h-8 rounded border border-border cursor-pointer" />
                    <input value={editName} onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 bg-background border border-primary rounded px-2 py-1 text-sm focus:outline-none" />
                    <button onClick={() => handleUpdate(cat.id)} className="p-1.5 text-green-400 hover:bg-green-400/10 rounded"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditId(null)} className="p-1.5 text-muted-foreground hover:bg-muted rounded"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                      <span className="text-sm font-medium">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditId(cat.id); setEditName(cat.name); setEditColor(cat.color); }}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(cat.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Budgets Tab ─── */
function BudgetsTab({ categories, budgetAlerts, summary, onRefresh }: {
  categories: Category[];
  budgetAlerts: BudgetAlert[];
  summary: Summary | null;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [selectedCat, setSelectedCat] = useState<number>(categories[0]?.id ?? 0);
  const [limitAmount, setLimitAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedCat || !limitAmount) return;
    setSaving(true);
    try {
      const res = await apiJson("/budget-alerts", {
        method: "POST",
        body: JSON.stringify({ categoryId: Number(selectedCat), monthlyLimit: Number(limitAmount) }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "تم حفظ حد الميزانية" });
      setLimitAmount("");
      onRefresh();
    } catch {
      toast({ title: "فشل الحفظ", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await api(`/budget-alerts/${id}`, { method: "DELETE" });
      toast({ title: "تم حذف التنبيه" });
      onRefresh();
    } catch { toast({ title: "فشل", variant: "destructive" }); }
  };

  const statusMap = new Map(summary?.budgetStatus.map((b) => [b.categoryId, b]) ?? []);

  return (
    <div className="space-y-6">
      {/* Set budget */}
      <div className="bg-card border border-primary/20 rounded-xl p-4 md:p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Settings className="w-4 h-4 text-primary" /> تحديد حد الميزانية الشهرية</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-40 space-y-1">
            <label className="text-xs text-muted-foreground">الفئة</label>
            <select value={selectedCat} onChange={(e) => setSelectedCat(Number(e.target.value))}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-40 space-y-1">
            <label className="text-xs text-muted-foreground">الحد الشهري (دج)</label>
            <input type="number" min="0" placeholder="مثال: 50000" value={limitAmount} onChange={(e) => setLimitAmount(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <button onClick={handleSave} disabled={saving || !limitAmount}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            حفظ
          </button>
        </div>
      </div>

      {/* Budget status cards */}
      {budgetAlerts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Settings className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>لم تُحدد أي حدود ميزانية بعد</p>
          <p className="text-xs mt-1">استخدم النموذج أعلاه لتحديد ميزانية لكل فئة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {budgetAlerts.map((b) => {
            const status = statusMap.get(b.categoryId);
            const spent = status?.spent ?? 0;
            const pct = Math.min(status?.percentage ?? 0, 100);
            const exceeded = status?.exceeded ?? false;
            const nearLimit = pct >= 80 && !exceeded;

            return (
              <div key={b.id} className={`bg-card border rounded-xl p-4 space-y-3 ${exceeded ? "border-destructive/40" : nearLimit ? "border-orange-500/40" : "border-border"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: b.categoryColor }} />
                    <span className="font-medium text-sm">{b.categoryName}</span>
                    {exceeded && <AlertTriangle className="w-4 h-4 text-destructive" />}
                    {nearLimit && <AlertTriangle className="w-4 h-4 text-orange-400" />}
                  </div>
                  <button onClick={() => handleDelete(b.id)} className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">الإنفاق الحالي</span>
                    <span className={`font-bold ${exceeded ? "text-destructive" : nearLimit ? "text-orange-400" : "text-foreground"}`}>
                      {formatDA(spent)}
                    </span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: exceeded ? "#ef4444" : nearLimit ? "#f97316" : b.categoryColor,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{pct}% من الحد</span>
                    <span>الحد: {formatDA(b.monthlyLimit)}</span>
                  </div>
                </div>

                {exceeded && (
                  <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                    ⚠️ تجاوزت الميزانية بـ {formatDA(spent - b.monthlyLimit)}
                  </div>
                )}
                {nearLimit && (
                  <div className="text-xs text-orange-400 bg-orange-400/10 rounded-lg px-3 py-2">
                    ⚡ أنت على وشك استنفاد الميزانية
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
