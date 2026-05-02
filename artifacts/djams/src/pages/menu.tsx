import { useState, useEffect, useCallback } from "react";
import {
  useListMenuItems,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
  getListMenuItemsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  UtensilsCrossed, Plus, Trash2, Edit2, Check, X, ToggleLeft,
  ToggleRight, Tag, Image, Loader2, GripVertical,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function api(path: string, opts?: RequestInit) {
  return fetch(`${BASE}/api${path}`, { credentials: "include", ...opts });
}
function apiJson(path: string, opts?: RequestInit) {
  return api(path, { ...opts, headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) } });
}

type MenuCategory = { id: number; name: string; emoji: string; sortOrder: number };
type MenuItem = {
  id: number; name: string; category: string; price: number;
  ingredients: string; imageUrl?: string | null; available: boolean;
};

type Tab = "items" | "categories";

function formatDA(n: number) { return `${n.toLocaleString("ar-DZ")} دج`; }

export default function MenuManager() {
  const [tab, setTab] = useState<Tab>("items");
  const [filterCat, setFilterCat] = useState<string>("");
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [catsLoading, setCatsLoading] = useState(true);

  const fetchCats = useCallback(async () => {
    setCatsLoading(true);
    try {
      const r = await api("/menu-categories");
      setCategories(await r.json());
    } finally { setCatsLoading(false); }
  }, []);
  useEffect(() => { fetchCats(); }, [fetchCats]);

  const params = filterCat ? { category: filterCat } : undefined;
  const { data: items = [], isLoading: itemsLoading } = useListMenuItems(params, {
    query: { queryKey: getListMenuItemsQueryKey(params) }
  });

  const { mutate: deleteItem } = useDeleteMenuItem({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey() });
        toast({ title: "تم حذف الصنف" });
      }
    }
  });

  const { mutate: updateItem } = useUpdateMenuItem({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey() });
        toast({ title: "تم تحديث الصنف" });
        setEditId(null);
      }
    }
  });

  // Group items by category
  const grouped: Record<string, MenuItem[]> = {};
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item as MenuItem);
  }

  const catNames = filterCat ? [filterCat] : Object.keys(grouped);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-primary" />
            إدارة القائمة
          </h1>
          <p className="text-muted-foreground text-sm mt-1">أصناف الطعام، الفئات، والأسعار</p>
        </div>
        {tab === "items" && (
          <button
            onClick={() => { setShowAdd(true); setEditId(null); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> إضافة صنف
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 border border-border rounded-xl p-1">
        {([["items", "الأصناف", UtensilsCrossed], ["categories", "الفئات", Tag]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => { setTab(id); setShowAdd(false); setEditId(null); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium flex-1 justify-center transition-all ${tab === id ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "items" ? (
        <ItemsTab
          categories={categories}
          items={items as MenuItem[]}
          grouped={grouped}
          catNames={catNames}
          filterCat={filterCat}
          setFilterCat={setFilterCat}
          itemsLoading={itemsLoading}
          showAdd={showAdd}
          setShowAdd={setShowAdd}
          editId={editId}
          setEditId={setEditId}
          updateItem={updateItem}
          deleteItem={deleteItem}
          qc={qc}
        />
      ) : (
        <CategoriesTab categories={categories} onRefresh={fetchCats} loading={catsLoading} qc={qc} />
      )}
    </div>
  );
}

/* ── Items Tab ── */
function ItemsTab({ categories, items, grouped, catNames, filterCat, setFilterCat, itemsLoading, showAdd, setShowAdd, editId, setEditId, updateItem, deleteItem, qc }: {
  categories: MenuCategory[];
  items: MenuItem[];
  grouped: Record<string, MenuItem[]>;
  catNames: string[];
  filterCat: string;
  setFilterCat: (s: string) => void;
  itemsLoading: boolean;
  showAdd: boolean;
  setShowAdd: (v: boolean) => void;
  editId: number | null;
  setEditId: (id: number | null) => void;
  updateItem: (args: { id: number; data: any }) => void;
  deleteItem: (args: { id: number }) => void;
  qc: any;
}) {
  const catEmoji = Object.fromEntries(categories.map((c) => [c.name, c.emoji]));

  return (
    <div className="space-y-6">
      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        <button
          onClick={() => setFilterCat("")}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterCat === "" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
        >
          الكل
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilterCat(c.name)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterCat === c.name ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
          >
            <span>{c.emoji}</span> {c.name}
          </button>
        ))}
      </div>

      {showAdd && (
        <MenuItemForm
          categories={categories}
          onClose={() => setShowAdd(false)}
          onSaved={() => qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey() })}
        />
      )}

      {itemsLoading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <UtensilsCrossed className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>لا توجد أصناف بعد — أضف أول صنف!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {catNames.map((catName) => {
            const catItems = grouped[catName] ?? [];
            if (!catItems.length) return null;
            return (
              <div key={catName}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{catEmoji[catName] || "🍽️"}</span>
                  <h2 className="text-lg font-bold">{catName}</h2>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{catItems.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catItems.map((item) =>
                    editId === item.id ? (
                      <EditMenuItemCard
                        key={item.id}
                        item={item}
                        categories={categories}
                        onClose={() => setEditId(null)}
                        onSaved={() => qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey() })}
                      />
                    ) : (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        catEmoji={catEmoji}
                        onEdit={() => setEditId(item.id)}
                        onDelete={() => deleteItem({ id: item.id })}
                        onToggle={() => updateItem({ id: item.id, data: { name: item.name, category: item.category, price: item.price, ingredients: item.ingredients, imageUrl: item.imageUrl, available: !item.available } })}
                      />
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Single item card ── */
function MenuItemCard({ item, catEmoji, onEdit, onDelete, onToggle }: {
  item: MenuItem; catEmoji: Record<string, string>;
  onEdit: () => void; onDelete: () => void; onToggle: () => void;
}) {
  return (
    <div className={`bg-card border rounded-xl overflow-hidden transition-all ${item.available ? "border-border" : "border-border/30 opacity-60"}`}>
      {item.imageUrl ? (
        <div className="h-32 bg-muted overflow-hidden">
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
      ) : (
        <div className="h-24 bg-muted/30 flex items-center justify-center">
          <span className="text-4xl">{catEmoji[item.category] || "🍽️"}</span>
        </div>
      )}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold truncate">{item.name}</h3>
            {item.ingredients && <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{item.ingredients}</p>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={onEdit} className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
            <button onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-primary">{formatDA(item.price)}</span>
          <button onClick={onToggle} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {item.available ? <><ToggleRight className="w-4 h-4 text-green-400" /> متاح</> : <><ToggleLeft className="w-4 h-4" /> غير متاح</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Add form ── */
function MenuItemForm({ categories, onClose, onSaved }: { categories: MenuCategory[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0]?.name ?? "");
  const [price, setPrice] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name || !price || !category) { toast({ title: "يرجى ملء الاسم والفئة والسعر", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/menu`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, price: Number(price), ingredients, imageUrl: imageUrl || null, available: true }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "تمت إضافة الصنف" });
      onSaved(); onClose();
    } catch { toast({ title: "فشل الحفظ", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-card border border-primary/20 rounded-xl p-4 md:p-6 space-y-4">
      <h3 className="font-semibold">إضافة صنف جديد</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input placeholder="اسم الصنف *" value={name} onChange={(e) => setName(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          {categories.map((c) => <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>)}
        </select>
        <input type="number" placeholder="السعر (دج) *" value={price} onChange={(e) => setPrice(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        <input placeholder="المكونات / الوصف" value={ingredients} onChange={(e) => setIngredients(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        <input placeholder="رابط الصورة (URL) — اختياري" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
          className="sm:col-span-2 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>
      {imageUrl && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Image className="w-3.5 h-3.5" />
          <span>معاينة:</span>
          <img src={imageUrl} alt="preview" className="h-12 w-12 object-cover rounded-lg border border-border" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} إضافة
        </button>
        <button onClick={onClose} className="bg-muted text-foreground px-5 py-2 rounded-lg hover:bg-muted/80 transition-colors text-sm">إلغاء</button>
      </div>
    </div>
  );
}

/* ── Edit inline card ── */
function EditMenuItemCard({ item, categories, onClose, onSaved }: { item: MenuItem; categories: MenuCategory[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [price, setPrice] = useState(String(item.price));
  const [ingredients, setIngredients] = useState(item.ingredients);
  const [imageUrl, setImageUrl] = useState(item.imageUrl ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/menu/${item.id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, price: Number(price), ingredients, imageUrl: imageUrl || null, available: item.available }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "تم التحديث" });
      onSaved(); onClose();
    } catch { toast({ title: "فشل الحفظ", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-card border border-primary rounded-xl p-4 space-y-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم"
        className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      <select value={category} onChange={(e) => setCategory(e.target.value)}
        className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm focus:outline-none">
        {categories.map((c) => <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>)}
      </select>
      <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="السعر"
        className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm focus:outline-none" />
      <input value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder="المكونات"
        className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm focus:outline-none" />
      <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="رابط الصورة"
        className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm focus:outline-none" />
      {imageUrl && <img src={imageUrl} alt="preview" className="h-16 w-full object-cover rounded-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} حفظ
        </button>
        <button onClick={onClose} className="flex-1 bg-muted text-foreground py-2 rounded-lg text-sm flex items-center justify-center gap-1">
          <X className="w-4 h-4" /> إلغاء
        </button>
      </div>
    </div>
  );
}

/* ── Categories Tab ── */
function CategoriesTab({ categories, onRefresh, loading, qc }: {
  categories: MenuCategory[]; onRefresh: () => void; loading: boolean; qc: any;
}) {
  const { toast } = useToast();
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("🍽️");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await apiJson("/menu-categories", { method: "POST", body: JSON.stringify({ name: newName.trim(), emoji: newEmoji }) });
      if (!res.ok) throw new Error();
      toast({ title: "تمت إضافة الفئة" });
      setNewName(""); setNewEmoji("🍽️");
      onRefresh();
    } catch { toast({ title: "فشل الحفظ", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (id: number) => {
    try {
      await apiJson(`/menu-categories/${id}`, { method: "PUT", body: JSON.stringify({ name: editName, emoji: editEmoji }) });
      toast({ title: "تم التحديث" });
      setEditId(null); onRefresh();
    } catch { toast({ title: "فشل", variant: "destructive" }); }
  };

  const handleDelete = async (id: number) => {
    try {
      await api(`/menu-categories/${id}`, { method: "DELETE" });
      toast({ title: "تم الحذف" });
      onRefresh();
      qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey() });
    } catch { toast({ title: "فشل الحذف", variant: "destructive" }); }
  };

  const COMMON_EMOJIS = ["🍕", "🍔", "🥙", "🥤", "🍰", "🍟", "🥗", "🍽️", "🍖", "🍜", "🍣", "🧆", "🥩", "🍗", "🫕", "☕", "🧃", "🥐", "🫓", "🌮"];

  return (
    <div className="space-y-6">
      <div className="bg-card border border-primary/20 rounded-xl p-4 md:p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Tag className="w-4 h-4 text-primary" /> إضافة فئة جديدة</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-40 space-y-1">
            <label className="text-xs text-muted-foreground">اسم الفئة</label>
            <input placeholder="مثال: برغر، بيتزا..." value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">الرمز</label>
            <div className="flex items-center gap-2">
              <span className="text-3xl w-10 text-center">{newEmoji}</span>
              <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)}
                className="w-16 bg-background border border-border rounded-lg px-2 py-2 text-sm focus:outline-none text-center" />
            </div>
          </div>
          <button onClick={handleAdd} disabled={saving || !newName.trim()}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 text-sm">
            <Plus className="w-4 h-4" /> إضافة
          </button>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">اختر رمزاً سريعاً:</p>
          <div className="flex flex-wrap gap-2">
            {COMMON_EMOJIS.map((e) => (
              <button key={e} onClick={() => setNewEmoji(e)}
                className={`text-xl w-9 h-9 rounded-lg flex items-center justify-center transition-all ${newEmoji === e ? "bg-primary/20 border border-primary" : "bg-muted hover:bg-muted/80"}`}>
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold">الفئات ({categories.length})</h3>
            <p className="text-xs text-muted-foreground">هذه الفئات تظهر في القائمة العامة</p>
          </div>
          {categories.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground text-sm">لا توجد فئات. ابدأ بإضافة فئة.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20">
                  {editId === cat.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input value={editEmoji} onChange={(e) => setEditEmoji(e.target.value)}
                        className="w-12 bg-background border border-primary rounded px-1 py-1 text-center text-sm focus:outline-none" />
                      <input value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 bg-background border border-primary rounded px-2 py-1 text-sm focus:outline-none" />
                      <button onClick={() => handleUpdate(cat.id)} className="p-1.5 text-green-400 hover:bg-green-400/10 rounded"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditId(null)} className="p-1.5 text-muted-foreground hover:bg-muted rounded"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-muted-foreground/30" />
                        <span className="text-2xl">{cat.emoji}</span>
                        <span className="text-sm font-medium">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditId(cat.id); setEditName(cat.name); setEditEmoji(cat.emoji); }}
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
      )}
    </div>
  );
}
