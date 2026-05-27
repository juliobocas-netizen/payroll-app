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
  Shield,
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
  getStatutoryDeductionsAction,
  createStatutoryDeductionAction,
  updateStatutoryDeductionAction,
  deleteStatutoryDeductionAction,
} from "@/lib/server-actions";

interface Deduction {
  id: number;
  code: string;
  description: string | null;
  rate: number | null;
  capAmount: number | null;
  employeeRate: number | null;
  employerRate: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
}

const defaultForm = {
  code: "",
  description: "",
  rate: "",
  capAmount: "",
  employeeRate: "",
  employerRate: "",
  effectiveFrom: "",
  effectiveTo: "",
  isActive: "true",
};

export default function SocialSecurityPage() {
  const { sessionUser } = useCustomer();
  const locale = sessionUser?.languagePref || "es";
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Deduction | null>(null);
  const [formData, setFormData] = useState(defaultForm);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [showInactive]);

  async function loadData() {
    setIsLoading(true);
    const res = await getStatutoryDeductionsAction(showInactive);
    if (res.success && res.deductions) {
      setDeductions(res.deductions as any);
    }
    setIsLoading(false);
  }

  async function handleSave() {
    setIsLoading(true);
    const fd = new FormData();
    Object.entries(formData).forEach(([key, value]) => fd.append(key, value));

    let res;
    if (editing) {
      res = await updateStatutoryDeductionAction(editing.id, fd);
    } else {
      res = await createStatutoryDeductionAction(fd);
    }

    if (res.success) {
      await loadData();
      closeModal();
    } else {
      alert(res.error || "Failed to save");
    }
    setIsLoading(false);
  }

  function openEdit(d: Deduction) {
    setEditing(d);
    setFormData({
      code: d.code,
      description: d.description || "",
      rate: d.rate?.toString() || "",
      capAmount: d.capAmount?.toString() || "",
      employeeRate: d.employeeRate?.toString() || "",
      employerRate: d.employerRate?.toString() || "",
      effectiveFrom: toDateStr(d.effectiveFrom),
      effectiveTo: toDateStr(d.effectiveTo),
      isActive: d.isActive.toString(),
    });
    setIsModalOpen(true);
  }

  function openNew() {
    setEditing(null);
    setFormData(defaultForm);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditing(null);
    setFormData(defaultForm);
  }

  async function handleDelete(id: number) {
    if (!confirm(t(locale, "tables.confirmDelete"))) return;
    const res = await deleteStatutoryDeductionAction(id);
    if (res.success) await loadData();
    else alert(res.error);
  }

  const filtered = deductions.filter((d) =>
    d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!sessionUser) return null;

  return (
    <div className="ml-0 p-8 max-w-[1440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start gap-4 mb-8">
        <Link href="/table-maintenance" className="mt-1 p-2 rounded-lg hover:bg-surface-container-low transition-all">
          <ArrowLeft size={20} className="text-on-surface-variant" />
        </Link>
        <div className="flex-1">
          <h3 className="font-display-lg text-display-lg text-on-surface">{t(locale, "socialSecurityPage.title")}</h3>
          <p className="font-body-base text-body-base text-on-surface-variant mt-1">
            {t(locale, "socialSecurityPage.subtitle")}
          </p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg text-white font-medium hover:bg-blue-700 transition-all shadow-sm">
          <Plus size={16} />
          <span className="text-sm">{t(locale, "socialSecurityPage.newDeduction")}</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg border border-outline flex flex-wrap gap-4 items-center mb-8 shadow-sm">
        <div className="relative max-w-md w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input type="text" placeholder={t(locale, "socialSecurityPage.searchPlaceholder")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
        </div>
        <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded border-outline" />
          {t(locale, "socialSecurityPage.showInactive")}
        </label>
      </div>

      <div className="bg-white border border-outline rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low border-b border-outline text-on-surface-variant font-label-bold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">{t(locale, "socialSecurityPage.colCode")}</th>
              <th className="px-6 py-4">{t(locale, "socialSecurityPage.colDescription")}</th>
              <th className="px-6 py-4">{t(locale, "socialSecurityPage.colEmployeeRate")}</th>
              <th className="px-6 py-4">{t(locale, "socialSecurityPage.colEmployerRate")}</th>
              <th className="px-6 py-4">{t(locale, "socialSecurityPage.colCapAmount")}</th>
              <th className="px-6 py-4">{t(locale, "socialSecurityPage.colStatus")}</th>
              <th className="px-6 py-4 text-right">{t(locale, "common.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {isLoading ? (
              <tr><td colSpan={7} className="p-8 text-center text-on-surface-variant">{t(locale, "tables.loading")}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-on-surface-variant">{t(locale, "socialSecurityPage.noRecords")}</td></tr>
            ) : (
              filtered.map((d) => (
                <tr key={d.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                        <Shield size={20} />
                      </div>
                      <span className="font-bold text-on-surface font-mono">{d.code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant max-w-xs truncate">{d.description}</td>
                  <td className="px-6 py-4 font-mono text-on-surface">{d.employeeRate != null ? `${(d.employeeRate * 100).toFixed(2)}%` : "-"}</td>
                  <td className="px-6 py-4 font-mono text-on-surface">{d.employerRate != null ? `${(d.employerRate * 100).toFixed(2)}%` : "-"}</td>
                  <td className="px-6 py-4 font-mono text-on-surface">{d.capAmount != null ? `$${d.capAmount.toFixed(2)}` : "-"}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${d.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {d.isActive ? <CheckCircle2 size={14} className="mr-1" /> : <XCircle size={14} className="mr-1" />}
                      {d.isActive ? t(locale, "common.active") : t(locale, "common.inactive")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(d)} className="p-1.5 text-on-surface-variant hover:text-secondary opacity-0 group-hover:opacity-100 transition-all">
                      <Edit3 size={18} />
                    </button>
                    <button onClick={() => handleDelete(d.id)} className="p-1.5 text-on-surface-variant hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={18} />
                    </button>
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
              <h4 className="font-bold text-on-surface">{editing ? t(locale, "socialSecurityPage.editTitle") : t(locale, "socialSecurityPage.newTitle")}</h4>
              <button onClick={closeModal} className="text-on-surface-variant hover:text-on-surface">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "socialSecurityPage.codeLabel")}</label>
                  <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" placeholder={t(locale, "socialSecurityPage.codePlaceholder")} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "socialSecurityPage.rateLabel")}</label>
                  <input type="number" step="0.0001" value={formData.rate} onChange={(e) => setFormData({ ...formData, rate: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" placeholder="0.0975" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "socialSecurityPage.employeeRateLabel")}</label>
                  <input type="number" step="0.0001" value={formData.employeeRate} onChange={(e) => setFormData({ ...formData, employeeRate: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" placeholder="0.0975" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "socialSecurityPage.employerRateLabel")}</label>
                  <input type="number" step="0.0001" value={formData.employerRate} onChange={(e) => setFormData({ ...formData, employerRate: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" placeholder="0.125" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "socialSecurityPage.capAmountLabel")}</label>
                  <input type="number" step="0.01" value={formData.capAmount} onChange={(e) => setFormData({ ...formData, capAmount: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" placeholder="4000" />
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
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "socialSecurityPage.descriptionLabel")}</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" placeholder={t(locale, "socialSecurityPage.descriptionPlaceholder")} />
              </div>
            </div>
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline flex justify-end gap-3">
              <button onClick={closeModal} className="px-6 py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-all">{t(locale, "common.cancel")}</button>
              <button onClick={handleSave} disabled={!formData.code || !formData.effectiveFrom} className="px-8 py-2 bg-secondary text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50">
                {editing ? t(locale, "tables.update") : t(locale, "tables.create")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
