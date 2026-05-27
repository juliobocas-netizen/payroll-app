"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Search,
  Plus,
  Edit3,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useCustomer } from "@/components/Sidebar";
import {
  getBankAccountsAction,
  createBankAccountAction,
  updateBankAccountAction,
  deleteBankAccountAction,
} from "@/lib/server-actions";
import { t } from "@/lib/translations";

interface Bank {
  id: number;
  bankName: string;
  routingNumber: string;
  address: string;
  contactName: string;
  phone: string;
  email: string;
  currency: string;
  isActive: boolean;
}

const defaultForm = {
  bankName: "",
  routingNumber: "",
  address: "",
  contactName: "",
  phone: "",
  email: "",
  currency: "PAB",
  isActive: "true",
};

export default function BanksPage() {
  const { sessionUser, currentCustomer } = useCustomer();
  const locale = sessionUser?.languagePref || "es";
  const [banks, setBanks] = useState<Bank[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Bank | null>(null);
  const [formData, setFormData] = useState(defaultForm);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { if (currentCustomer) loadData(); }, [currentCustomer]);

  async function loadData() {
    setIsLoading(true);
    const res = await getBankAccountsAction(showInactive);
    if (res.success && res.banks) setBanks(res.banks as any);
    setIsLoading(false);
  }

  useEffect(() => { if (currentCustomer) loadData(); }, [showInactive]);

  async function handleSave() {
    setIsLoading(true);
    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
    const res = editing
      ? await updateBankAccountAction(editing.id, fd)
      : await createBankAccountAction(fd);
    if (res.success) { await loadData(); closeModal(); }
    else alert(res.error);
    setIsLoading(false);
  }

  function openEdit(b: Bank) {
    setEditing(b);
    setFormData({
      bankName: b.bankName,
      routingNumber: b.routingNumber || "",
      address: b.address || "",
      contactName: b.contactName || "",
      phone: b.phone || "",
      email: b.email || "",
      currency: b.currency || "PAB",
      isActive: b.isActive.toString(),
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
    const res = await deleteBankAccountAction(id);
    if (res.success) await loadData();
    else alert(res.error);
  }

  const filtered = banks.filter((b) =>
    b.bankName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!sessionUser) return null;

  return (
    <div className="ml-0 p-8 max-w-[1440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start gap-4 mb-8">
        <Link href="/table-maintenance" className="mt-1 p-2 rounded-lg hover:bg-surface-container-low transition-all"><ArrowLeft size={20} className="text-on-surface-variant" /></Link>
        <div className="flex-1">
          <h3 className="font-display-lg text-display-lg text-on-surface">{t(locale, "banks.title")}</h3>
          <p className="font-body-base text-body-base text-on-surface-variant mt-1">{t(locale, "banks.subtitle")}</p>
        </div>
        <button onClick={() => { setEditing(null); setFormData(defaultForm); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg text-white font-medium hover:bg-blue-700 transition-all shadow-sm">
          <Plus size={16} /> <span className="text-sm">{t(locale, "banks.new")}</span>
        </button>
      </div>

      <div className="bg-white border border-outline rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-outline flex items-center justify-between bg-surface-container-low">
          <div className="relative max-w-md w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder={t(locale, "banks.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded border-outline" />
            {t(locale, "banks.showInactive")}
          </label>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-on-surface-variant">{t(locale, "common.loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant">
            <Building2 size={48} className="mx-auto mb-4 opacity-50" />
            <p>{t(locale, "banks.noRecords")}</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline">
                <th className="px-6 py-4 font-label-bold text-label-bold text-on-surface-variant uppercase">{t(locale, "banks.bankName")}</th>
                <th className="px-6 py-4 font-label-bold text-label-bold text-on-surface-variant uppercase">{t(locale, "banks.routingNumber")}</th>
                <th className="px-6 py-4 font-label-bold text-label-bold text-on-surface-variant uppercase">{t(locale, "banks.contactName")}</th>
                <th className="px-6 py-4 font-label-bold text-label-bold text-on-surface-variant uppercase">{t(locale, "banks.phone")}</th>
                <th className="px-6 py-4 font-label-bold text-label-bold text-on-surface-variant uppercase">{t(locale, "banks.currency")}</th>
                <th className="px-6 py-4 font-label-bold text-label-bold text-on-surface-variant uppercase">{t(locale, "banks.status")}</th>
                <th className="px-6 py-4 font-label-bold text-label-bold text-on-surface-variant uppercase text-right">{t(locale, "common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-4 font-medium text-on-surface">{b.bankName}</td>
                  <td className="px-6 py-4 font-mono text-sm text-on-surface">{b.routingNumber || "—"}</td>
                  <td className="px-6 py-4 text-sm text-on-surface">{b.contactName || "—"}</td>
                  <td className="px-6 py-4 text-sm text-on-surface">{b.phone || "—"}</td>
                  <td className="px-6 py-4 text-sm text-on-surface">{b.currency}</td>
                  <td className="px-6 py-4">
                    {b.isActive ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">{t(locale, "banks.active")}</span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">{t(locale, "banks.inactive")}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(b)} className="p-1 text-on-surface-variant hover:text-secondary transition-all"><Edit3 size={16} /></button>
                    <button onClick={() => handleDelete(b.id)} className="p-1 text-on-surface-variant hover:text-error transition-all ml-1"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-outline flex justify-between items-center bg-surface-container-low">
              <h4 className="font-bold text-on-surface">{editing ? t(locale, "banks.editTitle") : t(locale, "banks.newTitle")}</h4>
              <button onClick={closeModal} className="text-on-surface-variant hover:text-on-surface"><Plus size={24} className="rotate-45" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "banks.bankNameLabel")}</label>
                <input type="text" value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "banks.routingNumberLabel")}</label>
                <input type="text" value={formData.routingNumber} onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value })} className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "banks.addressLabel")}</label>
                <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "banks.contactNameLabel")}</label>
                  <input type="text" value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "banks.phoneLabel")}</label>
                  <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "banks.emailLabel")}</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "banks.currencyLabel")}</label>
                <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none bg-white">
                  <option value="PAB">PAB</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              {editing && (
                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="isActive" checked={formData.isActive === "true"} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked.toString() })} className="w-4 h-4 text-secondary rounded border-outline" />
                  <label htmlFor="isActive" className="text-sm font-medium text-on-surface">{t(locale, "banks.statusLabel")}</label>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-all">{t(locale, "common.cancel")}</button>
              <button onClick={handleSave} className="px-6 py-2 bg-secondary text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-sm">{editing ? t(locale, "common.save") : t(locale, "common.create")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}