"use client";

import { useState, useEffect } from "react";

function toDateStr(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.getFullYear() + "-" +
    String(date.getMonth() + 1).padStart(2, "0") + "-" +
    String(date.getDate()).padStart(2, "0");
}
import {
  Clock,
  Search,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { t } from "@/lib/translations";
import { useCustomer } from "@/components/Sidebar";
import {
  getOvertimeRulesAction,
  createOvertimeRuleAction,
  updateOvertimeRuleAction,
  deleteOvertimeRuleAction,
  getAllCustomersAction,
} from "@/lib/server-actions";

interface Rule {
  id: number;
  customerId: number | null;
  baseHourDivisor: number;
  multiplierDiurna: number;
  multiplierNocturna: number;
  multiplierMixta: number;
  multiplierRestday: number;
  multiplierHoliday: number;
  stackMultipliers: boolean;
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  customer?: { id: number; name: string } | null;
}

const defaultForm = {
  customerId: "",
  baseHourDivisor: "240",
  multiplierDiurna: "1.25",
  multiplierNocturna: "1.50",
  multiplierMixta: "1.50",
  multiplierRestday: "1.50",
  multiplierHoliday: "2.00",
  stackMultipliers: "true",
  maxHoursPerDay: "3",
  maxHoursPerWeek: "9",
  effectiveFrom: "",
  effectiveTo: "",
  isActive: "true",
};

export default function OvertimePage() {
  const { sessionUser } = useCustomer();
  const locale = sessionUser?.languagePref || "es";
  const [rules, setRules] = useState<Rule[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [formData, setFormData] = useState(defaultForm);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
    getAllCustomersAction().then((r) => {
      if (r.success && r.customers) setCustomers(r.customers);
    });
  }, [showInactive]);

  async function loadData() {
    setIsLoading(true);
    const res = await getOvertimeRulesAction(showInactive);
    if (res.success && res.rules) setRules(res.rules as any);
    setIsLoading(false);
  }

  async function handleSave() {
    setIsLoading(true);
    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
    const res = editing
      ? await updateOvertimeRuleAction(editing.id, fd)
      : await createOvertimeRuleAction(fd);
    if (res.success) { await loadData(); closeModal(); }
    else alert(res.error);
    setIsLoading(false);
  }

  function openEdit(r: Rule) {
    setEditing(r);
    setFormData({
      customerId: r.customerId?.toString() || "",
      baseHourDivisor: r.baseHourDivisor.toString(),
      multiplierDiurna: r.multiplierDiurna.toString(),
      multiplierNocturna: r.multiplierNocturna.toString(),
      multiplierMixta: r.multiplierMixta.toString(),
      multiplierRestday: r.multiplierRestday.toString(),
      multiplierHoliday: r.multiplierHoliday.toString(),
      stackMultipliers: r.stackMultipliers.toString(),
      maxHoursPerDay: r.maxHoursPerDay.toString(),
      maxHoursPerWeek: r.maxHoursPerWeek.toString(),
      effectiveFrom: toDateStr(r.effectiveFrom),
      effectiveTo: toDateStr(r.effectiveTo),
      isActive: r.isActive.toString(),
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
    const res = await deleteOvertimeRuleAction(id);
    if (res.success) await loadData();
    else alert(res.error);
  }

  const filtered = rules.filter((r) =>
    r.id.toString().includes(searchQuery) || (r.customerId?.toString() || "global").includes(searchQuery.toLowerCase())
  );

  if (!sessionUser) return null;

  return (
    <div className="ml-0 p-8 max-w-[1440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start gap-4 mb-8">
        <Link href="/table-maintenance" className="mt-1 p-2 rounded-lg hover:bg-surface-container-low transition-all"><ArrowLeft size={20} className="text-on-surface-variant" /></Link>
        <div className="flex-1">
          <h3 className="font-display-lg text-display-lg text-on-surface">{t(locale, "overtime.title")}</h3>
          <p className="font-body-base text-body-base text-on-surface-variant mt-1">{t(locale, "overtime.subtitle")}</p>
        </div>
        <button onClick={() => { setEditing(null); setFormData(defaultForm); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg text-white font-medium hover:bg-blue-700 transition-all shadow-sm">
          <Plus size={16} /> <span className="text-sm">{t(locale, "overtime.newRule")}</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg border border-outline flex flex-wrap gap-4 items-center mb-8 shadow-sm">
        <div className="relative max-w-md w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input type="text" placeholder={t(locale, "overtime.searchPlaceholder")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
        </div>
        <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded border-outline" /> {t(locale, "overtime.showInactive")}
        </label>
      </div>

      <div className="bg-white border border-outline rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low border-b border-outline text-on-surface-variant font-label-bold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">{t(locale, "overtime.colId")}</th>
              <th className="px-6 py-4">{t(locale, "overtime.colCustomer")}</th>
              <th className="px-6 py-4">{t(locale, "overtime.colDiurna")}</th>
              <th className="px-6 py-4">{t(locale, "overtime.colNocturna")}</th>
              <th className="px-6 py-4">{t(locale, "overtime.colRestDay")}</th>
              <th className="px-6 py-4">{t(locale, "overtime.colHoliday")}</th>
              <th className="px-6 py-4">{t(locale, "overtime.colMaxHours")}</th>
              <th className="px-6 py-4">{t(locale, "common.status")}</th>
              <th className="px-6 py-4 text-right">{t(locale, "common.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {isLoading ? (
              <tr><td colSpan={9} className="p-8 text-center text-on-surface-variant">{t(locale, "tables.loading")}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="p-8 text-center text-on-surface-variant">{t(locale, "overtime.noRules")}</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="px-6 py-4 font-bold text-on-surface">{r.id}</td>
                  <td className="px-6 py-4 text-on-surface-variant">{r.customerId ? customers.find(c => c.id === r.customerId)?.name || `Customer #${r.customerId}` : "Global"}</td>
                  <td className="px-6 py-4 font-mono">{r.multiplierDiurna}x</td>
                  <td className="px-6 py-4 font-mono">{r.multiplierNocturna}x</td>
                  <td className="px-6 py-4 font-mono">{r.multiplierRestday}x</td>
                  <td className="px-6 py-4 font-mono">{r.multiplierHoliday}x</td>
                  <td className="px-6 py-4 font-mono">{r.maxHoursPerDay}/{r.maxHoursPerWeek}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${r.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {r.isActive ? <CheckCircle2 size={14} className="mr-1" /> : <XCircle size={14} className="mr-1" />}
                      {r.isActive ? t(locale, "common.active") : t(locale, "common.inactive")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(r)} className="p-1.5 text-on-surface-variant hover:text-secondary opacity-0 group-hover:opacity-100 transition-all"><Edit3 size={18} /></button>
                    <button onClick={() => handleDelete(r.id)} className="p-1.5 text-on-surface-variant hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-outline flex justify-between items-center bg-surface-container-low">
              <h4 className="font-bold text-on-surface">{editing ? t(locale, "overtime.editTitle") : t(locale, "overtime.newTitle")}</h4>
              <button onClick={closeModal} className="text-on-surface-variant hover:text-on-surface"><Plus className="rotate-45" size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "overtime.customerLabel")}</label>
                  <select value={formData.customerId} onChange={(e) => setFormData({ ...formData, customerId: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none bg-white">
                    <option value="">{t(locale, "overtime.globalCustomer")}</option>
                    {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "overtime.baseHourDivisor")}</label>
                  <input type="number" value={formData.baseHourDivisor} onChange={(e) => setFormData({ ...formData, baseHourDivisor: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "overtime.stackMultipliers")}</label>
                  <select value={formData.stackMultipliers} onChange={(e) => setFormData({ ...formData, stackMultipliers: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none bg-white">
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "overtime.diurnaLabel")}</label>
                  <input type="number" step="0.01" value={formData.multiplierDiurna} onChange={(e) => setFormData({ ...formData, multiplierDiurna: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "overtime.nocturnaLabel")}</label>
                  <input type="number" step="0.01" value={formData.multiplierNocturna} onChange={(e) => setFormData({ ...formData, multiplierNocturna: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "overtime.mixtaLabel")}</label>
                  <input type="number" step="0.01" value={formData.multiplierMixta} onChange={(e) => setFormData({ ...formData, multiplierMixta: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "overtime.restDayLabel")}</label>
                  <input type="number" step="0.01" value={formData.multiplierRestday} onChange={(e) => setFormData({ ...formData, multiplierRestday: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "overtime.holidayLabel")}</label>
                  <input type="number" step="0.01" value={formData.multiplierHoliday} onChange={(e) => setFormData({ ...formData, multiplierHoliday: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "overtime.maxHoursDayLabel")}</label>
                  <input type="number" step="0.5" value={formData.maxHoursPerDay} onChange={(e) => setFormData({ ...formData, maxHoursPerDay: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "overtime.maxHoursWeekLabel")}</label>
                  <input type="number" step="0.5" value={formData.maxHoursPerWeek} onChange={(e) => setFormData({ ...formData, maxHoursPerWeek: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "overtime.effectiveFromLabel")}</label>
                  <input type="date" value={formData.effectiveFrom} onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "overtime.effectiveToLabel")}</label>
                  <input type="date" value={formData.effectiveTo} onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "overtime.statusLabel")}</label>
                  <select value={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none bg-white">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline flex justify-end gap-3">
              <button onClick={closeModal} className="px-6 py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-all">{t(locale, "common.cancel")}</button>
              <button onClick={handleSave} disabled={!formData.effectiveFrom} className="px-8 py-2 bg-secondary text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50">
                {editing ? t(locale, "tables.update") : t(locale, "tables.create")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
