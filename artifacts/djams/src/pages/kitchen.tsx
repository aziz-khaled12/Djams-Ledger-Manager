import { useState } from "react";
import { useListOrders, useUpdateOrderStatus, getListOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  ChefHat, CheckCircle, Clock, AlertTriangle, RefreshCw,
  MessageSquare, Flame,
} from "lucide-react";

type OrderItem = {
  menuItemId: number;
  name: string;
  quantity: number;
  price: number;
  note?: string | null;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "الآن";
  if (minutes === 1) return "منذ دقيقة";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  return `منذ ${hours} ساعة`;
}

function formatDA(amount: number) {
  return `${amount.toLocaleString("ar-DZ")} دج`;
}

function urgencyLevel(dateStr: string) {
  const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (minutes >= 20) return "critical";
  if (minutes >= 10) return "warning";
  return "normal";
}

export default function Kitchen() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = useState<"active" | "completed">("active");

  const { data: pendingOrders = [], isLoading: loadingPending } = useListOrders(
    { status: "pending" },
    { query: { queryKey: getListOrdersQueryKey({ status: "pending" }), refetchInterval: 8000 } }
  );

  const { data: readyOrders = [] } = useListOrders(
    { status: "ready" },
    { query: { queryKey: getListOrdersQueryKey({ status: "ready" }), refetchInterval: 8000 } }
  );

  const { data: completedOrders = [] } = useListOrders(
    { status: "completed" },
    { query: { queryKey: getListOrdersQueryKey({ status: "completed" }), refetchInterval: 30000 } }
  );

  const { mutate: updateStatus } = useUpdateOrderStatus({
    mutation: {
      onSuccess: (_, vars) => {
        qc.invalidateQueries({ queryKey: getListOrdersQueryKey({ status: "pending" }) });
        qc.invalidateQueries({ queryKey: getListOrdersQueryKey({ status: "ready" }) });
        qc.invalidateQueries({ queryKey: getListOrdersQueryKey({ status: "completed" }) });
        const status = vars.data?.status;
        toast({ title: status === "ready" ? "✅ تم تجهيز الطلب" : "🎉 تم التسليم" });
      }
    }
  });

  const activeCount = pendingOrders.length + readyOrders.length;
  const criticalCount = pendingOrders.filter((o) => urgencyLevel(o.createdAt as unknown as string) === "critical").length;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <ChefHat className="w-7 h-7 text-primary" />
            شاشة المطبخ (KDS)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">يتجدد تلقائيًا كل 8 ثوانٍ</p>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-full text-xs font-bold animate-pulse">
              <Flame className="w-3.5 h-3.5" />
              {criticalCount} طلب متأخر!
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1.5 rounded-full text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            مباشر
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-orange-500/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-orange-400">{pendingOrders.length}</p>
          <p className="text-xs text-muted-foreground mt-1">قيد التحضير</p>
        </div>
        <div className="bg-card border border-green-500/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{readyOrders.length}</p>
          <p className="text-xs text-muted-foreground mt-1">جاهز للتسليم</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{completedOrders.length}</p>
          <p className="text-xs text-muted-foreground mt-1">مكتمل اليوم</p>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 bg-muted/50 border border-border rounded-xl p-1">
        <button onClick={() => setView("active")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium flex-1 justify-center transition-all ${view === "active" ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground"}`}>
          <Clock className="w-4 h-4" />
          الطلبات النشطة
          {activeCount > 0 && <span className="bg-primary/20 text-primary text-xs px-1.5 rounded-full">{activeCount}</span>}
        </button>
        <button onClick={() => setView("completed")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium flex-1 justify-center transition-all ${view === "completed" ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground"}`}>
          <CheckCircle className="w-4 h-4" />
          المكتملة ({completedOrders.length})
        </button>
      </div>

      {view === "active" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Pending orders */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-orange-400" />
              </div>
              <h2 className="font-semibold">قيد التحضير ({pendingOrders.length})</h2>
            </div>

            {loadingPending ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : pendingOrders.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">
                <ChefHat className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">لا توجد طلبات معلقة</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingOrders.map((order) => {
                  const oItems = order.items as OrderItem[];
                  const total = oItems.reduce((s, i) => s + i.price * i.quantity, 0);
                  const dateStr = order.createdAt as unknown as string;
                  const urgency = urgencyLevel(dateStr);
                  return (
                    <div
                      key={order.id}
                      className={`bg-card border rounded-xl p-4 md:p-5 space-y-4 ${urgency === "critical" ? "border-red-500/60 shadow-md shadow-red-500/10" : urgency === "warning" ? "border-orange-500/40" : "border-border"}`}
                    >
                      {/* Order header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {urgency === "critical" && <Flame className="w-5 h-5 text-red-400 animate-pulse flex-shrink-0" />}
                          {urgency === "warning" && <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />}
                          <div>
                            <span className="text-xl md:text-2xl font-bold text-primary">طاولة {order.tableNumber}</span>
                            <span className="text-muted-foreground text-xs mr-2">#{order.id}</span>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1.5 text-sm font-medium px-2 py-1 rounded-lg ${urgency === "critical" ? "bg-red-500/10 text-red-400" : urgency === "warning" ? "bg-orange-500/10 text-orange-400" : "text-muted-foreground"}`}>
                          <Clock className="w-3.5 h-3.5" />
                          {timeAgo(dateStr)}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-2.5">
                        {oItems.map((item, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <span className="w-7 h-7 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                  {item.quantity}
                                </span>
                                <span className="font-medium">{item.name}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">{formatDA(item.price * item.quantity)}</span>
                            </div>
                            {item.note && (
                              <div className="flex items-start gap-1.5 mr-9">
                                <MessageSquare className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                                <span className="text-xs text-amber-400 italic bg-amber-400/10 px-2 py-1 rounded-lg flex-1">
                                  {item.note}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Global order note */}
                      {order.note && (
                        <div className="flex items-start gap-2 bg-orange-400/5 border border-orange-400/20 px-3 py-2 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-orange-300">ملاحظة: {order.note}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-sm text-muted-foreground">
                          الإجمالي: <strong className="text-foreground">{formatDA(total)}</strong>
                        </span>
                        <button
                          onClick={() => updateStatus({ id: order.id, data: { status: "ready" } })}
                          className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-400 transition-colors text-sm shadow-lg shadow-green-500/20"
                        >
                          <CheckCircle className="w-4 h-4" />
                          جاهز للتسليم
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ready orders */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
              <h2 className="font-semibold">جاهز للتسليم ({readyOrders.length})</h2>
            </div>

            {readyOrders.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">لا توجد طلبات جاهزة</p>
              </div>
            ) : (
              <div className="space-y-4">
                {readyOrders.map((order) => {
                  const oItems = order.items as OrderItem[];
                  const total = oItems.reduce((s, i) => s + i.price * i.quantity, 0);
                  return (
                    <div key={order.id} className="bg-card border border-green-500/30 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold text-green-400">طاولة {order.tableNumber}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">#{order.id}</span>
                          <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">جاهز ✓</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {oItems.map((item, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-green-400 font-bold">{item.quantity}×</span>
                              <span>{item.name}</span>
                            </div>
                            {item.note && (
                              <div className="flex items-start gap-1.5 mr-5">
                                <MessageSquare className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                                <span className="text-xs text-amber-400/80 italic">{item.note}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{formatDA(total)}</span>
                        <button
                          onClick={() => updateStatus({ id: order.id, data: { status: "completed" } })}
                          className="flex items-center gap-2 bg-muted text-foreground px-4 py-2 rounded-lg font-medium hover:bg-muted/80 transition-colors text-sm"
                        >
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          تم التسليم
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Completed orders */
        <div>
          {completedOrders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>لا توجد طلبات مكتملة اليوم بعد</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...completedOrders].reverse().map((order) => {
                const oItems = order.items as OrderItem[];
                const total = oItems.reduce((s, i) => s + i.price * i.quantity, 0);
                return (
                  <div key={order.id} className="bg-card border border-border/50 rounded-xl p-4 opacity-70">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold">طاولة {order.tableNumber}</span>
                      <span className="text-xs text-muted-foreground">#{order.id}</span>
                    </div>
                    <div className="space-y-1 mb-3">
                      {oItems.map((item, idx) => (
                        <p key={idx} className="text-xs text-muted-foreground">{item.quantity}× {item.name}</p>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs border-t border-border pt-2">
                      <span className="text-green-400">✓ مكتمل</span>
                      <span className="font-medium">{formatDA(total)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
