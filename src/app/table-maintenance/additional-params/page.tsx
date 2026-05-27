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
  Sliders,
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
  getPayrollParametersAction,
  createPayrollParameterAction,
  updatePayrollParameterAction,
  deletePayrollParameterAction,
} from "@/lib/server-actions";

interface Param {
  id: number;
  code: string;
  description: string | null;
  value: string;
  dataType: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
}

const defaultForm = {
  code: "",
  description: "",
  value: "",
  dataType: "string",
  effectiveFrom: "",
  effectiveTo: "",
  isActive: "true",
};

export default function AdditionalParamsPage() {
  const { sessionUser } = useCustomer();
  const locale = sessionUser?.languagePref || "es";
  const [params, setParams] = useState<Param[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Param | null>(null);
  const [formData, setFormData] = useState(defaultForm);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, [showInactive]);

  async function loadData() {
    setIsLoading(true);
    const res = await getPayrollParametersAction(showInactive);
    if (res.success && res.params) setParams(res.params as any);
    setIsLoading(false);
  }

  async function handleSave() {
    setIsLoading(true);
    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
    const res = editing
      ? await updatePayrollParameterAction(editing.id, fd)
      : await createPayrollParameterAction(fd);
    if (res.success) { await loadData(); closeModal(); }
    else alert(res.error);
    setIsLoading(false);
  }

  function openEdit(p: Param) {
    setEditing(p);
    setFormData({
      code: p.code,
      description: p.description || "",
      value: p.value,
      dataType: p.dataType,
      effectiveFrom: toDateStr(p.effectiveFrom),
      effectiveTo: toDateStr(p.effectiveTo),
      isActive: p.isActive.toString(),
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
    const res = await deletePayrollParameterAction(id);
    if (res.success) await loadData();
    else alert(res.error);
  }

  const filtered = params.filter((p) =>
    p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!sessionUser) return null;

  return (
    <div className="ml-0 p-8 max-w-[1440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start gap-4 mb-8">
        <Link href="/table-maintenance" className="mt-1 p-2 rounded-lg hover:bg-surface-container-low transition-all">
          <ArrowLeft size={20} className="text-on-surface-variant" />
        </Link>
        <div className="flex-1">
          <h3 className="font-display-lg text-display-lg text-on-surface">{t(locale, "additionalParams.title")}</h3>
          <p className="font-body-base text-body-base text-on-surface-variant mt-1">
            {t(locale, "additionalParams.subtitle")}
          </p>
        </div>
        <button onClick={() => { setEditing(null); setFormData(defaultForm); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg text-white font-medium hover:bg-blue-700 transition-all shadow-sm">
          <Plus size={16} /> <span className="text-sm">{t(locale, "additionalParams.newParam")}</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg border border-outline flex flex-wrap gap-4 items-center mb-8 shadow-sm">
        <div className="relative max-w-md w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input type="text" placeholder={t(locale, "additionalParams.searchPlaceholder")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
        </div>
        <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded border-outline" />
          {t(locale, "additionalParams.showInactive")}
        </label>
      </div>

      <div className="bg-white border border-outline rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low border-b border-outline text-on-surface-variant font-label-bold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">{t(locale, "additionalParams.colCode")}</th>
              <th className="px-6 py-4">{t(locale, "additionalParams.colDescription")}</th>
              <th className="px-6 py-4">{t(locale, "additionalParams.colValue")}</th>
              <th className="px-6 py-4">{t(locale, "additionalParams.colType")}</th>
              <th className="px-6 py-4">{t(locale, "additionalParams.colStatus")}</th>
              <th className="px-6 py-4">{t(locale, "common.effectiveFrom")}</th>
              <th className="px-6 py-4 text-right">{t(locale, "common.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {isLoading ? (
              <tr><td colSpan={7} className="p-8 text-center text-on-surface-variant">{t(locale, "tables.loading")}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-on-surface-variant">{t(locale, "additionalParams.noParams")}</td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100">
                        <Sliders size={20} />
                      </div>
                      <span className="font-bold text-on-surface font-mono">{p.code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant max-w-xs truncate">{p.description}</td>
                  <td className="px-6 py-4 font-mono text-on-surface font-medium">{p.value}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-0.5 bg-surface-container-low rounded text-xs font-medium text-on-surface-variant">
                      {p.dataType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${p.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {p.isActive ? <CheckCircle2 size={14} className="mr-1" /> : <XCircle size={14} className="mr-1" />}
                      {p.isActive ? t(locale, "common.active") : t(locale, "common.inactive")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-on-surface-variant">
                    {toDateStr(p.effectiveFrom)}{p.effectiveTo ? ` → ${toDateStr(p.effectiveTo)}` : ""}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(p)} className="p-1.5 text-on-surface-variant hover:text-secondary opacity-0 group-hover:opacity-100 transition-all"><Edit3 size={18} /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 text-on-surface-variant hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18} /></button>
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
              <h4 className="font-bold text-on-surface">{editing ? t(locale, "additionalParams.editTitle") : t(locale, "additionalParams.newTitle")}</h4>
              <button onClick={closeModal} className="text-on-surface-variant hover:text-on-surface"><Plus className="rotate-45" size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "additionalParams.codeLabel")}</label>
                  <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" placeholder={t(locale, "additionalParams.codePlaceholder")} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "additionalParams.dataTypeLabel")}</label>
                  <select value={formData.dataType} onChange={(e) => setFormData({ ...formData, dataType: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none bg-white">
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="percentage">Percentage</option>
                    <option value="boolean">Boolean</option>
                    <option value="currency">Currency</option>
                  </select>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "additionalParams.valueLabel")}</label>
                  <input type="text" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" placeholder={t(locale, "additionalParams.valuePlaceholder")} />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "additionalParams.descriptionLabel")}</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" placeholder={t(locale, "additionalParams.descriptionPlaceholder")} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "common.effectiveFrom")}</label>
                  <input type="date" value={formData.effectiveFrom} onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "common.effectiveTo")}</label>
                  <input type="date" value={formData.effectiveTo} onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "common.status")}</label>
                  <select value={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none bg-white">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline flex justify-end gap-3">
              <button onClick={closeModal} className="px-6 py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-all">{t(locale, "common.cancel")}</button>
              <button onClick={handleSave} disabled={!formData.code || !formData.value || !formData.effectiveFrom} className="px-8 py-2 bg-secondary text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50">
                {editing ? t(locale, "tables.update") : t(locale, "tables.create")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
