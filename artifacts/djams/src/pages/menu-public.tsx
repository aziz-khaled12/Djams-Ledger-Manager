import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Plus, Minus, ChefHat, X, MessageSquare, Check } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function api(path: string, opts?: RequestInit) {
  return fetch(`${BASE}/api${path}`, { credentials: "include", ...opts });
}

type MenuCategory = { id: number; name: string; emoji: string; sortOrder: number };
type MenuItem = {
  id: number; name: string; category: string; price: number;
  ingredients: string; imageUrl?: string | null; available: boolean;
};
type CartItem = {
  menuItemId: number; name: string; price: number; quantity: number; note: string;
};

function formatDA(n: number) { return `${n.toLocaleString("ar-DZ")} دج`; }

export default function MenuPublic() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [tempNote, setTempNote] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    (async () => {
      try {
        const [cats, menuItems] = await Promise.all([
          api("/menu-categories").then((r) => r.json()),
          api("/menu").then((r) => r.json()),
        ]);
        setCategories(cats);
        setItems(menuItems);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Group available items by category
  const availableItems = items.filter((i) => i.available);
  const grouped: Record<string, MenuItem[]> = {};
  for (const item of availableItems) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  // Use category ordering from categories table, fall back to whatever's in items
  const categoriesWithItems = [
    ...categories.filter((c) => grouped[c.name]?.length),
    ...Object.keys(grouped)
      .filter((k) => !categories.find((c) => c.name === k))
      .map((k) => ({ id: 0, name: k, emoji: "🍽️", sortOrder: 999 })),
  ];

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, note: "" }];
    });
  };

  const removeFromCart = (menuItemId: number) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === menuItemId);
      if (existing && existing.quantity > 1) return prev.map((c) => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity - 1 } : c);
      return prev.filter((c) => c.menuItemId !== menuItemId);
    });
  };

  const updateNote = (menuItemId: number, note: string) => {
    setCart((prev) => prev.map((c) => c.menuItemId === menuItemId ? { ...c, note } : c));
  };

  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const scrollToCategory = (catName: string) => {
    setActiveCategory(catName);
    const el = sectionRefs.current[catName];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleOrder = async () => {
    if (!tableNumber.trim()) { toast({ title: "يرجى إدخال رقم الطاولة", variant: "destructive" }); return; }
    if (cart.length === 0) { toast({ title: "السلة فارغة", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const res = await api("/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber: tableNumber.trim(),
          items: cart.map((c) => ({ menuItemId: c.menuItemId, quantity: c.quantity, note: c.note || undefined })),
        }),
      });
      if (!res.ok) throw new Error();
      setCart([]); setTableNumber(""); setShowCart(false);
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 6000);
    } catch {
      toast({ title: "فشل إرسال الطلب، حاول مجدداً", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" dir="rtl">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="font-bold text-amber-400 leading-none">Djam's</h1>
              <p className="text-[10px] text-white/40">food & drink</p>
            </div>
          </div>
          <button
            onClick={() => setShowCart(true)}
            className="relative flex items-center gap-2 bg-amber-500 text-black px-4 py-2 rounded-xl font-bold text-sm hover:bg-amber-400 transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>السلة</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -left-2 w-5 h-5 bg-black text-amber-400 text-xs font-bold rounded-full flex items-center justify-center border border-amber-500">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Category pills */}
        {!loading && categoriesWithItems.length > 0 && (
          <div className="max-w-2xl mx-auto px-4 pb-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {categoriesWithItems.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => scrollToCategory(cat.name)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeCategory === cat.name ? "bg-amber-500 text-black" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Order success */}
      {orderSuccess && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-green-400" />
            </div>
            <p className="font-bold text-green-400 text-lg">تم استلام طلبك!</p>
            <p className="text-sm text-green-400/60 mt-1">سيتم تحضيره في أقرب وقت ممكن 🍳</p>
          </div>
        </div>
      )}

      {/* Menu content */}
      <div className="max-w-2xl mx-auto px-4 pb-24 pt-4 space-y-10">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : availableItems.length === 0 ? (
          <div className="text-center py-20 text-white/30">
            <ChefHat className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>القائمة فارغة حالياً</p>
          </div>
        ) : (
          categoriesWithItems.map((cat) => {
            const catItems = grouped[cat.name] ?? [];
            if (!catItems.length) return null;
            return (
              <div
                key={cat.name}
                ref={(el) => { sectionRefs.current[cat.name] = el; }}
              >
                {/* Category header */}
                <div className="flex items-center gap-3 mb-4 sticky top-[104px] z-10 py-2 bg-[#0a0a0a]/90 backdrop-blur-sm">
                  <span className="text-3xl">{cat.emoji}</span>
                  <div>
                    <h2 className="text-xl font-bold">{cat.name}</h2>
                    <p className="text-xs text-white/40">{catItems.length} صنف</p>
                  </div>
                </div>

                {/* Items grid */}
                <div className="space-y-3">
                  {catItems.map((item) => {
                    const cartItem = cart.find((c) => c.menuItemId === item.id);
                    return (
                      <div
                        key={item.id}
                        className={`bg-white/[0.04] border rounded-2xl overflow-hidden transition-all ${cartItem ? "border-amber-500/30 bg-amber-500/[0.03]" : "border-white/5 hover:border-white/10"}`}
                      >
                        <div className="flex items-center gap-4 p-4">
                          {/* Image or emoji */}
                          {item.imageUrl ? (
                            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
                              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 text-3xl">
                              {cat.emoji}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base">{item.name}</h3>
                            {item.ingredients && <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{item.ingredients}</p>}
                            <p className="text-amber-400 font-bold mt-1.5">{formatDA(item.price)}</p>
                          </div>

                          {/* Add/Qty control */}
                          <div className="flex-shrink-0">
                            {cartItem ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => removeFromCart(item.id)}
                                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="font-bold w-5 text-center">{cartItem.quantity}</span>
                                <button
                                  onClick={() => addToCart(item)}
                                  className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center hover:bg-amber-400 transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5 text-black" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(item)}
                                className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
                              >
                                <Plus className="w-4 h-4 text-black" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline note for cart item */}
                        {cartItem && (
                          <div className="px-4 pb-3 border-t border-white/5 pt-2">
                            {editingNoteId === item.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  autoFocus
                                  value={tempNote}
                                  onChange={(e) => setTempNote(e.target.value)}
                                  placeholder="تعليمات خاصة (مثال: بدون بصل)"
                                  className="flex-1 bg-white/5 border border-amber-400/30 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder-white/30"
                                />
                                <button onClick={() => { updateNote(item.id, tempNote); setEditingNoteId(null); }}
                                  className="p-1.5 bg-amber-500 text-black rounded-lg hover:bg-amber-400"><Check className="w-3 h-3" /></button>
                                <button onClick={() => setEditingNoteId(null)}
                                  className="p-1.5 bg-white/10 text-white/60 rounded-lg hover:bg-white/20"><X className="w-3 h-3" /></button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditingNoteId(item.id); setTempNote(cartItem.note); }}
                                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-amber-400 transition-colors"
                              >
                                <MessageSquare className="w-3 h-3" />
                                {cartItem.note ? <span className="text-amber-400/80 italic">{cartItem.note}</span> : <span>إضافة تعليمات خاصة</span>}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating cart summary */}
      {cartCount > 0 && !showCart && (
        <div className="fixed bottom-6 left-0 right-0 z-30 flex justify-center px-4">
          <button
            onClick={() => setShowCart(true)}
            className="w-full max-w-md bg-amber-500 text-black font-bold py-4 px-6 rounded-2xl flex items-center justify-between shadow-2xl shadow-amber-500/30 hover:bg-amber-400 transition-colors"
          >
            <span className="bg-black/10 px-2 py-0.5 rounded-lg text-sm">{cartCount}</span>
            <span>عرض الطلب</span>
            <span>{formatDA(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCart(false)} />
          <div className="relative bg-[#111] rounded-t-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
              <h2 className="text-xl font-bold">سلة الطلب</h2>
              <button onClick={() => setShowCart(false)} className="p-2 text-white/40 hover:text-white rounded-xl hover:bg-white/5 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
              {cart.length === 0 ? (
                <p className="text-center py-10 text-white/30">السلة فارغة</p>
              ) : (
                cart.map((item) => (
                  <div key={item.menuItemId} className="bg-white/5 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-bold">{item.name}</p>
                        <p className="text-amber-400 text-sm">{formatDA(item.price)} × {item.quantity} = {formatDA(item.price * item.quantity)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => removeFromCart(item.menuItemId)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center font-bold">{item.quantity}</span>
                        <button onClick={() => addToCart({ id: item.menuItemId, name: item.name, price: item.price, category: "", ingredients: "", available: true })} className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center hover:bg-amber-400 transition-colors">
                          <Plus className="w-3 h-3 text-black" />
                        </button>
                      </div>
                    </div>
                    {/* Per-item note */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-white/40 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> تعليمات خاصة</label>
                      <input
                        value={item.note}
                        onChange={(e) => updateNote(item.menuItemId, e.target.value)}
                        placeholder="مثال: بدون بصل، إضافي توابل..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder-white/20"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="px-6 py-4 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg">الإجمالي</span>
                  <span className="text-2xl font-bold text-amber-400">{formatDA(cartTotal)}</span>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-white/60 flex items-center gap-2">
                    رقم الطاولة <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="أدخل رقم الطاولة (مثال: 5)"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 tracking-widest"
                  />
                </div>

                <button
                  onClick={handleOrder}
                  disabled={submitting || !tableNumber.trim()}
                  className="w-full bg-amber-500 text-black font-bold py-4 rounded-2xl hover:bg-amber-400 transition-colors text-lg disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ChefHat className="w-5 h-5" />
                  )}
                  إرسال الطلب إلى المطبخ
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
