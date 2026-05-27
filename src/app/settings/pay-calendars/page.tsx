"use client";

import { useEffect, useState } from "react";
import { 
  Calendar, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  MoreVertical,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Check
} from "lucide-react";
import { useCustomer } from "@/components/Sidebar";
import { getPayCalendarsAction, createPayCalendarAction, updatePayCalendarAction, deletePayCalendarAction } from "@/lib/server-actions";
import { t, formatCurrencyByLocale } from "@/lib/translations";

export default function PayCalendarsPage() {
  const { currentCustomer, sessionUser } = useCustomer();
  const locale = sessionUser?.languagePref || "es";
  const [calendars, setCalendars] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form state
  const [frequency, setFrequency] = useState("monthly");
  const [payFrom, setPayFrom] = useState("");
  const [payTo, setPayTo] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");

  useEffect(() => {
    if (currentCustomer) {
      loadCalendars();
    }
  }, [currentCustomer]);

  async function loadCalendars() {
    if (!currentCustomer) return;
    setIsLoading(true);
    const res = await getPayCalendarsAction(currentCustomer.id);
    if (res.success && res.calendars) {
      setCalendars(res.calendars);
    }
    setIsLoading(false);
  }

  function handleFrequencyChange(freq: string) {
    setFrequency(freq);
    // If bi-monthly, suggest 15th or 30th
    if (freq === "bi-monthly") {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const monthStr = month < 10 ? `0${month}` : month;
      
      if (now.getDate() <= 15) {
        setPayFrom(`${year}-${monthStr}-01`);
        setPayTo(`${year}-${monthStr}-15`);
        setPaymentDate(`${year}-${monthStr}-15`);
      } else {
        setPayFrom(`${year}-${monthStr}-16`);
        // Last day of month
        const lastDay = new Date(year, month, 0).getDate();
        setPayTo(`${year}-${monthStr}-${lastDay}`);
        setPaymentDate(`${year}-${monthStr}-${lastDay}`);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentCustomer) return;
    const formData = new FormData();
    formData.append("customerId", currentCustomer.id.toString());
    formData.append("frequency", frequency);
    formData.append("payFrom", normalizeDate(payFrom));
    formData.append("payTo", normalizeDate(payTo));
    formData.append("paymentDate", normalizeDate(paymentDate));
    formData.append("periodLabel", periodLabel);

    let res;
    if (editingId) {
      res = await updatePayCalendarAction(editingId, formData);
    } else {
      res = await createPayCalendarAction(formData);
    }

    if (res.success) {
      setShowModal(false);
      resetForm();
      loadCalendars();
    } else {
      alert(res.error || "Operation failed");
    }
  }

  function normalizeDate(dateStr: string) {
    const d = new Date(dateStr);
    // Adjust for local timezone offset to keep the intended calendar day
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  }

  function resetForm() {
    setEditingId(null);
    setFrequency("monthly");
    setPayFrom("");
    setPayTo("");
    setPaymentDate("");
    setPeriodLabel("");
  }

  function openEdit(cal: any) {
    setEditingId(cal.id);
    setFrequency(cal.frequency);
    setPayFrom(formatDate(cal.payFrom));
    setPayTo(formatDate(cal.payTo));
    setPaymentDate(formatDate(cal.paymentDate));
    setPeriodLabel(cal.periodLabel || "");
    setShowModal(true);
  }

  async function handleDelete(id: number) {
    if (confirm(t(locale, "tables.confirmDelete"))) {
      const res = await deletePayCalendarAction(id);
      if (res.success) loadCalendars();
    }
  }

  function formatCurrency(amount: number) {
    return formatCurrencyByLocale(amount, locale);
  }

  function formatDate(dateStr: string | Date) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  if (!currentCustomer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant">
        <Calendar size={48} className="mb-4 opacity-20" />
        <p className="font-body-lg">{t(locale, "calendar.selectCustomer")}</p>
      </div>
    );
  }

  return (
    <div className="ml-0 p-8 max-w-[1440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider mb-1">{t(locale, "calendar.breadcrumb")}</p>
          <h2 className="font-headline-md text-headline-md text-on-surface">{t(locale, "calendar.title")}</h2>
          <p className="text-on-surface-variant font-body-sm mt-1">
            {t(locale, "calendar.subtitle")}
          </p>
        </div>
        <div className="flex flex-col items-end space-y-3">
          <div className="text-right">
            <p className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider mb-1 text-xs">{t(locale, "common.activeCustomer")}</p>
            <p className="font-headline-sm text-headline-sm text-on-surface">{currentCustomer.name}</p>
            <p className="text-on-surface-variant font-body-sm">ID: {currentCustomer.id}</p>
          </div>
          <button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center space-x-2 px-6 py-2.5 bg-secondary text-white rounded-xl font-bold text-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <Plus size={18} />
            <span>{t(locale, "calendar.addNew")}</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-outline rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-outline flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center space-x-4">
            <h3 className="font-title-sm text-title-sm text-on-surface">{t(locale, "calendar.activePeriods")}</h3>
            <span className="bg-secondary/10 text-secondary text-[10px] font-bold px-2 py-0.5 rounded-full">
              {t(locale, "calendar.total").replace("{count}", calendars.length.toString())}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                className="pl-10 pr-4 py-2 border border-outline rounded-lg text-sm w-64 focus:ring-2 focus:ring-secondary focus:border-secondary outline-none"
                placeholder={t(locale, "calendar.search")}
                type="text"
              />
            </div>
            <button className="p-2 border border-outline rounded-lg bg-white">
              <Filter size={16} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-bold text-[12px] uppercase tracking-wider">
                <th className="px-6 py-4 border-b border-outline">{t(locale, "calendar.frequency")}</th>
                <th className="px-6 py-4 border-b border-outline">{t(locale, "calendar.from")}</th>
                <th className="px-6 py-4 border-b border-outline">{t(locale, "calendar.toCol")}</th>
                <th className="px-6 py-4 border-b border-outline">{t(locale, "calendar.paymentDateCol")}</th>
                <th className="px-6 py-4 border-b border-outline">{t(locale, "calendar.label")}</th>
                <th className="px-6 py-4 border-b border-outline">{t(locale, "common.status")}</th>
                <th className="px-6 py-4 border-b border-outline text-right">{t(locale, "common.actions")}</th>
              </tr>
            </thead>
            <tbody className="text-on-surface text-sm divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-on-surface-variant italic">{t(locale, "calendar.loading")}</td>
                </tr>
              ) : calendars.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-on-surface-variant italic">{t(locale, "calendar.noData")}</td>
                </tr>
              ) : calendars.map((cal) => (
                <tr key={cal.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-4 font-bold capitalize text-secondary">{cal.frequency}</td>
                  <td className="px-6 py-4 font-data-mono">{formatDate(cal.payFrom)}</td>
                  <td className="px-6 py-4 font-data-mono">{formatDate(cal.payTo)}</td>
                  <td className="px-6 py-4 font-data-mono font-bold">{formatDate(cal.paymentDate)}</td>
                  <td className="px-6 py-4 text-on-surface-variant">{cal.periodLabel || "-"}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cal.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {cal.isActive ? t(locale, "common.active") : t(locale, "common.inactive")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => openEdit(cal)} className="p-2 hover:bg-white border border-transparent hover:border-outline rounded-lg transition-all text-on-surface-variant hover:text-secondary">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(cal.id)} className="p-2 hover:bg-white border border-transparent hover:border-outline rounded-lg transition-all text-on-surface-variant hover:text-error">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-outline flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-on-surface">{editingId ? t(locale, "calendar.editTitle") : t(locale, "calendar.newTitle")}</h3>
                <p className="text-xs text-on-surface-variant">{t(locale, "calendar.formSubtitle")}</p>
              </div>
              <div className="flex flex-col items-end gap-3">
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                  <X size={20} />
                </button>
                <div className="bg-secondary/5 border border-secondary/10 px-4 py-2 rounded-xl text-right">
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-widest leading-none mb-1">{t(locale, "common.activeCustomer")}</p>
                  <p className="text-sm font-bold text-on-surface leading-none">{currentCustomer.name}</p>
                  <p className="text-[10px] text-on-surface-variant mt-1">ID: {currentCustomer.id}</p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{t(locale, "calendar.frequencyLabel")}</label>
                <div className="grid grid-cols-2 gap-2">
                  {["weekly", "biweekly", "monthly", "bi-monthly"].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => handleFrequencyChange(f)}
                      className={`py-2 px-4 rounded-xl text-sm font-bold border transition-all ${
                        frequency === f 
                          ? 'bg-secondary text-white border-secondary shadow-md' 
                          : 'bg-white text-on-surface-variant border-outline hover:border-secondary'
                      }`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{t(locale, "calendar.payFrom")}</label>
                  <input
                    type="date"
                    required
                    value={payFrom}
                    onChange={(e) => setPayFrom(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{t(locale, "calendar.payTo")}</label>
                  <input
                    type="date"
                    required
                    value={payTo}
                    onChange={(e) => setPayTo(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-outline focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{t(locale, "calendar.paymentDateLabel")}</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{t(locale, "calendar.periodLabel")}</label>
                <input
                  type="text"
                  placeholder={t(locale, "calendar.periodLabelPlaceholder")}
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all"
                />
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-on-surface-variant border border-outline hover:bg-surface-container transition-all"
                >
                  {t(locale, "common.cancel")}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl font-bold bg-secondary text-white hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  {editingId ? t(locale, "calendar.updatePeriod") : t(locale, "calendar.createPeriod")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
