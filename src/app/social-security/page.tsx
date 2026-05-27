"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  Filter,
  Eye,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Calculator,
} from "lucide-react";
import { useCustomer } from "@/components/Sidebar";
import { t, formatCurrencyByLocale } from "@/lib/translations";

interface SocialSecurityEntry {
  id: number;
  employeeCode: string;
  employeeName: string;
  sssNumber: string;
  grossSalary: number;
  employerCSS: number;
  employeeCSS: number;
  seguroEducativo: number;
  totalCSS: number;
  status: string;
}

export default function SocialSecurityReportPage() {
  const { currentCustomer, sessionUser } = useCustomer();
  const locale = sessionUser?.languagePref || "es";
  const [reportData, setReportData] = useState<SocialSecurityEntry[]>([
    {
      id: 1,
      employeeCode: "EMP-9021",
      employeeName: "Ricardo Mendez",
      sssNumber: "1234-56789",
      grossSalary: 3320.00,
      employerCSS: 312.45,
      employeeCSS: 312.45,
      seguroEducativo: 18.50,
      totalCSS: 643.40,
      status: "pending",
    },
    {
      id: 2,
      employeeCode: "EMP-8842",
      employeeName: "Sofia Castillo",
      sssNumber: "9876-54321",
      grossSalary: 2550.00,
      employerCSS: 240.19,
      employeeCSS: 240.19,
      seguroEducativo: 14.50,
      totalCSS: 494.88,
      status: "pending",
    },
    {
      id: 3,
      employeeCode: "EMP-7721",
      employeeName: "Juan Alvarado",
      sssNumber: "4567-89012",
      grossSalary: 4750.00,
      employerCSS: 446.25,
      employeeCSS: 446.25,
      seguroEducativo: 28.50,
      totalCSS: 921.00,
      status: "approved",
    },
    {
      id: 4,
      employeeCode: "EMP-4510",
      employeeName: "Elena Vega",
      sssNumber: "7890-12345",
      grossSalary: 1800.00,
      employerCSS: 169.50,
      employeeCSS: 169.50,
      seguroEducativo: 12.00,
      totalCSS: 351.00,
      status: "approved",
    },
    {
      id: 5,
      employeeCode: "EMP-3229",
      employeeName: "Miguel Herrera",
      sssNumber: "3210-98765",
      grossSalary: 1580.00,
      employerCSS: 148.75,
      employeeCSS: 148.75,
      seguroEducativo: 10.50,
      totalCSS: 308.00,
      status: "pending",
    },
  ]);

  const totalGross = reportData.reduce((sum, emp) => sum + emp.grossSalary, 0);
  const totalEmployerCSS = reportData.reduce((sum, emp) => sum + emp.employerCSS, 0);
  const totalEmployeeCSS = reportData.reduce((sum, emp) => sum + emp.employeeCSS, 0);
  const totalSeguro = reportData.reduce((sum, emp) => sum + emp.seguroEducativo, 0);
  const totalCSS = reportData.reduce((sum, emp) => sum + emp.totalCSS, 0);
  const pendingCount = reportData.filter(emp => emp.status === 'pending').length;

  function formatCurrency(amount: number) {
    return formatCurrencyByLocale(amount, locale);
  }

  return (
    <div className="ml-0 p-8 max-w-[1440px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <nav className="flex items-center space-x-2 text-slate-400 text-xs mb-2 font-label-bold">
            <span>{t(locale, "ssReport.breadcrumbReports")}</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-secondary font-bold">{t(locale, "ssReport.breadcrumbSocialSecurity")}</span>
          </nav>
          <h2 className="font-display-lg text-display-lg text-slate-900">{t(locale, "ssReport.title")}</h2>
          <p className="text-slate-500 font-body-base mt-1">
            {t(locale, "ssReport.subtitle").replace("{customer}", currentCustomer?.name || "your company")}
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-all">
            <Download size={16} />
            <span className="text-sm">{t(locale, "ssReport.exportSipe")}</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg font-medium hover:bg-blue-700 transition-all shadow-sm">
            <CheckCircle2 size={16} />
            <span className="text-sm">{t(locale, "ssReport.submitSipe")}</span>
          </button>
        </div>
      </div>

      {/* Alert for Pending Submissions */}
      {pendingCount > 0 && (
        <div className="mb-8 p-4 bg-amber-50 border-l-4 border-amber-400 flex items-start space-x-4">
          <AlertTriangle size={20} className="text-amber-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-900">{t(locale, "ssReport.pendingSubmissions")}</h4>
            <p className="text-sm text-amber-800">
              {t(locale, "ssReport.pendingEntries").replace("{count}", pendingCount.toString())}
            </p>
          </div>
          <button className="text-amber-900 text-sm font-bold underline hover:no-underline">{t(locale, "ssReport.reviewAll")}</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <p className="font-label-bold text-label-bold text-slate-500 uppercase tracking-wider mb-2">{t(locale, "ssReport.totalGross")}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{formatCurrency(totalGross)}</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <p className="font-label-bold text-label-bold text-slate-500 uppercase tracking-wider mb-2">{t(locale, "ssReport.employerCss")}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{formatCurrency(totalEmployerCSS)}</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <p className="font-label-bold text-label-bold text-slate-500 uppercase tracking-wider mb-2">{t(locale, "ssReport.employeeCss")}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{formatCurrency(totalEmployeeCSS)}</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <p className="font-label-bold text-label-bold text-slate-500 uppercase tracking-wider mb-2">{t(locale, "ssReport.totalCss")}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-secondary">{formatCurrency(totalCSS)}</span>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-title-sm text-title-sm text-slate-900">{t(locale, "ssReport.cssContributionsReport")}</h3>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                className="pl-10 pr-4 py-1.5 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none w-64"
                placeholder={t(locale, "ssReport.filterPlaceholder")}
                type="text"
              />
            </div>
            <button className="p-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50">
              <Filter size={16} className="text-slate-600" />
            </button>
            <button className="p-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50">
              <Download size={16} className="text-slate-600" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low border-b border-outline">
              <tr>
                <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "ssReport.colEmployee")}</th>
                <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "ssReport.colSssNumber")}</th>
                <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "ssReport.colGrossSalary")}</th>
                <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "ssReport.colEmployerCss")}</th>
                <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "ssReport.colEmployeeCss")}</th>
                <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "ssReport.colSeguroEducativo")}</th>
                <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "ssReport.colTotalCss")}</th>
                <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant text-right">{t(locale, "exceptions.status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.map((emp) => (
                <tr key={emp.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                        {emp.employeeName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-on-surface text-sm">{emp.employeeName}</p>
                        <p className="text-xs text-on-surface-variant">{emp.employeeCode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-data-mono text-sm text-on-surface">{emp.sssNumber}</td>
                  <td className="px-6 py-4 font-data-mono text-sm text-on-surface">{formatCurrency(emp.grossSalary)}</td>
                  <td className="px-6 py-4 font-data-mono text-sm text-error">{formatCurrency(emp.employerCSS)}</td>
                  <td className="px-6 py-4 font-data-mono text-sm text-error">{formatCurrency(emp.employeeCSS)}</td>
                  <td className="px-6 py-4 font-data-mono text-sm text-error">{formatCurrency(emp.seguroEducativo)}</td>
                  <td className="px-6 py-4 font-bold text-on-surface">{formatCurrency(emp.totalCSS)}</td>
                  <td className="px-6 py-4 text-right">
                    {emp.status === 'pending' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                        {t(locale, "ssReport.pending")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        {t(locale, "ssReport.approved")}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">{t(locale, "ssReport.showing").replace("{count}", reportData.length.toString())}</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">{t(locale, "ssReport.totalContributions")}</span>
              <span className="font-data-mono font-bold text-lg text-secondary">{formatCurrency(totalCSS)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
