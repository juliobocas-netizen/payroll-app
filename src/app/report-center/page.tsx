"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  Filter,
  Search,
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  DollarSign,
  Users,
  FileSpreadsheet,
  ChevronDown,
  Clock,
} from "lucide-react";
import { useCustomer } from "@/components/Sidebar";
import { getPayrollRunsByCustomerAction } from "@/lib/server-actions";
import { t, formatDateByLocale } from "@/lib/translations";

interface Report {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: any;
  category: string;
}

export default function ReportCenterPage() {
  const { currentCustomer, sessionUser } = useCustomer();
  const locale = sessionUser?.languagePref || "es";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [dataSource, setDataSource] = useState<"run" | "period">("run");
  const [payFrom, setPayFrom] = useState("");
  const [payTo, setPayTo] = useState("");

  useEffect(() => {
    if (currentCustomer) {
      getPayrollRunsByCustomerAction(currentCustomer.id).then(res => {
        if (res.success && res.runs) {
          setPayrollRuns(res.runs);
          if (res.runs.length > 0) setSelectedRunId(res.runs[0].id);
        }
      });
    }
  }, [currentCustomer]);

  const buildHref = (slug: string) => {
    const params = new URLSearchParams();
    if (dataSource === "run" && selectedRunId) {
      params.set("runId", selectedRunId.toString());
    } else if (dataSource === "period" && payFrom && payTo) {
      params.set("payFrom", payFrom);
      params.set("payTo", payTo);
    }
    const qs = params.toString();
    return `/report-center/${slug}${qs ? `?${qs}` : ''}`;
  };

  function getReports(locale: string): Report[] {
    const base: { id: number; slug: string; tKey: string; icon: any; category: string }[] = [
      { id: 1, slug: "social-security", tKey: "socialSecurity", icon: FileText, category: "government" },
      { id: 2, slug: "payroll-variance-analysis", tKey: "varianceAnalysis", icon: BarChart3, category: "analytics" },
      { id: 3, slug: "employee-directory-export", tKey: "directoryExport", icon: FileSpreadsheet, category: "exports" },
      { id: 4, slug: "tax-liability-summary", tKey: "taxLiability", icon: DollarSign, category: "government" },
      { id: 5, slug: "department-cost-analysis", tKey: "deptCost", icon: PieChart, category: "analytics" },
      { id: 6, slug: "termination-report", tKey: "terminationReport", icon: Users, category: "exports" },
      { id: 7, slug: "overtime-analysis", tKey: "overtimeAnalysis", icon: TrendingUp, category: "analytics" },
      { id: 8, slug: "bank-transfer-file", tKey: "bankTransfer", icon: FileText, category: "exports" },
    ];
    return base.map(r => ({
      ...r,
      name: t(locale, `report.${r.tKey}Name`),
      description: t(locale, `report.${r.tKey}Desc`),
    }));
  }

  const reports = getReports(locale);

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || report.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="ml-0 p-8 max-w-[1440px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-surface">{t(locale, "reports.title")}</h2>
          <p className="font-body-base text-on-surface-variant mt-1">
            {t(locale, "reports.subtitle")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-4">
          {currentCustomer ? (
            <div className="bg-secondary/10 border border-secondary/20 px-6 py-3 rounded-2xl text-right">
              <p className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] mb-1">{t(locale, "common.activeCustomer")}</p>
              <h1 className="text-3xl font-black text-secondary tracking-tight">
                {currentCustomer.name}
              </h1>
            </div>
          ) : (
            <div className="bg-slate-100 border border-slate-200 px-6 py-3 rounded-2xl opacity-50 text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">{t(locale, "common.activeCustomer")}</p>
              <h1 className="text-3xl font-black text-slate-400 tracking-tight italic">
                {t(locale, "common.noneSelected")}
              </h1>
            </div>
          )}

          <div className="flex gap-3 items-center">
            {/* Data source toggle */}
            <div className="flex bg-surface-container-low rounded-lg p-1 gap-1">
              <button
                onClick={() => setDataSource("run")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                  dataSource === "run"
                    ? "bg-white text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Calendar size={16} />
                {t(locale, "reports.payrollRun")}
              </button>
              <button
                onClick={() => setDataSource("period")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                  dataSource === "period"
                    ? "bg-white text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Clock size={16} />
                {t(locale, "reports.workPeriod")}
              </button>
            </div>

            {/* Run selector */}
            {dataSource === "run" && (
              <div className="relative">
                <select
                  value={selectedRunId || ""}
                  onChange={(e) => setSelectedRunId(e.target.value ? Number(e.target.value) : null)}
                  className="appearance-none bg-white border border-outline rounded-lg pl-10 pr-10 py-2 text-sm focus:ring-2 focus:ring-secondary outline-none cursor-pointer min-w-[240px]"
                >
                  <option value="">{t(locale, "reports.selectRun")}</option>
                  {payrollRuns.map((run) => (
                    <option key={run.id} value={run.id}>
                      {formatDateByLocale(new Date(run.payFrom), locale, { month: 'long', year: 'numeric' })} - {run.status.toUpperCase()}
                    </option>
                  ))}
                </select>
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
              </div>
            )}

            {/* Date range inputs */}
            {dataSource === "period" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={payFrom}
                  onChange={(e) => setPayFrom(e.target.value)}
                  className="border border-outline rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-secondary outline-none"
                  placeholder={t(locale, "payroll.payFrom")}
                />
                <span className="text-on-surface-variant text-sm">{t(locale, "dashboard.to")}</span>
                <input
                  type="date"
                  value={payTo}
                  onChange={(e) => setPayTo(e.target.value)}
                  className="border border-outline rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-secondary outline-none"
                  placeholder={t(locale, "payroll.payTo")}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-outline rounded-lg p-4 flex flex-wrap gap-4 items-center mb-8">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder={t(locale, "reports.searchReports")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white border border-outline focus:ring-2 focus:ring-secondary outline-none font-body-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              selectedCategory === "all"
                ? "bg-secondary text-white"
                : "border border-outline hover:bg-surface-container"
            }`}
          >
            {t(locale, "reports.all")}
          </button>
          <button
            onClick={() => setSelectedCategory("government")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              selectedCategory === "government"
                ? "bg-secondary text-white"
                : "border border-outline hover:bg-surface-container"
            }`}
          >
            {t(locale, "reports.government")}
          </button>
          <button
            onClick={() => setSelectedCategory("analytics")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              selectedCategory === "analytics"
                ? "bg-secondary text-white"
                : "border border-outline hover:bg-surface-container"
            }`}
          >
            {t(locale, "reports.analytics")}
          </button>
          <button
            onClick={() => setSelectedCategory("exports")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              selectedCategory === "exports"
                ? "bg-secondary text-white"
                : "border border-outline hover:bg-surface-container"
            }`}
          >
            {t(locale, "reports.exports")}
          </button>
        </div>
      </div>

      {/* Validation warning */}
      {dataSource === "run" && !selectedRunId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Calendar size={20} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-900">{t(locale, "reports.selectRunWarning")}</p>
        </div>
      )}
      {dataSource === "period" && (!payFrom || !payTo) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Clock size={20} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-900">{t(locale, "reports.selectPeriodWarning")}</p>
        </div>
      )}

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report) => {
          const Icon = report.icon;
          const isDisabled = dataSource === "run" ? !selectedRunId : !payFrom || !payTo;
          return (
            <Link
              key={report.id}
              href={isDisabled ? "#" : buildHref(report.slug)}
              className={`group bg-white border border-outline rounded-xl p-6 transition-all ${
                isDisabled
                  ? "opacity-40 cursor-not-allowed pointer-events-none"
                  : "hover:border-secondary hover:shadow-md"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center">
                  <Icon size={24} className="text-secondary" />
                </div>
                <span className="text-xs font-label-bold text-on-surface-variant uppercase tracking-wider">
                  {report.category}
                </span>
              </div>
            <h3 className="font-title-sm text-title-sm text-on-surface mb-2">{report.name}</h3>
            <p className="font-body-sm text-on-surface-variant mb-6">{report.description}</p>
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-outline">
              <span className="text-sm font-medium text-secondary">{t(locale, "reports.viewReport")}</span>
              <Download size={18} className="text-on-surface-variant group-hover:text-secondary transition-all" />
            </div>
          </Link>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-6 mt-8">
        <div className="bg-white p-6 rounded-lg border border-outline shadow-sm">
          <p className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider mb-2">{t(locale, "reports.totalReports")}</p>
          <p className="text-3xl font-bold text-on-surface">{reports.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-outline shadow-sm">
          <p className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider mb-2">{t(locale, "reports.totalGovernment")}</p>
          <p className="text-3xl font-bold text-on-surface">
            {reports.filter((r) => r.category === "government").length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-outline shadow-sm">
          <p className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider mb-2">{t(locale, "reports.totalAnalytics")}</p>
          <p className="text-3xl font-bold text-on-surface">
            {reports.filter((r) => r.category === "analytics").length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-outline shadow-sm">
          <p className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider mb-2">{t(locale, "reports.totalExports")}</p>
          <p className="text-3xl font-bold text-on-surface">
            {reports.filter((r) => r.category === "exports").length}
          </p>
        </div>
      </div>
    </div>
  );
}
