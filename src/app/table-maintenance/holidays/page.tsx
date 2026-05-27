"use client";

import { useState, useEffect } from "react";

function toDateStr(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.getUTCFullYear() + "-" +
    String(date.getUTCMonth() + 1).padStart(2, "0") + "-" +
    String(date.getUTCDate()).padStart(2, "0");
}
import {
  Sun,
  Search,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useCustomer } from "@/components/Sidebar";
import {
  getHolidaysAction,
  createHolidayAction,
  updateHolidayAction,
  deleteHolidayAction,
} from "@/lib/server-actions";
import { t, formatDateByLocale } from "@/lib/translations";

interface Holiday {
  id: number;
  country: string;
  holidayDate: string;
  name: string;
  isNational: boolean;
}

const defaultForm = {
  country: "Panama",
  holidayDate: "",
  name: "",
  isNational: "true",
};

export default function HolidaysPage() {
  const { sessionUser } = useCustomer();
  const locale = sessionUser?.languagePref || "es";
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState(defaultForm);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setIsLoading(true);
    const res = await getHolidaysAction();
    if (res.success && res.holidays) setHolidays(res.holidays as any);
    setIsLoading(false);
  }

  async function handleSave() {
    setIsLoading(true);
    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
    const res = editing
      ? await updateHolidayAction(editing.id, fd)
      : await createHolidayAction(fd);
    if (res.success) { await loadData(); closeModal(); }
    else alert(res.error);
    setIsLoading(false);
  }

  function openEdit(h: Holiday) {
    setEditing(h);
    setFormData({
      country: h.country,
      holidayDate: toDateStr(h.holidayDate),
      name: h.name,
      isNational: h.isNational.toString(),
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditing(null);
    setFormData(defaultForm);
  }

  async function handleDelete(id: number) {
    if (!confirm(t(locale, "tables.confirmDelete"))) return;
    const res = await deleteHolidayAction(id);
    if (res.success) await loadData();
    else alert(res.error);
  }

  const filtered = holidays.filter((h) =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.holidayDate.includes(searchQuery)
  );

  if (!sessionUser) return null;

  return (
    <div className="ml-0 p-8 max-w-[1440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start gap-4 mb-8">
        <Link href="/table-maintenance" className="mt-1 p-2 rounded-lg hover:bg-surface-container-low transition-all"><ArrowLeft size={20} className="text-on-surface-variant" /></Link>
        <div className="flex-1">
          <h3 className="font-display-lg text-display-lg text-on-surface">{t(locale, "holidays.title")}</h3>
          <p className="font-body-base text-body-base text-on-surface-variant mt-1">{t(locale, "holidays.subtitle")}</p>
        </div>
        <button onClick={() => { setEditing(null); setFormData(defaultForm); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg text-white font-medium hover:bg-blue-700 transition-all shadow-sm">
          <Plus size={16} /> <span className="text-sm">{t(locale, "holidays.new")}</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg border border-outline flex flex-wrap gap-4 items-center mb-8 shadow-sm">
        <div className="relative max-w-md w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input type="text" placeholder={t(locale, "holidays.searchPlaceholder")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
        </div>
      </div>

      <div className="bg-white border border-outline rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low border-b border-outline text-on-surface-variant font-label-bold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">{t(locale, "common.date")}</th>
              <th className="px-6 py-4">{t(locale, "holidays.name")}</th>
              <th className="px-6 py-4">{t(locale, "holidays.country")}</th>
              <th className="px-6 py-4">{t(locale, "holidays.type")}</th>
              <th className="px-6 py-4 text-right">{t(locale, "common.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {isLoading ? (
              <tr><td colSpan={5} className="p-8 text-center text-on-surface-variant">{t(locale, "tables.loading")}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-on-surface-variant">{t(locale, "holidays.noData")}</td></tr>
            ) : (
              filtered.map((h) => (
                <tr key={h.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
                        <Sun size={20} />
                      </div>
                      <span className="font-mono font-bold text-on-surface">{formatDateByLocale(new Date(h.holidayDate), locale, { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" })}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-on-surface">{h.name}</td>
                  <td className="px-6 py-4 text-on-surface-variant">{h.country}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${h.isNational ? "bg-purple-50 text-purple-700" : "bg-sky-50 text-sky-700"}`}>
                      {h.isNational ? t(locale, "holidays.national") : t(locale, "holidays.company")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(h)} className="p-1.5 text-on-surface-variant hover:text-secondary opacity-0 group-hover:opacity-100 transition-all"><Edit3 size={18} /></button>
                    <button onClick={() => handleDelete(h.id)} className="p-1.5 text-on-surface-variant hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-outline flex justify-between items-center bg-surface-container-low">
              <h4 className="font-bold text-on-surface">{editing ? t(locale, "holidays.editTitle") : t(locale, "holidays.newTitle")}</h4>
              <button onClick={closeModal} className="text-on-surface-variant hover:text-on-surface"><Plus className="rotate-45" size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "holidays.nameLabel")}</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" placeholder={t(locale, "holidays.namePlaceholder")} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "holidays.dateLabel")}</label>
                  <input type="date" value={formData.holidayDate} onChange={(e) => setFormData({ ...formData, holidayDate: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "holidays.countryLabel")}</label>
                  <input type="text" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "holidays.typeLabel")}</label>
                  <select value={formData.isNational} onChange={(e) => setFormData({ ...formData, isNational: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none bg-white">
                    <option value="true">{t(locale, "holidays.national")}</option>
                    <option value="false">{t(locale, "holidays.company")}</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline flex justify-end gap-3">
              <button onClick={closeModal} className="px-6 py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-all">{t(locale, "common.cancel")}</button>
              <button onClick={handleSave} disabled={!formData.name || !formData.holidayDate} className="px-8 py-2 bg-secondary text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50">
                {editing ? t(locale, "tables.update") : t(locale, "tables.create")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
