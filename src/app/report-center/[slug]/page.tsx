"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useParams } from "next/navigation";
import {
  ArrowLeft, Download, Calendar, FileText, BarChart3,
  TrendingUp, DollarSign, Users, FileSpreadsheet, AlertTriangle, CheckCircle2,
  Building2, ChevronDown, Clock, Banknote, Printer, X,
  ChevronUp, ChevronsUpDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useCustomer } from "@/components/Sidebar";
import {
  getPayrollRunDetailsAction, getPayrollRunsByCustomerAction,
  getEmployeesAction, getPayrollRunDetailsByDateRangeAction,
  getDepartmentsAction,
} from "@/lib/server-actions";
import { formatDateByLocale, t, formatCurrencyByLocale } from "@/lib/translations";

function formatDate(d: string | Date, locale: string) {
  return formatDateByLocale(new Date(d), locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ReportDetailPage() {
  const { currentCustomer, sessionUser } = useCustomer();
  const locale = sessionUser?.languagePref || "es";
  const searchParams = useSearchParams();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const runIdParam = searchParams.get("runId");
  const payFromParam = searchParams.get("payFrom");
  const payToParam = searchParams.get("payTo");

  const [payrollRun, setPayrollRun] = useState<any>(null);
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [previousRun, setPreviousRun] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dataSource, setDataSource] = useState<"run" | "period">(runIdParam ? "run" : "period");
  const [selectedRunId, setSelectedRunId] = useState<string>(runIdParam || "");
  const [payFrom, setPayFrom] = useState(payFromParam || "");
  const [payTo, setPayTo] = useState(payToParam || "");

  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterPayType, setFilterPayType] = useState("");

  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function getReportDef(slug: string, locale: string) {
    const defs: Record<string, { tKey: string; icon: any; category: string }> = {
      "social-security": { tKey: "socialSecurity", icon: FileText, category: "Government" },
      "payroll-variance-analysis": { tKey: "varianceAnalysis", icon: BarChart3, category: "Analytics" },
      "employee-directory-export": { tKey: "directoryExport", icon: FileSpreadsheet, category: "Exports" },
      "tax-liability-summary": { tKey: "taxLiability", icon: DollarSign, category: "Government" },
      "department-cost-analysis": { tKey: "deptCost", icon: Building2, category: "Analytics" },
      "termination-report": { tKey: "terminationReport", icon: Users, category: "Exports" },
      "overtime-analysis": { tKey: "overtimeAnalysis", icon: TrendingUp, category: "Analytics" },
      "bank-transfer-file": { tKey: "bankTransfer", icon: Banknote, category: "Exports" },
    };
    const def = defs[slug];
    if (!def) return null;
    return {
      icon: def.icon,
      category: def.category,
      name: t(locale, `report.${def.tKey}Name`),
      description: t(locale, `report.${def.tKey}Desc`),
    };
  }

  const report = getReportDef(slug, locale);
  const Icon = report?.icon || FileText;

  useEffect(() => {
    if (currentCustomer) {
      getPayrollRunsByCustomerAction(currentCustomer.id).then(res => {
        if (res.success && res.runs) setPayrollRuns(res.runs);
      });
      getEmployeesAction(currentCustomer.id).then(res => {
        if (res.success && res.employees) setEmployees(res.employees);
      });
      getDepartmentsAction(currentCustomer.id).then(res => {
        if (res.success && res.departments) setDepartments(res.departments);
      });
    }
  }, [currentCustomer]);

  useEffect(() => {
    if (currentCustomer && dataSource === "period" && payFrom && payTo) {
      setIsLoading(true);
      setError(null);
      getPayrollRunDetailsByDateRangeAction(currentCustomer.id, new Date(payFrom), new Date(payTo)).then(res => {
        if (res.success && res.payrollRun) {
          setPayrollRun(res.payrollRun);
          setGenerated(true);
        } else {
          setPayrollRun(null);
          setError(res.error || t(locale, "reportDetail.noDataAvailable"));
          setGenerated(false);
        }
        setIsLoading(false);
      });
    }
  }, [dataSource, payFrom, payTo, currentCustomer]);

  useEffect(() => {
    if (dataSource === "run" && selectedRunId) {
      setIsLoading(true);
      setError(null);
      const rid = Number(selectedRunId);
      getPayrollRunDetailsAction(rid).then(res => {
        if (res.success && res.payrollRun) {
          setPayrollRun(res.payrollRun);
          setGenerated(true);
          if (slug === "payroll-variance-analysis") {
            loadPreviousRun(rid);
          }
        } else {
          setPayrollRun(null);
          setError(res.error || t(locale, "reportDetail.noDataAvailable"));
          setGenerated(false);
        }
        setIsLoading(false);
      });
    }
  }, [dataSource, selectedRunId]);

  async function loadPreviousRun(currentRunId: number) {
    if (!currentCustomer) return;
    const runs = payrollRuns.length > 0 ? payrollRuns : await getPayrollRunsByCustomerAction(currentCustomer.id).then(r => r.runs || []);
    const sorted = [...runs].sort((a, b) => new Date(b.payFrom).getTime() - new Date(a.payFrom).getTime());
    const idx = sorted.findIndex(r => r.id === currentRunId);
    if (idx >= 0 && idx < sorted.length - 1) {
      const prev = await getPayrollRunDetailsAction(sorted[idx + 1].id);
      if (prev.success && prev.payrollRun) setPreviousRun(prev.payrollRun);
    }
  }

  function handleSort(column: string) {
    if (sortBy === column) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  }

  function getSortIndicator(column: string) {
    if (sortBy !== column) return <ChevronsUpDown size={14} className="inline opacity-40" />;
    return sortDir === "asc" ? <ChevronUp size={14} className="inline" /> : <ChevronDown size={14} className="inline" />;
  }

  function sortData<T>(data: T[], key: (item: T) => number): T[] {
    if (!sortBy) return data;
    return [...data].sort((a, b) => {
      const va = key(a);
      const vb = key(b);
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }

  function applyFilters(data: any[]) {
    let filtered = [...data];
    if (filterEmployee) {
      filtered = filtered.filter(d => d.id === Number(filterEmployee) || d.employeeId === Number(filterEmployee));
    }
    if (filterDepartment) {
      filtered = filtered.filter(d => {
        const e = payrollRun?.earnings?.find((ee: any) => ee.employeeId === (d.id || d.employeeId));
        return e?.employee?.departmentId === Number(filterDepartment);
      });
    }
    if (filterPayType) {
      filtered = filtered.filter(d => {
        const e = payrollRun?.earnings?.find((ee: any) => ee.employeeId === (d.id || d.employeeId));
        return e?.employee?.paymentMethod === filterPayType;
      });
    }
    return filtered;
  }

  function exportToExcel() {
    if (!report) return;
    const rows = buildExportRows();
    if (rows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, report.name);
    XLSX.writeFile(wb, `${report.name.replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
  }

  function buildExportRows(): Record<string, any>[] {
    const pData = payrollRun?.payrollData || [];
    const earnings = payrollRun?.earnings || [];
    const filtered = applyFilters(pData);
    switch (slug) {
      case "social-security":
        return filtered.map((emp: any) => ({
          Employee: emp.employeeName,
          Code: emp.employeeCode,
          SSS: emp.sssNumber || "",
          Gross: emp.grossPay,
          CSS_9_75: emp.css,
          Seguro_1_5: emp.seguro,
          Employer_CSS: Math.min(emp.grossPay, 4000) * 0.0975 * 1.282,
          Total: emp.css + emp.seguro + Math.min(emp.grossPay, 4000) * 0.0975 * 1.282,
        }));
      case "tax-liability-summary":
        return filtered.map((emp: any) => ({
          Employee: emp.employeeName,
          Gross: emp.grossPay,
          CSS: emp.css,
          Seguro: emp.seguro,
          ISR: emp.isr,
          Total_Tax: emp.css + emp.seguro + emp.isr,
        }));
      case "payroll-variance-analysis":
        const prevData = previousRun?.payrollData || [];
        return filtered.map((emp: any) => {
          const prev = prevData.find((p: any) => p.id === emp.id);
          return {
            Employee: emp.employeeName,
            Current_Gross: emp.grossPay,
            Previous_Gross: prev?.grossPay || 0,
            Variance: prev ? emp.grossPay - prev.grossPay : 0,
            Variance_Pct: prev && prev.grossPay > 0 ? `${((emp.grossPay - prev.grossPay) / prev.grossPay * 100).toFixed(1)}%` : "N/A",
            Current_Net: emp.netPay,
            Previous_Net: prev?.netPay || 0,
          };
        });
      case "employee-directory-export":
        return employees.map((emp: any) => ({
          Code: emp.employeeCode,
          Name: `${emp.firstName} ${emp.lastName}`,
          ID: emp.identificationNumber || "",
          SSS: emp.sssNumber || "",
          Department: emp.department?.name || "",
          Position: emp.position?.title || "",
          Salary: emp.baseSalary,
          Method: emp.paymentMethod,
        }));
      case "department-cost-analysis":
        const deptMap = new Map<string, { gross: number; ded: number; net: number; count: number }>();
        (applyFilters(pData)).forEach((emp: any) => {
          const e = earnings.find((ee: any) => ee.employeeId === emp.id);
          const deptName = e?.employee?.department?.name || "Unassigned";
          const entry = deptMap.get(deptName) || { gross: 0, ded: 0, net: 0, count: 0 };
          entry.gross += emp.grossPay;
          entry.ded += emp.totalDeductions;
          entry.net += emp.netPay;
          entry.count++;
          deptMap.set(deptName, entry);
        });
        return Array.from(deptMap.entries()).map(([name, d]) => ({
          Department: name,
          Employees: d.count,
          Gross: d.gross,
          Deductions: d.ded,
          Net: d.net,
          AvgPerEmployee: d.net / d.count,
        }));
      case "termination-report":
        return employees.filter((e: any) => e.isActive).map((emp: any) => ({
          Employee: `${emp.firstName} ${emp.lastName}`,
          Code: emp.employeeCode,
          Salary: emp.baseSalary,
          Method: emp.paymentMethod,
          Status: "Active",
        }));
      case "overtime-analysis":
        return filtered.map((emp: any) => {
          const empEarnings = earnings.filter((e: any) => e.employeeId === emp.id);
          const otAmt = empEarnings.filter((e: any) => e.earningCode?.includes('HORA_EXTRA') || e.earningCode?.includes('SALARIO_EXTRA')).reduce((s: number, e: any) => s + e.totalAmount, 0);
          const holAmt = empEarnings.filter((e: any) => e.earningCode?.includes('FERIADO')).reduce((s: number, e: any) => s + e.totalAmount, 0);
          const restAmt = empEarnings.filter((e: any) => e.earningCode?.includes('DESCANSO')).reduce((s: number, e: any) => s + e.totalAmount, 0);
          return {
            Employee: emp.employeeName,
            OT_Hours: empEarnings.filter((e: any) => e.earningCode?.includes('HORA_EXTRA') || e.earningCode?.includes('SALARIO_EXTRA')).reduce((s: number, e: any) => s + (e.quantity || 0), 0),
            OT_Amount: otAmt,
            Holiday_Amount: holAmt,
            RestDay_Amount: restAmt,
            Total_Extra: otAmt + holAmt + restAmt,
          };
        }).filter(Boolean);
      case "bank-transfer-file":
        return filtered.map((emp: any) => {
          const e = earnings.find((ee: any) => ee.employeeId === emp.id);
          return {
            Employee: emp.employeeName,
            Code: emp.employeeCode,
            Account: e?.employee?.accountNumber || "",
            Bank: e?.employee?.bank?.bankName || "",
            NetPay: emp.netPay,
          };
        });
      default:
        return [];
    }
  }

  const payrollData = payrollRun?.payrollData || [];
  const earnings = payrollRun?.earnings || [];
  const deductions = payrollRun?.deductions || [];

  if (!report) {
    return (
      <div className="ml-0 p-8 max-w-[1440px] mx-auto">
        <div className="bg-white border border-outline rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">{t(locale, "reportDetail.notFound")}</h2>
          <p className="text-on-surface-variant mb-6">{t(locale, "reportDetail.notFoundDesc")}</p>
          <Link href="/report-center" className="inline-flex items-center gap-2 px-4 py-3 bg-secondary text-white rounded-xl">{t(locale, "reportDetail.backToCenter")}</Link>
        </div>
      </div>
    );
  }

  const hasCriteria = dataSource === "run" ? !!selectedRunId : !!(payFrom && payTo);

  function renderSortableTh(label: string, column: string, className = "") {
    return (
      <th className={`px-4 py-3 font-bold cursor-pointer select-none hover:bg-surface-container transition-colors ${className}`} onClick={() => handleSort(column)}>
        <span className="inline-flex items-center gap-1">
          {label} {getSortIndicator(column)}
        </span>
      </th>
    );
  }

  function renderReportContent() {
    if (!payrollRun) {
      return <p className="text-on-surface-variant italic py-8 text-center">{t(locale, "reportDetail.selectRunAndGenerate")}</p>;
    }

    const filteredPData = applyFilters(payrollData);
    const filteredEarnings = payrollRun?.earnings || [];

    const renderEmpty = (message = t(locale, "reportDetail.noDataAvailable")) => (
      <div className="text-center py-12 text-on-surface-variant">
        <FileText size={40} className="mx-auto mb-3 opacity-40" />
        <p className="italic">{message}</p>
      </div>
    );

    switch (slug) {
      case "social-security": {
        const data = sortData(filteredPData, e => e.grossPay);
        const totalGross = data.reduce((s: number, e: any) => s + e.grossPay, 0);
        const totalCss = data.reduce((s: number, e: any) => s + e.css, 0);
        const totalSeguro = data.reduce((s: number, e: any) => s + e.seguro, 0);
        const totalEmployerCss = data.reduce((s: number, e: any) => s + (e.grossPay > 0 ? Math.min(e.grossPay, 4000) * 0.0975 * 1.282 : 0), 0);
        return (
          <div>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-surface-container-lowest p-4 rounded-xl border"><p className="text-xs font-bold uppercase text-on-surface-variant">{t(locale, "report.totalGross")}</p><p className="text-xl font-bold">{formatCurrencyByLocale(totalGross, locale)}</p></div>
              <div className="bg-surface-container-lowest p-4 rounded-xl border"><p className="text-xs font-bold uppercase text-on-surface-variant">{t(locale, "report.employeeCss")}</p><p className="text-xl font-bold text-error">{formatCurrencyByLocale(totalCss, locale)}</p></div>
              <div className="bg-surface-container-lowest p-4 rounded-xl border"><p className="text-xs font-bold uppercase text-on-surface-variant">{t(locale, "report.seguroEducativo")}</p><p className="text-xl font-bold text-error">{formatCurrencyByLocale(totalSeguro, locale)}</p></div>
              <div className="bg-surface-container-lowest p-4 rounded-xl border"><p className="text-xs font-bold uppercase text-on-surface-variant">{t(locale, "report.employerCss")}</p><p className="text-xl font-bold text-error">{formatCurrencyByLocale(totalEmployerCss, locale)}</p></div>
            </div>
            {data.length === 0 ? renderEmpty() : (
            <table className="w-full text-left border-collapse report-table">
              <thead><tr className="bg-surface-container-low text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">{t(locale, "report.employeeCol")}</th>
                <th className="px-4 py-3 font-bold">{t(locale, "report.sssCol")}</th>
                {renderSortableTh(t(locale, "report.grossCol"), "gross", "text-right")}
                {renderSortableTh(t(locale, "report.cssCol"), "css", "text-right")}
                {renderSortableTh(t(locale, "report.seguroCol"), "seguro", "text-right")}
                {renderSortableTh(t(locale, "report.employerCssCol"), "employer", "text-right")}
                {renderSortableTh(t(locale, "report.totalCol"), "total", "text-right")}
              </tr></thead>
              <tbody className="divide-y divide-outline">
                {data.map((emp: any) => (
                  <tr key={emp.id} className="hover:bg-surface-container-lowest">
                    <td className="px-4 py-3 font-medium">{emp.employeeName}<br /><span className="text-xs text-on-surface-variant">{emp.employeeCode}</span></td>
                    <td className="px-4 py-3 font-mono text-sm">{emp.sssNumber || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrencyByLocale(emp.grossPay, locale)}</td>
                    <td className="px-4 py-3 text-right font-mono text-error">{formatCurrencyByLocale(emp.css, locale)}</td>
                    <td className="px-4 py-3 text-right font-mono text-error">{formatCurrencyByLocale(emp.seguro, locale)}</td>
                    <td className="px-4 py-3 text-right font-mono text-error">{formatCurrencyByLocale(Math.min(emp.grossPay, 4000) * 0.0975 * 1.282, locale)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{formatCurrencyByLocale(emp.css + emp.seguro + Math.min(emp.grossPay, 4000) * 0.0975 * 1.282, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        );
      }

      case "tax-liability-summary": {
        const data = sortData(filteredPData, e => e.grossPay);
        const totalGross = data.reduce((s: number, e: any) => s + e.grossPay, 0);
        const totalCss = data.reduce((s: number, e: any) => s + e.css, 0);
        const totalIsr = data.reduce((s: number, e: any) => s + e.isr, 0);
        const totalSeguro = data.reduce((s: number, e: any) => s + e.seguro, 0);
        const totalEmployerCss = totalCss * 1.282;
        return (
          <div>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-surface-container-lowest p-5 rounded-xl border space-y-3">
                <h4 className="font-bold text-sm uppercase tracking-wider text-on-surface-variant">{t(locale, "report.employeeContributions")}</h4>
                <div className="flex justify-between"><span>{t(locale, "report.cssCol")}</span><span className="font-bold text-error">{formatCurrencyByLocale(totalCss, locale)}</span></div>
                <div className="flex justify-between"><span>{t(locale, "report.seguroEducativo")} (1.5%)</span><span className="font-bold text-error">{formatCurrencyByLocale(totalSeguro, locale)}</span></div>
                <div className="flex justify-between border-t pt-2"><span>ISR</span><span className="font-bold text-error">{formatCurrencyByLocale(totalIsr, locale)}</span></div>
                <div className="flex justify-between border-t pt-2 font-bold"><span>{t(locale, "report.totalEmployee")}</span><span className="text-lg">{formatCurrencyByLocale(totalCss + totalSeguro + totalIsr, locale)}</span></div>
              </div>
              <div className="bg-surface-container-lowest p-5 rounded-xl border space-y-3">
                <h4 className="font-bold text-sm uppercase tracking-wider text-on-surface-variant">{t(locale, "report.employerContributions")}</h4>
                <div className="flex justify-between"><span>{t(locale, "report.employerCss")} (~12.5%)</span><span className="font-bold text-error">{formatCurrencyByLocale(totalEmployerCss, locale)}</span></div>
                <div className="flex justify-between"><span>{t(locale, "report.riesgoProfesional")}</span><span className="font-bold text-error">{formatCurrencyByLocale(totalGross * 0.0094, locale)}</span></div>
                <div className="flex justify-between border-t pt-2 font-bold"><span>{t(locale, "report.totalEmployer")}</span><span className="text-lg">{formatCurrencyByLocale(totalEmployerCss + totalGross * 0.0094, locale)}</span></div>
              </div>
            </div>
            {data.length === 0 ? renderEmpty() : (
            <table className="w-full text-left border-collapse report-table">
              <thead><tr className="bg-surface-container-low text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">{t(locale, "report.employeeCol")}</th>
                {renderSortableTh(t(locale, "report.grossCol"), "gross", "text-right")}
                {renderSortableTh(t(locale, "report.cssCol"), "css", "text-right")}
                {renderSortableTh(t(locale, "report.seguroCol"), "seguro", "text-right")}
                {renderSortableTh("ISR", "isr", "text-right")}
                {renderSortableTh(t(locale, "report.totalCol"), "totalTax", "text-right")}
              </tr></thead>
              <tbody className="divide-y divide-outline">
                {data.map((emp: any) => (
                  <tr key={emp.id} className="hover:bg-surface-container-lowest">
                    <td className="px-4 py-3 font-medium">{emp.employeeName}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrencyByLocale(emp.grossPay, locale)}</td>
                    <td className="px-4 py-3 text-right font-mono text-error">{formatCurrencyByLocale(emp.css, locale)}</td>
                    <td className="px-4 py-3 text-right font-mono text-error">{formatCurrencyByLocale(emp.seguro, locale)}</td>
                    <td className="px-4 py-3 text-right font-mono text-error">{formatCurrencyByLocale(emp.isr, locale)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{formatCurrencyByLocale(emp.css + emp.seguro + emp.isr, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        );
      }

      case "payroll-variance-analysis": {
        const data = sortData(filteredPData, e => e.grossPay);
        const prevData = previousRun?.payrollData || [];
        if (data.length === 0) return renderEmpty();
        return (
          <div>
            {previousRun && (
              <div className="bg-surface-container-lowest border border-outline rounded-xl p-4 mb-6 text-sm">
                <p><strong>{t(locale, "report.previousRun")}</strong> {t(locale, "report.runLabel").replace("{id}", String(previousRun.id))} ({formatDate(previousRun.payFrom, locale)} - {formatDate(previousRun.payTo, locale)})</p>
              </div>
            )}
            {!previousRun && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-900">{t(locale, "report.noPreviousRun")}</p>
              </div>
            )}
            <table className="w-full text-left border-collapse report-table">
              <thead><tr className="bg-surface-container-low text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">{t(locale, "report.employeeCol")}</th>
                {renderSortableTh(t(locale, "report.currentGrossCol"), "gross", "text-right")}
                {renderSortableTh(t(locale, "report.prevGrossCol"), "prevGross", "text-right")}
                {renderSortableTh(t(locale, "report.varianceDollarCol"), "variance", "text-right")}
                {renderSortableTh(t(locale, "report.variancePctCol"), "variancePct", "text-right")}
                {renderSortableTh(t(locale, "report.currentNetCol"), "net", "text-right")}
              </tr></thead>
              <tbody className="divide-y divide-outline">
                {data.map((emp: any) => {
                  const prev = prevData.find((p: any) => p.id === emp.id);
                  const varAmt = prev ? emp.grossPay - prev.grossPay : 0;
                  const varPct = prev && prev.grossPay > 0 ? (emp.grossPay - prev.grossPay) / prev.grossPay * 100 : 0;
                  return (
                    <tr key={emp.id} className="hover:bg-surface-container-lowest">
                      <td className="px-4 py-3 font-medium">{emp.employeeName}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrencyByLocale(emp.grossPay, locale)}</td>
                      <td className="px-4 py-3 text-right font-mono">{prev ? formatCurrencyByLocale(prev.grossPay, locale) : "—"}</td>
                      <td className={`px-4 py-3 text-right font-mono ${varAmt >= 0 ? 'text-green-600' : 'text-red-600'}`}>{prev ? formatCurrencyByLocale(varAmt, locale) : "—"}</td>
                      <td className={`px-4 py-3 text-right font-mono ${varPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>{prev ? `${varPct >= 0 ? '+' : ''}${varPct.toFixed(1)}%` : "—"}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">{formatCurrencyByLocale(emp.netPay, locale)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }

      case "employee-directory-export": {
        const filteredEmps = employees.filter(e => {
          let ok = true;
          if (filterEmployee) ok = ok && e.id === Number(filterEmployee);
          if (filterDepartment) ok = ok && e.departmentId === Number(filterDepartment);
          if (filterPayType) ok = ok && e.paymentMethod === filterPayType;
          return ok;
        });
        return (
          <div>
            <p className="text-on-surface-variant mb-4">{t(locale, "report.employeesFound").replace("{count}", String(filteredEmps.length)).replace("{customer}", currentCustomer?.name || "")}</p>
            {filteredEmps.length === 0 ? renderEmpty(t(locale, "report.noEmployeesMatch")) : (
            <table className="w-full text-left border-collapse report-table">
              <thead><tr className="bg-surface-container-low text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">{t(locale, "report.codeCol")}</th>
                <th className="px-4 py-3 font-bold">{t(locale, "report.nameCol")}</th>
                <th className="px-4 py-3 font-bold">{t(locale, "report.idNumberCol")}</th>
                <th className="px-4 py-3 font-bold">{t(locale, "report.sssCol")}</th>
                <th className="px-4 py-3 font-bold">{t(locale, "report.deptCol")}</th>
                <th className="px-4 py-3 font-bold">{t(locale, "report.positionCol")}</th>
                {renderSortableTh(t(locale, "report.salaryCol"), "salary", "text-right")}
                <th className="px-4 py-3 font-bold">{t(locale, "report.methodCol")}</th>
              </tr></thead>
              <tbody className="divide-y divide-outline">
                {(sortBy === "salary" ? sortData(filteredEmps, e => e.baseSalary) : filteredEmps).map((emp: any) => (
                  <tr key={emp.id} className="hover:bg-surface-container-lowest">
                    <td className="px-4 py-3 font-mono text-sm">{emp.employeeCode}</td>
                    <td className="px-4 py-3 font-medium">{emp.firstName} {emp.lastName}</td>
                    <td className="px-4 py-3 font-mono text-sm">{emp.identificationNumber || "—"}</td>
                    <td className="px-4 py-3 font-mono text-sm">{emp.sssNumber || "—"}</td>
                    <td className="px-4 py-3 text-sm">{emp.department?.name || "—"}</td>
                    <td className="px-4 py-3 text-sm">{emp.position?.title || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrencyByLocale(emp.baseSalary, locale)}</td>
                    <td className="px-4 py-3 text-sm capitalize">{emp.paymentMethod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        );
      }

      case "department-cost-analysis": {
        const deptMap = new Map<string, { gross: number; ded: number; net: number; count: number }>();
        (filteredPData).forEach((emp: any) => {
          const e = earnings.find((ee: any) => ee.employeeId === emp.id);
          const deptName = e?.employee?.department?.name || "Unassigned";
          const entry = deptMap.get(deptName) || { gross: 0, ded: 0, net: 0, count: 0 };
          entry.gross += emp.grossPay;
          entry.ded += emp.totalDeductions;
          entry.net += emp.netPay;
          entry.count++;
          deptMap.set(deptName, entry);
        });
        const deptData = sortData(Array.from(deptMap.entries()).map(([name, d]) => ({ name, ...d })), e => e.gross);
        return (
          <div>
            {deptData.length === 0 ? renderEmpty() : (
            <table className="w-full text-left border-collapse report-table">
              <thead><tr className="bg-surface-container-low text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">{t(locale, "report.deptCol")}</th>
                {renderSortableTh(t(locale, "report.employeesCol"), "count", "text-right")}
                {renderSortableTh(t(locale, "report.grossCol"), "gross", "text-right")}
                {renderSortableTh(t(locale, "report.deductionsCol"), "ded", "text-right")}
                {renderSortableTh(t(locale, "report.netCol"), "net", "text-right")}
                {renderSortableTh(t(locale, "report.avgPerEmployeeCol"), "avg", "text-right")}
              </tr></thead>
              <tbody className="divide-y divide-outline">
                {deptData.map((d: any) => (
                  <tr key={d.name} className="hover:bg-surface-container-lowest">
                    <td className="px-4 py-3 font-medium">{d.name}</td>
                    <td className="px-4 py-3 text-right">{d.count}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrencyByLocale(d.gross, locale)}</td>
                    <td className="px-4 py-3 text-right font-mono text-error">{formatCurrencyByLocale(d.ded, locale)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{formatCurrencyByLocale(d.net, locale)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrencyByLocale(d.net / d.count, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        );
      }

      case "termination-report": {
        const filtered = employees.filter((e: any) => e.isActive).filter(e => {
          let ok = true;
          if (filterEmployee) ok = ok && e.id === Number(filterEmployee);
          if (filterDepartment) ok = ok && e.departmentId === Number(filterDepartment);
          return ok;
        });
        return (
          <div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-900">{t(locale, "report.terminationSourceWarning")}</p>
            </div>
            {filtered.length === 0 ? renderEmpty(t(locale, "report.noActiveEmployees")) : (
            <table className="w-full text-left border-collapse report-table">
              <thead><tr className="bg-surface-container-low text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">{t(locale, "report.employeeCol")}</th>
                <th className="px-4 py-3 font-bold">{t(locale, "report.codeCol")}</th>
                {renderSortableTh(t(locale, "report.salaryCol"), "salary", "text-right")}
                <th className="px-4 py-3 font-bold">{t(locale, "report.methodCol")}</th>
                <th className="px-4 py-3 font-bold">{t(locale, "report.statusCol")}</th>
              </tr></thead>
              <tbody className="divide-y divide-outline">
                {(sortBy === "salary" ? [...filtered].sort((a: any, b: any) => sortDir === "asc" ? a.baseSalary - b.baseSalary : b.baseSalary - a.baseSalary) : filtered).map((emp: any) => (
                  <tr key={emp.id} className="hover:bg-surface-container-lowest">
                    <td className="px-4 py-3 font-medium">{emp.firstName} {emp.lastName}</td>
                    <td className="px-4 py-3 font-mono text-sm">{emp.employeeCode}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrencyByLocale(emp.baseSalary, locale)}</td>
                    <td className="px-4 py-3 text-sm capitalize">{emp.paymentMethod}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">{t(locale, "common.active")}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        );
      }

      case "overtime-analysis": {
        const data = sortData(filteredPData, e => {
          const empEarnings = earnings.filter((ee: any) => ee.employeeId === e.id);
          const otAmt = empEarnings.filter((ee: any) => ee.earningCode?.includes('HORA_EXTRA') || ee.earningCode?.includes('SALARIO_EXTRA')).reduce((s: number, ee: any) => s + ee.totalAmount, 0);
          return otAmt;
        });
        const rows = data.map((emp: any) => {
          const empEarnings = earnings.filter((e: any) => e.employeeId === emp.id);
          const otEarnings = empEarnings.filter((e: any) => e.earningCode?.includes('HORA_EXTRA') || e.earningCode?.includes('SALARIO_EXTRA'));
          const holEarnings = empEarnings.filter((e: any) => e.earningCode?.includes('FERIADO'));
          const restEarnings = empEarnings.filter((e: any) => e.earningCode?.includes('DESCANSO'));
          const otHours = otEarnings.reduce((s: number, e: any) => s + (e.quantity || 0), 0);
          const otAmt = otEarnings.reduce((s: number, e: any) => s + e.totalAmount, 0);
          const holAmt = holEarnings.reduce((s: number, e: any) => s + e.totalAmount, 0);
          const restAmt = restEarnings.reduce((s: number, e: any) => s + e.totalAmount, 0);
          if (otAmt === 0 && holAmt === 0 && restAmt === 0) return null;
          return { emp, otHours, otAmt, holAmt, restAmt, totalExtra: otAmt + holAmt + restAmt };
        }).filter(Boolean);
        return (
          <div>
            {rows.length === 0 ? renderEmpty(t(locale, "report.noOvertimeFound")) : (
            <table className="w-full text-left border-collapse report-table">
              <thead><tr className="bg-surface-container-low text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">{t(locale, "report.employeeCol")}</th>
                {renderSortableTh(t(locale, "report.otHoursCol"), "otHours", "text-right")}
                {renderSortableTh(t(locale, "report.otAmountCol"), "otAmt", "text-right")}
                {renderSortableTh(t(locale, "report.holidayCol"), "holAmt", "text-right")}
                {renderSortableTh(t(locale, "report.restDayCol"), "restAmt", "text-right")}
                {renderSortableTh(t(locale, "report.totalExtraCol"), "totalExtra", "text-right")}
              </tr></thead>
              <tbody className="divide-y divide-outline">
                {rows.map((row: any) => (
                  <tr key={row.emp.id} className="hover:bg-surface-container-lowest">
                    <td className="px-4 py-3 font-medium">{row.emp.employeeName}</td>
                    <td className="px-4 py-3 text-right font-mono">{row.otHours.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right font-mono text-orange-600">{formatCurrencyByLocale(row.otAmt, locale)}</td>
                    <td className="px-4 py-3 text-right font-mono text-purple-600">{formatCurrencyByLocale(row.holAmt, locale)}</td>
                    <td className="px-4 py-3 text-right font-mono text-blue-600">{formatCurrencyByLocale(row.restAmt, locale)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{formatCurrencyByLocale(row.totalExtra, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        );
      }

      case "bank-transfer-file": {
        const data = sortData(filteredPData, e => e.netPay);
        return (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-surface-container-lowest p-4 rounded-xl border">
                <p className="text-xs font-bold uppercase text-on-surface-variant">{t(locale, "report.bankTransfer")}</p>
                <p className="text-xl font-bold">{data.filter((emp: any) => { const e = earnings.find((ee: any) => ee.employeeId === emp.id); return e?.employee?.paymentMethod === 'bank' || e?.employee?.paymentMethod === 'transfer'; }).length} {t(locale, "report.employees")}</p>
                <p className="text-sm">{formatCurrencyByLocale(data.filter((emp: any) => { const e = earnings.find((ee: any) => ee.employeeId === emp.id); return e?.employee?.paymentMethod === 'bank' || e?.employee?.paymentMethod === 'transfer'; }).reduce((s: number, e: any) => s + e.netPay, 0), locale)}</p>
              </div>
              <div className="bg-surface-container-lowest p-4 rounded-xl border">
                <p className="text-xs font-bold uppercase text-on-surface-variant">{t(locale, "report.cashCheck")}</p>
                <p className="text-xl font-bold">{data.filter((emp: any) => { const e = earnings.find((ee: any) => ee.employeeId === emp.id); return e?.employee?.paymentMethod === 'cash' || e?.employee?.paymentMethod === 'check'; }).length} {t(locale, "report.employees")}</p>
                <p className="text-sm">{formatCurrencyByLocale(data.filter((emp: any) => { const e = earnings.find((ee: any) => ee.employeeId === emp.id); return e?.employee?.paymentMethod === 'cash' || e?.employee?.paymentMethod === 'check'; }).reduce((s: number, e: any) => s + e.netPay, 0), locale)}</p>
              </div>
            </div>
            {data.length === 0 ? renderEmpty() : (
            <table className="w-full text-left border-collapse report-table">
              <thead><tr className="bg-surface-container-low text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">{t(locale, "report.employeeCol")}</th>
                <th className="px-4 py-3 font-bold">{t(locale, "report.accountCol")}</th>
                <th className="px-4 py-3 font-bold">{t(locale, "report.bankCol")}</th>
                {renderSortableTh(t(locale, "report.netPayCol"), "netPay", "text-right")}
              </tr></thead>
              <tbody className="divide-y divide-outline">
                {data.map((emp: any) => {
                  const e = earnings.find((ee: any) => ee.employeeId === emp.id);
                  return (
                    <tr key={emp.id} className="hover:bg-surface-container-lowest">
                      <td className="px-4 py-3 font-medium">{emp.employeeName}<br /><span className="text-xs text-on-surface-variant">{emp.employeeCode}</span></td>
                      <td className="px-4 py-3 font-mono text-sm">{e?.employee?.accountNumber || "—"}</td>
                      <td className="px-4 py-3 text-sm">{e?.employee?.bank?.bankName || "—"}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">{formatCurrencyByLocale(emp.netPay, locale)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}
          </div>
        );
      }

      default:
        return <p className="text-on-surface-variant italic">{t(locale, "report.notImplemented")}</p>;
    }
  }

  return (
    <div className="ml-0 p-8 max-w-[1440px] mx-auto">
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-on-surface-variant mb-2">{t(locale, "reportDetail.reportDetails")}</p>
            <h1 className="text-3xl font-black text-on-surface mb-3 flex items-center gap-3">
              <Icon size={32} className="text-secondary" />
              {report.name}
            </h1>
            <p className="text-on-surface-variant max-w-2xl">{report.description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/report-center" className="inline-flex items-center gap-2 px-4 py-2 border border-outline rounded-lg text-on-surface hover:bg-surface-container transition-all no-print">
              <ArrowLeft size={16} /> {t(locale, "reportDetail.back")}
            </Link>
            {hasCriteria && (
              <>
                <button onClick={() => setGenerated(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-blue-700 transition-all">
                  <Download size={16} /> {generated ? t(locale, "reportDetail.regenerate") : t(locale, "reportDetail.generateReport")}
                </button>
                {generated && payrollRun && (
                  <>
                    <button onClick={exportToExcel} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all">
                      <FileSpreadsheet size={16} /> {t(locale, "reportDetail.exportExcel")}
                    </button>
                    <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 border border-outline rounded-lg text-on-surface hover:bg-surface-container transition-all">
                      <Printer size={16} /> {t(locale, "reportDetail.print")}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Data source selector */}
        <div className="bg-white border border-outline rounded-xl p-5 flex flex-wrap items-center gap-4">
          <div className="flex bg-surface-container-low rounded-lg p-1 gap-1">
            <button
              onClick={() => { setDataSource("run"); setGenerated(false); setError(null); }}
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
              onClick={() => { setDataSource("period"); setGenerated(false); setError(null); }}
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

          {dataSource === "run" && (
            <>
              <select
                value={selectedRunId}
                onChange={(e) => { setSelectedRunId(e.target.value); setGenerated(false); setError(null); }}
                className="border border-outline rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-secondary outline-none min-w-[240px]"
              >
                <option value="">{t(locale, "reportDetail.selectRun")}</option>
                {payrollRuns.map((run) => (
                  <option key={run.id} value={run.id}>
                    {formatDate(run.payFrom, locale)} - {formatDate(run.payTo, locale)} ({run.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </>
          )}

          {dataSource === "period" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={payFrom}
                onChange={(e) => { setPayFrom(e.target.value); setGenerated(false); setError(null); }}
                className="border border-outline rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-secondary outline-none"
              />
              <span className="text-on-surface-variant text-sm">{t(locale, "dashboard.to")}</span>
              <input
                type="date"
                value={payTo}
                onChange={(e) => { setPayTo(e.target.value); setGenerated(false); setError(null); }}
                className="border border-outline rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-secondary outline-none"
              />
            </div>
          )}

          {payrollRun && (
            <span className="text-xs text-on-surface-variant ml-auto">
              {payrollRun.id ? t(locale, "report.runLabel").replace("{id}", String(payrollRun.id)) : t(locale, "report.aggregated")} &middot; {(payrollRun.payrollData || []).length} {t(locale, "report.employees")}
            </span>
          )}
        </div>

        {/* Validation error */}
        {!hasCriteria && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
            <X size={20} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-sm text-red-800">{t(locale, "report.selectionRequired")}</h3>
              <p className="text-sm text-red-700 mt-1">
                {dataSource === "run"
                  ? t(locale, "report.selectRunPrompt")
                  : t(locale, "report.selectPeriodPrompt")}
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {!isLoading && error && !payrollRun && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-sm text-amber-800">{t(locale, "report.noData")}</h3>
              <p className="text-sm text-amber-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Ready state */}
        {!isLoading && hasCriteria && !generated && (
          <div className="bg-surface-container-lowest border border-dashed border-outline rounded-xl p-12 text-center">
            <Icon size={48} className="mx-auto mb-4 text-on-surface-variant/40" />
            <h3 className="text-lg font-bold mb-2">{t(locale, "report.readyToGenerate")}</h3>
            <p className="text-on-surface-variant">
              {t(locale, "report.clickToGenerate").replace("{source}",
                dataSource === "run"
                  ? t(locale, "report.payrollRunSource")
                  : t(locale, "report.workPeriodSource")
              )}
            </p>
          </div>
        )}

        {/* Filters bar (shown when report is generated) */}
        {!isLoading && generated && payrollRun && (
          <div className="bg-white border border-outline rounded-xl p-4 flex flex-wrap items-center gap-3 no-print">
            <FilterIcon size={16} className="text-on-surface-variant" />
            <span className="text-xs font-bold uppercase text-on-surface-variant tracking-wider">{t(locale, "reportDetail.filters")}</span>

            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="border border-outline rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-secondary outline-none"
            >
              <option value="">{t(locale, "reportDetail.allEmployees")}</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
              ))}
            </select>

            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="border border-outline rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-secondary outline-none"
            >
              <option value="">{t(locale, "reportDetail.allDepartments")}</option>
              {departments.map((dept: any) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>

            <select
              value={filterPayType}
              onChange={(e) => setFilterPayType(e.target.value)}
              className="border border-outline rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-secondary outline-none"
            >
              <option value="">{t(locale, "reportDetail.allPayTypes")}</option>
              <option value="bank">{t(locale, "reportDetail.bank")}</option>
              <option value="transfer">{t(locale, "reportDetail.transfer")}</option>
              <option value="cash">{t(locale, "reportDetail.cash")}</option>
              <option value="check">{t(locale, "reportDetail.check")}</option>
            </select>

            {(filterEmployee || filterDepartment || filterPayType) && (
              <button
                onClick={() => { setFilterEmployee(""); setFilterDepartment(""); setFilterPayType(""); }}
                className="text-xs text-secondary hover:underline ml-auto flex items-center gap-1"
              >
                <X size={12} /> {t(locale, "reportDetail.clearFilters")}
              </button>
            )}

            <span className="text-xs text-on-surface-variant ml-auto">
              {t(locale, "reportDetail.rowsOf").replace("{count}", String(applyFilters(payrollData).length)).replace("{total}", String(payrollData.length))}
            </span>
          </div>
        )}

        {/* Report content */}
        {!isLoading && generated && (
          <div className="bg-white border border-outline rounded-xl overflow-hidden shadow-sm report-print-area">
            <div className="px-6 py-4 border-b border-outline bg-surface-container-low flex items-center justify-between no-print">
              <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-600" />
                {report.name} — {payrollRun ? `${formatDate(payrollRun.payFrom, locale)} to ${formatDate(payrollRun.payTo, locale)}` : ''}
              </h3>
              <span className="text-xs text-on-surface-variant">
                {t(locale, "report.generatedFrom").replace("{source}",
                  payrollRun?.id
                    ? t(locale, "report.runLabel").replace("{id}", String(payrollRun.id))
                    : t(locale, "report.aggregatedData")
                )}
              </span>
            </div>
            <div className="p-6 overflow-x-auto">
              {renderReportContent()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}
