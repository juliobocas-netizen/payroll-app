"use client";

import { useState } from "react";
import {
  Users,
  FileText,
  Calculator,
  Download,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Calendar,
  Eye,
  ChevronRight,
} from "lucide-react";
import { useCustomer } from "@/components/Sidebar";
import { t, formatCurrencyByLocale, formatDateByLocale } from "@/lib/translations";

interface TerminationEmployee {
  id: number;
  name: string;
  code: string;
  terminationDate: string;
  hireDate: string;
  baseSalary: number;
  primaAntiguedad: number;
  vacacionesProporcionales: number;
  decimoTercerMes: number;
  indemnizacion: number;
  totalLiquidation: number;
  status: string;
}

export default function TerminationPage() {
  const { currentCustomer, sessionUser } = useCustomer();
  const locale = sessionUser?.languagePref || "es";
  const [terminationData, setTerminationData] = useState<TerminationEmployee[]>([
    {
      id: 1,
      name: "Roberto Castillo",
      code: "EMP-2145",
      terminationDate: "2023-10-15",
      hireDate: "2020-03-10",
      baseSalary: 2500.00,
      primaAntiguedad: 1875.00,
      vacacionesProporcionales: 625.00,
      decimoTercerMes: 208.33,
      indemnizacion: 3750.00,
      totalLiquidation: 6458.33,
      status: "pending",
    },
    {
      id: 2,
      name: "Maria Santos",
      code: "EMP-3201",
      terminationDate: "2023-10-20",
      hireDate: "2019-06-15",
      baseSalary: 3200.00,
      primaAntiguedad: 3200.00,
      vacacionesProporcionales: 853.33,
      decimoTercerMes: 266.67,
      indemnizacion: 6400.00,
      totalLiquidation: 10720.00,
      status: "calculated",
    },
  ]);

  function formatCurrency(amount: number) {
    return formatCurrencyByLocale(amount, locale);
  }

  function formatDate(dateStr: string) {
    return formatDateByLocale(new Date(dateStr), locale, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const totalLiquidations = terminationData.reduce((sum, emp) => sum + emp.totalLiquidation, 0);
  const pendingCount = terminationData.filter(emp => emp.status === 'pending').length;

  return (
    <div className="ml-0 p-8 max-w-[1440px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <nav className="flex items-center space-x-2 text-slate-400 text-xs mb-2 font-label-bold">
            <span>{t(locale, "termination.breadcrumbManagement")}</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-secondary font-bold">{t(locale, "termination.breadcrumbTerminations")}</span>
          </nav>
          <h2 className="font-display-lg text-display-lg text-slate-900">{t(locale, "termination.title")}</h2>
          <p className="text-slate-500 font-body-base mt-1">
            {t(locale, "termination.subtitle")}
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-all">
            <FileText size={16} />
            <span className="text-sm">{t(locale, "termination.generateReport")}</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg font-medium hover:bg-blue-700 transition-all shadow-sm">
            <Calculator size={16} />
            <span className="text-sm">{t(locale, "termination.calculateAll")}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <p className="font-label-bold text-label-bold text-slate-500 uppercase tracking-wider mb-2">{t(locale, "termination.pendingLiquidations")}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-600">{pendingCount}</span>
            <span className="text-xs font-semibold text-slate-400">{t(locale, "termination.requiresReview")}</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <p className="font-label-bold text-label-bold text-slate-500 uppercase tracking-wider mb-2">{t(locale, "termination.totalPayout")}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{formatCurrency(totalLiquidations)}</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <p className="font-label-bold text-label-bold text-slate-500 uppercase tracking-wider mb-2">{t(locale, "termination.thisMonth")}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{terminationData.length}</span>
            <span className="text-xs font-semibold text-slate-400">{t(locale, "termination.terminations")}</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <p className="font-label-bold text-label-bold text-slate-500 uppercase tracking-wider mb-2">{t(locale, "termination.avgSeverance")}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{formatCurrency(totalLiquidations / terminationData.length)}</span>
          </div>
        </div>
      </div>

      {/* Liquidation Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-title-sm text-title-sm text-slate-900">{t(locale, "termination.tableTitle")}</h3>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-secondary focus:border-secondary outline-none font-body-sm"
                placeholder={t(locale, "termination.searchPlaceholder")}
                type="text"
              />
            </div>
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-white">
              <span className="material-symbols-outlined text-slate-600 text-sm">filter_list</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low border-b border-outline">
              <tr>
                <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "termination.colEmployee")}</th>
                <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "termination.colTermDate")}</th>
                <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "termination.colPrimaAntiguedad")}</th>
                <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "termination.colVacaciones")}</th>
                <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "termination.colXiiiMes")}</th>
                <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "termination.colIndemnizacion")}</th>
                <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "termination.colTotal")}</th>
                <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant text-right">{t(locale, "exceptions.status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {terminationData.map((emp) => (
                <tr key={emp.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs">
                        {emp.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-on-surface">{emp.name}</p>
                        <p className="text-xs text-on-surface-variant">{emp.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface">{formatDate(emp.terminationDate)}</td>
                  <td className="px-6 py-4 font-data-mono text-sm">{formatCurrency(emp.primaAntiguedad)}</td>
                  <td className="px-6 py-4 font-data-mono text-sm">{formatCurrency(emp.vacacionesProporcionales)}</td>
                  <td className="px-6 py-4 font-data-mono text-sm text-blue-600">{formatCurrency(emp.decimoTercerMes)}</td>
                  <td className="px-6 py-4 font-data-mono text-sm">{formatCurrency(emp.indemnizacion)}</td>
                  <td className="px-6 py-4 font-bold text-on-surface">{formatCurrency(emp.totalLiquidation)}</td>
                  <td className="px-6 py-4 text-right">
                    {emp.status === 'pending' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                        {t(locale, "termination.pending")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        {t(locale, "termination.calculated")}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <p className="text-sm text-slate-500">{t(locale, "termination.showing").replace("{count}", terminationData.length.toString())}</p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border border-slate-300 rounded text-sm font-medium text-slate-600 hover:bg-white">
              <Download size={14} className="inline mr-1" />
              {t(locale, "termination.exportPdf")}
            </button>
            <button className="px-3 py-1 border border-slate-300 rounded text-sm font-medium text-slate-600 hover:bg-white">
              <Calculator size={14} className="inline mr-1" />
              {t(locale, "termination.recalculateAll")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
