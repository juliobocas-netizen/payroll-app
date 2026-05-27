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
  Percent,
  Search,
  Plus,
  Edit3,
  Trash2,
  ArrowLeft,
  Settings,
  ListOrdered,
  ToggleLeft,
} from "lucide-react";
import Link from "next/link";
import { t } from "@/lib/translations";
import { useCustomer } from "@/components/Sidebar";
import {
  getIsrBracketsAction,
  createIsrTaxBracketAction,
  updateIsrTaxBracketAction,
  deleteIsrTaxBracketAction,
  getIsrSettingsAction,
  createIsrSettingAction,
  updateIsrSettingAction,
  deleteIsrSettingAction,
} from "@/lib/server-actions";

interface Bracket {
  id: number;
  bracketOrder: number;
  rangeMin: number;
  rangeMax: number | null;
  rate: number;
  fixedAmount: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

interface Setting {
  id: number;
  calculationMethod: string;
  roundingMethod: string;
  applyCssBeforeIsr: boolean;
  applySeguroEducativo: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  metadata: string | null;
}

const bracketDefaultForm = {
  bracketOrder: "",
  rangeMin: "",
  rangeMax: "",
  rate: "",
  fixedAmount: "0",
  effectiveFrom: "",
  effectiveTo: "",
};

const settingDefaultForm = {
  calculationMethod: "annualized",
  roundingMethod: "nearest",
  applyCssBeforeIsr: "true",
  applySeguroEducativo: "true",
  effectiveFrom: "",
  effectiveTo: "",
};

export default function IncomeTaxPage() {
  const { sessionUser } = useCustomer();
  const locale = sessionUser?.languagePref || "es";
  const [activeTab, setActiveTab] = useState<"brackets" | "settings">("brackets");
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [editingSetting, setEditingSetting] = useState<Setting | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [bracketForm, setBracketForm] = useState(bracketDefaultForm);
  const [settingForm, setSettingForm] = useState(settingDefaultForm);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    const [bRes, sRes] = await Promise.all([
      getIsrBracketsAction(),
      getIsrSettingsAction(),
    ]);
    if (bRes.success && bRes.brackets) setBrackets(bRes.brackets as any);
    if (sRes.success && sRes.settings) setSettings(sRes.settings as any);
    setIsLoading(false);
  }

  async function handleSaveBracket() {
    setIsLoading(true);
    const fd = new FormData();
    Object.entries(bracketForm).forEach(([k, v]) => fd.append(k, v));
    const res = editing
      ? await updateIsrTaxBracketAction(editing.id, fd)
      : await createIsrTaxBracketAction(fd);
    if (res.success) { await loadData(); setIsModalOpen(false); setEditing(null); setBracketForm(bracketDefaultForm); }
    else alert(res.error);
    setIsLoading(false);
  }

  async function handleSaveSetting() {
    setIsLoading(true);
    const fd = new FormData();
    Object.entries(settingForm).forEach(([k, v]) => fd.append(k, v));
    const res = editingSetting
      ? await updateIsrSettingAction(editingSetting.id, fd)
      : await createIsrSettingAction(fd);
    if (res.success) { await loadData(); setIsSettingsModalOpen(false); setEditingSetting(null); setSettingForm(settingDefaultForm); }
    else alert(res.error);
    setIsLoading(false);
  }

  async function handleDeleteBracket(id: number) {
    if (!confirm(t(locale, "tables.confirmDelete"))) return;
    const res = await deleteIsrTaxBracketAction(id);
    if (res.success) await loadData();
    else alert(res.error);
  }

  async function handleDeleteSetting(id: number) {
    if (!confirm(t(locale, "tables.confirmDelete"))) return;
    const res = await deleteIsrSettingAction(id);
    if (res.success) await loadData();
    else alert(res.error);
  }

  const filteredBrackets = brackets.filter((b) =>
    toDateStr(b.effectiveFrom).includes(searchQuery) || b.bracketOrder.toString().includes(searchQuery)
  );

  if (!sessionUser) return null;

  return (
    <div className="ml-0 p-8 max-w-[1440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start gap-4 mb-8">
        <Link href="/table-maintenance" className="mt-1 p-2 rounded-lg hover:bg-surface-container-low transition-all">
          <ArrowLeft size={20} className="text-on-surface-variant" />
        </Link>
        <div className="flex-1">
          <h3 className="font-display-lg text-display-lg text-on-surface">{t(locale, "incomeTax.title")}</h3>
          <p className="font-body-base text-body-base text-on-surface-variant mt-1">
            {t(locale, "incomeTax.subtitle")}
          </p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-surface-container-low rounded-lg p-1 w-fit border border-outline">
        <button onClick={() => setActiveTab("brackets")} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "brackets" ? "bg-white text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}>
          <ListOrdered size={16} /> {t(locale, "incomeTax.tabBrackets")}
        </button>
        <button onClick={() => setActiveTab("settings")} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "settings" ? "bg-white text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}>
          <ToggleLeft size={16} /> {t(locale, "incomeTax.tabSettings")}
        </button>
      </div>

      {activeTab === "brackets" && (
        <>
          <div className="bg-white p-4 rounded-lg border border-outline flex flex-wrap gap-4 items-center mb-8 shadow-sm">
            <div className="relative max-w-md w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input type="text" placeholder={t(locale, "incomeTax.searchPlaceholder")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
            </div>
            <button onClick={() => { setEditing(null); setBracketForm(bracketDefaultForm); setIsModalOpen(true); }} className="ml-auto flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg text-white font-medium hover:bg-blue-700 transition-all shadow-sm">
              <Plus size={16} /> <span className="text-sm">{t(locale, "incomeTax.newBracket")}</span>
            </button>
          </div>
          <div className="bg-white border border-outline rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low border-b border-outline text-on-surface-variant font-label-bold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">{t(locale, "incomeTax.colOrder")}</th>
                  <th className="px-6 py-4">{t(locale, "incomeTax.colRangeMin")}</th>
                  <th className="px-6 py-4">{t(locale, "incomeTax.colRangeMax")}</th>
                  <th className="px-6 py-4">{t(locale, "incomeTax.colRate")}</th>
                  <th className="px-6 py-4">{t(locale, "incomeTax.colFixedAmount")}</th>
                  <th className="px-6 py-4">{t(locale, "incomeTax.colEffective")}</th>
                  <th className="px-6 py-4 text-right">{t(locale, "common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-on-surface-variant">{t(locale, "tables.loading")}</td></tr>
                ) : filteredBrackets.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-on-surface-variant">{t(locale, "incomeTax.noBrackets")}</td></tr>
                ) : (
                  filteredBrackets.map((b) => (
                    <tr key={b.id} className="hover:bg-surface-container-low transition-colors group">
                      <td className="px-6 py-4 font-bold text-on-surface">{b.bracketOrder}</td>
                      <td className="px-6 py-4 font-mono text-on-surface">${b.rangeMin.toFixed(2)}</td>
                      <td className="px-6 py-4 font-mono text-on-surface">{b.rangeMax != null ? `$${b.rangeMax.toFixed(2)}` : "∞"}</td>
                      <td className="px-6 py-4 font-mono text-on-surface">{(b.rate * 100).toFixed(0)}%</td>
                      <td className="px-6 py-4 font-mono text-on-surface">${b.fixedAmount.toFixed(2)}</td>
                      <td className="px-6 py-4 text-xs text-on-surface-variant">
                        {toDateStr(b.effectiveFrom)}{b.effectiveTo ? ` → ${toDateStr(b.effectiveTo)}` : ""}

                        <button onClick={() => { setEditing(b); setBracketForm({ bracketOrder: b.bracketOrder.toString(), rangeMin: b.rangeMin.toString(), rangeMax: b.rangeMax?.toString() || "", rate: b.rate.toString(), fixedAmount: b.fixedAmount.toString(), effectiveFrom: toDateStr(b.effectiveFrom), effectiveTo: toDateStr(b.effectiveTo) }); setIsModalOpen(true); }} className="p-1.5 text-on-surface-variant hover:text-secondary opacity-0 group-hover:opacity-100 transition-all"><Edit3 size={18} /></button>
                        <button onClick={() => handleDeleteBracket(b.id)} className="p-1.5 text-on-surface-variant hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "settings" && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setEditingSetting(null); setSettingForm(settingDefaultForm); setIsSettingsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg text-white font-medium hover:bg-blue-700 transition-all shadow-sm">
              <Plus size={16} /> <span className="text-sm">{t(locale, "incomeTax.newSetting")}</span>
            </button>
          </div>
          <div className="bg-white border border-outline rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low border-b border-outline text-on-surface-variant font-label-bold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">{t(locale, "incomeTax.colMethod")}</th>
                  <th className="px-6 py-4">{t(locale, "incomeTax.colRounding")}</th>
                  <th className="px-6 py-4">{t(locale, "incomeTax.colCssBeforeIsr")}</th>
                  <th className="px-6 py-4">{t(locale, "incomeTax.colSeguroEducativo")}</th>
                  <th className="px-6 py-4">{t(locale, "incomeTax.colEffective")}</th>
                  <th className="px-6 py-4 text-right">{t(locale, "common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-on-surface-variant">{t(locale, "tables.loading")}</td></tr>
                ) : settings.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-on-surface-variant">{t(locale, "incomeTax.noSettings")}</td></tr>
                ) : (
                  settings.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-container-low transition-colors group">
                      <td className="px-6 py-4 font-bold text-on-surface">{s.id}</td>
                      <td className="px-6 py-4 text-on-surface">{s.calculationMethod}</td>
                      <td className="px-6 py-4 text-on-surface">{s.roundingMethod}</td>
                      <td className="px-6 py-4">{s.applyCssBeforeIsr ? <span className="text-emerald-600 font-bold">Yes</span> : <span className="text-slate-400">No</span>}</td>
                      <td className="px-6 py-4">{s.applySeguroEducativo ? <span className="text-emerald-600 font-bold">Yes</span> : <span className="text-slate-400">No</span>}</td>
                      <td className="px-6 py-4 text-xs text-on-surface-variant">
                        {toDateStr(s.effectiveFrom)}{s.effectiveTo ? ` → ${toDateStr(s.effectiveTo)}` : ""}

                        <button onClick={() => { setEditingSetting(s); setSettingForm({ calculationMethod: s.calculationMethod, roundingMethod: s.roundingMethod, applyCssBeforeIsr: s.applyCssBeforeIsr.toString(), applySeguroEducativo: s.applySeguroEducativo.toString(), effectiveFrom: toDateStr(s.effectiveFrom), effectiveTo: toDateStr(s.effectiveTo) }); setIsSettingsModalOpen(true); }} className="p-1.5 text-on-surface-variant hover:text-secondary opacity-0 group-hover:opacity-100 transition-all"><Edit3 size={18} /></button>
                        <button onClick={() => handleDeleteSetting(s.id)} className="p-1.5 text-on-surface-variant hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-outline flex justify-between items-center bg-surface-container-low">
              <h4 className="font-bold text-on-surface">{editing ? t(locale, "incomeTax.editBracket") : t(locale, "incomeTax.newBracketTitle")}</h4>
              <button onClick={() => { setIsModalOpen(false); setEditing(null); }} className="text-on-surface-variant hover:text-on-surface"><Plus className="rotate-45" size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "incomeTax.orderLabel")}</label>
                  <input type="number" value={bracketForm.bracketOrder} onChange={(e) => setBracketForm({ ...bracketForm, bracketOrder: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "incomeTax.rateLabel")}</label>
                  <input type="number" step="0.01" value={bracketForm.rate} onChange={(e) => setBracketForm({ ...bracketForm, rate: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "incomeTax.rangeMinLabel")}</label>
                  <input type="number" step="0.01" value={bracketForm.rangeMin} onChange={(e) => setBracketForm({ ...bracketForm, rangeMin: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "incomeTax.rangeMaxLabel")}</label>
                  <input type="number" step="0.01" value={bracketForm.rangeMax} onChange={(e) => setBracketForm({ ...bracketForm, rangeMax: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" placeholder={t(locale, "incomeTax.rangeMaxPlaceholder")} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "incomeTax.fixedAmountLabel")}</label>
                  <input type="number" step="0.01" value={bracketForm.fixedAmount} onChange={(e) => setBracketForm({ ...bracketForm, fixedAmount: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "incomeTax.effectiveFromLabel")}</label>
                  <input type="date" value={bracketForm.effectiveFrom} onChange={(e) => setBracketForm({ ...bracketForm, effectiveFrom: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "incomeTax.effectiveToLabel")}</label>
                  <input type="date" value={bracketForm.effectiveTo} onChange={(e) => setBracketForm({ ...bracketForm, effectiveTo: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline flex justify-end gap-3">
              <button onClick={() => { setIsModalOpen(false); setEditing(null); }} className="px-6 py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-all">{t(locale, "common.cancel")}</button>
              <button onClick={handleSaveBracket} disabled={!bracketForm.bracketOrder || !bracketForm.rangeMin || !bracketForm.rate || !bracketForm.effectiveFrom} className="px-8 py-2 bg-secondary text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50">
                {editing ? t(locale, "tables.update") : t(locale, "tables.create")}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-outline flex justify-between items-center bg-surface-container-low">
              <h4 className="font-bold text-on-surface">{editingSetting ? t(locale, "incomeTax.editSetting") : t(locale, "incomeTax.newSettingTitle")}</h4>
              <button onClick={() => { setIsSettingsModalOpen(false); setEditingSetting(null); }} className="text-on-surface-variant hover:text-on-surface"><Plus className="rotate-45" size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "incomeTax.calcMethodLabel")}</label>
                  <select value={settingForm.calculationMethod} onChange={(e) => setSettingForm({ ...settingForm, calculationMethod: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none bg-white">
                    <option value="annualized">Annualized</option>
                    <option value="periodic">Periodic</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "incomeTax.roundingMethodLabel")}</label>
                  <select value={settingForm.roundingMethod} onChange={(e) => setSettingForm({ ...settingForm, roundingMethod: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none bg-white">
                    <option value="nearest">Nearest</option>
                    <option value="floor">Floor</option>
                    <option value="ceil">Ceil</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "incomeTax.applyCssLabel")}</label>
                  <select value={settingForm.applyCssBeforeIsr} onChange={(e) => setSettingForm({ ...settingForm, applyCssBeforeIsr: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none bg-white">
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "incomeTax.applySeguroLabel")}</label>
                  <select value={settingForm.applySeguroEducativo} onChange={(e) => setSettingForm({ ...settingForm, applySeguroEducativo: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none bg-white">
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "incomeTax.effectiveFromLabel")}</label>
                  <input type="date" value={settingForm.effectiveFrom} onChange={(e) => setSettingForm({ ...settingForm, effectiveFrom: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "incomeTax.effectiveToLabel")}</label>
                  <input type="date" value={settingForm.effectiveTo} onChange={(e) => setSettingForm({ ...settingForm, effectiveTo: e.target.value })} className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline flex justify-end gap-3">
              <button onClick={() => { setIsSettingsModalOpen(false); setEditingSetting(null); }} className="px-6 py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-all">{t(locale, "common.cancel")}</button>
              <button onClick={handleSaveSetting} disabled={!settingForm.effectiveFrom} className="px-8 py-2 bg-secondary text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50">
                {editingSetting ? t(locale, "tables.update") : t(locale, "tables.create")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
