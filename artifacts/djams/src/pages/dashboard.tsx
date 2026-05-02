import { useState } from "react";
import { useGetDashboardSummary } from "@workspace/api-client-react";
import { TrendingUp, TrendingDown, Users, ShoppingBag, DollarSign, Package } from "lucide-react";

function formatDA(amount: number) {
  return `${amount.toLocaleString("ar-DZ")} دج`;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function getAvailableMonths() {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  return months;
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return d.toLocaleDateString("ar-DZ", { month: "long", year: "numeric" });
}

export default function Dashboard() {
  const [month, setMonth] = useState(currentMonth());
  const { data: summary, isLoading } = useGetDashboardSummary({ month });
  const months = getAvailableMonths();

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">لوحة التحكم</h1>
          <p className="text-muted-foreground text-sm mt-1">نظرة شاملة على الأداء المالي</p>
        </div>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {months.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : summary ? (
        <>
          {/* Main KPI Grid — 2 cols on mobile, 4 on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            <StatCard
              title="إجمالي الإيرادات"
              value={formatDA(summary.totalRevenue)}
              icon={TrendingUp}
              color="text-green-400"
              bg="bg-green-400/10"
            />
            <StatCard
              title="مصاريف الموردين"
              value={formatDA(summary.totalSupplierCosts)}
              icon={Package}
              color="text-red-400"
              bg="bg-red-400/10"
            />
            <StatCard
              title="إجمالي السلف"
              value={formatDA(summary.totalAdvances)}
              icon={DollarSign}
              color="text-orange-400"
              bg="bg-orange-400/10"
            />
            <StatCard
              title="عدد الموظفين"
              value={String(summary.totalWorkersCount)}
              icon={Users}
              color="text-blue-400"
              bg="bg-blue-400/10"
            />
          </div>

          {/* Net Profit Card */}
          <div className={`rounded-2xl border p-5 md:p-8 ${summary.netProfit >= 0 ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-muted-foreground text-sm font-medium mb-2">
                  صافي الربح لشهر {monthLabel(month)}
                </p>
                <p className={`text-3xl md:text-5xl font-bold ${summary.netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {formatDA(summary.netProfit)}
                </p>
                <p className="text-muted-foreground text-xs md:text-sm mt-3 leading-relaxed">
                  الإيرادات ({formatDA(summary.totalRevenue)}) - الموردين ({formatDA(summary.totalSupplierCosts)}) - السلف ({formatDA(summary.totalAdvances)})
                </p>
              </div>
              {summary.netProfit >= 0 ? (
                <TrendingUp className="w-12 h-12 md:w-16 md:h-16 text-green-400 opacity-50 flex-shrink-0" />
              ) : (
                <TrendingDown className="w-12 h-12 md:w-16 md:h-16 text-red-400 opacity-50 flex-shrink-0" />
              )}
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">طلبات معلقة</h3>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-primary">{summary.pendingOrdersCount}</p>
              <p className="text-muted-foreground text-sm mt-1">طلب في انتظار التحضير</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">إجمالي المصروفات</h3>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-foreground">
                {formatDA(summary.totalSupplierCosts + summary.totalAdvances)}
              </p>
              <p className="text-muted-foreground text-sm mt-1">موردون + سلف</p>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <p>لا توجد بيانات لهذا الشهر</p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title, value, icon: Icon, color, bg
}: {
  title: string; value: string; icon: React.ElementType; color: string; bg: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-6">
      <div className={`w-9 h-9 md:w-10 md:h-10 ${bg} rounded-lg flex items-center justify-center mb-3 md:mb-4`}>
        <Icon className={`w-4 h-4 md:w-5 md:h-5 ${color}`} />
      </div>
      <p className="text-muted-foreground text-xs md:text-sm">{title}</p>
      <p className="text-lg md:text-2xl font-bold text-foreground mt-1 leading-tight">{value}</p>
    </div>
  );
}
