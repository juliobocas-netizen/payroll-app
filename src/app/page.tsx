"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  Edit,
  Eye,
  Download,
  AlertCircle,
  Filter,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Calendar,
  FileText,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle2,
  DollarSign,
  IdCard,
  Ban,
} from "lucide-react";
import { useCustomer } from "@/components/Sidebar";
import { getPayrollRunsAction, getPayrollRunDetailsAction } from "@/lib/server-actions";
import { t, formatDateByLocale, formatDateTimeByLocale, formatCurrencyByLocale } from "@/lib/translations";

interface PayrollRun {
  id: number;
  period: string;
  status: string;
  total: string;
  date: string;
}

interface EmployeePaySummary {
  id: number;
  name: string;
  baseSalary: number;
  overtime: number;
  deductions: number;
  netPay: number;
}

export default function Dashboard() {
  const router = useRouter();
  const { currentCustomer, sessionUser } = useCustomer();
  const locale = sessionUser?.languagePref || "es";
  const [currentDate, setCurrentDate] = useState("");
  const [metrics, setMetrics] = useState({
    totalPayroll: 42850.42,
    employees: 124,
    taxLiabilities: 8124.50,
    deductions: 3420.12,
    bankTransfer: "Oct 28",
  });
  const [recentPayrollRuns, setRecentPayrollRuns] = useState([
    { id: 1, period: "October 2023", status: "in_progress", total: "$42,850.42", date: "Oct 28, 2023" },
  ]);
  const [employeeSummary, setEmployeeSummary] = useState<EmployeePaySummary[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);

  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | "new" | null>(null);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!sessionUser) {
      router.push("/login");
      return;
    }

    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    setCurrentDate(formatDateByLocale(now, locale, options));

    // Fetch payroll runs for the current customer
    if (currentCustomer) {
      getPayrollRunsAction(currentCustomer.id).then(res => {
        if (res.success && res.runs) {
          setPayrollRuns(res.runs);
          if (res.runs.length > 0) {
            setSelectedRunId(res.runs[0].id);
          } else {
            setSelectedRunId(null);
            setSelectedRun(null);
          }
        }
      });
    }
  }, [sessionUser, router, currentCustomer]);

  useEffect(() => {
    if (selectedRunId && typeof selectedRunId === 'number') {
      setIsLoading(true);
      getPayrollRunDetailsAction(selectedRunId).then(res => {
        if (res.success && res.payrollRun) {
          const run = res.payrollRun;
          setSelectedRun(run);
          
          // Calculate summary from payroll data
          const totalGross = run.payrollData.reduce((sum, emp) => sum + emp.grossPay, 0);
          const totalNet = run.payrollData.reduce((sum, emp) => sum + emp.netPay, 0);
          const totalIsr = run.payrollData.reduce((sum, emp) => sum + emp.isr, 0);
          const totalCssEmployee = run.payrollData.reduce((sum, emp) => sum + emp.css, 0);
          const employeeCount = run.payrollData.length;
          
          const summary = {
            totalGross,
            totalNet,
            totalIsr,
            totalCssEmployee,
            employeeCount
          };

          setMetrics({
            totalPayroll: summary.totalGross,
            employees: summary.employeeCount || 0,
            taxLiabilities: (summary.totalIsr || 0) + (summary.totalCssEmployee || 0),
            deductions: (summary.totalIsr || 0) + (summary.totalCssEmployee || 0),
            bankTransfer: run.paymentDate ? formatDateByLocale(new Date(run.paymentDate), locale, { month: 'short', day: 'numeric' }) : "Pending",
          });

          // Group earnings/deductions by employee for the table
          const empMap: Record<number, any> = {};
          
          run.earnings.forEach((e: any) => {
            if (!empMap[e.employeeId]) {
              empMap[e.employeeId] = {
                id: e.employeeId,
                name: `${e.employee.lastName}, ${e.employee.firstName}`,
                baseSalary: 0,
                overtime: 0,
                deductions: 0,
                netPay: 0
              };
            }
            if (e.earningCode === 'SALARIO') empMap[e.employeeId].baseSalary += e.totalAmount;
            else if (e.earningCode.includes('HORA')) empMap[e.employeeId].overtime += e.totalAmount;
            empMap[e.employeeId].netPay += e.totalAmount;
          });

          run.deductions.forEach((d: any) => {
            if (!empMap[d.employeeId]) {
              empMap[d.employeeId] = {
                id: d.employeeId,
                name: `${d.employee.lastName}, ${d.employee.firstName}`,
                baseSalary: 0,
                overtime: 0,
                deductions: 0,
                netPay: 0
              };
            }
            empMap[d.employeeId].deductions += d.amount;
            empMap[d.employeeId].netPay -= d.amount;
          });

          setEmployeeSummary(Object.values(empMap));

          // Compute exceptions from live payroll data
          const computedExceptions: any[] = [];
          let excId = 0;

          const empRecords: Record<number, any> = {};
          run.earnings.forEach((e: any) => {
            if (!empRecords[e.employeeId]) {
              empRecords[e.employeeId] = { employee: e.employee };
            }
          });
          run.deductions.forEach((d: any) => {
            if (!empRecords[d.employeeId]) {
              empRecords[d.employeeId] = { employee: d.employee };
            }
          });

          // 1. Missing SSS/ID number
          Object.values(empRecords).forEach((rec: any) => {
            const emp = rec.employee;
            if (emp && !emp.sssNumber && !emp.identificationNumber) {
              computedExceptions.push({
                id: ++excId, type: "error", icon: IdCard,
                title: t(locale, "exception.missingSssAndId"),
                description: `${emp.lastName}, ${emp.firstName} — no SSS or ID on file`,
                priority: "high",
              });
            } else if (emp && !emp.sssNumber) {
              computedExceptions.push({
                id: ++excId, type: "error", icon: IdCard,
                title: t(locale, "exception.missingSss"),
                description: `${emp.lastName}, ${emp.firstName}`,
                priority: "high",
              });
            }
          });

          // 2. Negative net pay (deductions exceed gross)
          run.payrollData.forEach((emp: any) => {
            if (emp.netPay < 0) {
              computedExceptions.push({
                id: ++excId, type: "error", icon: Ban,
                title: t(locale, "exception.negativeNetPay"),
                description: `${emp.employeeName} — deductions exceed gross by ${formatCurrency(Math.abs(emp.netPay))}`,
                priority: "high",
              });
            }
          });

          // 3. Zero CSS deduction (employee with gross > 0 but no CSS)
          run.payrollData.forEach((emp: any) => {
            if (emp.grossPay > 0 && emp.css === 0) {
              computedExceptions.push({
                id: ++excId, type: "warning", icon: AlertCircle,
                title: t(locale, "exception.zeroCssDeduction"),
                description: `${emp.employeeName} — gross $${emp.grossPay.toFixed(2)} but no CSS withheld`,
                priority: "high",
              });
            }
          });

          // 4. Excessive overtime (> 20 hours in period)
          run.earnings.forEach((e: any) => {
            const isOt = e.earningCode?.includes('HORA_EXTRA') || e.earningCode?.includes('SALARIO_EXTRA');
            if (isOt && e.quantity && e.quantity > 20) {
              computedExceptions.push({
                id: ++excId, type: "warning", icon: Clock,
                title: t(locale, "exception.excessiveOvertime"),
                description: `${e.employee.lastName}, ${e.employee.firstName}: ${e.quantity.toFixed(1)} hrs`,
                priority: "medium",
              });
            }
          });

          // 5. High deduction rate (> 40% of gross)
          run.payrollData.forEach((emp: any) => {
            if (emp.grossPay > 0 && emp.totalDeductions / emp.grossPay > 0.4) {
              computedExceptions.push({
                id: ++excId, type: "warning", icon: AlertTriangle,
                title: t(locale, "exception.highDeductionRate"),
                description: `${emp.employeeName} — ${(emp.totalDeductions / emp.grossPay * 100).toFixed(0)}% of gross`,
                priority: "medium",
              });
            }
          });

          setExceptions(computedExceptions);
        }
        setIsLoading(false);
      });
    } else {
      setSelectedRun(null);
      setExceptions([]);
    }
  }, [selectedRunId]);

  function formatCurrency(amount: number) {
    return formatCurrencyByLocale(amount, locale);
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      calculated: "bg-blue-100 text-blue-800",
      in_progress: "bg-blue-100 text-blue-600",
      approved: "bg-yellow-100 text-yellow-800",
      closed: "bg-green-100 text-green-800",
    };
    const labels: Record<string, string> = {
      draft: t(locale, "dashboard.draft").toUpperCase(),
      calculated: t(locale, "dashboard.calculated").toUpperCase(),
      in_progress: t(locale, "dashboard.inProgress").toUpperCase(),
      approved: t(locale, "dashboard.approved").toUpperCase(),
      closed: t(locale, "dashboard.closed").toUpperCase(),
    };
    return (
      <span className={`px-3 py-1 text-xs font-bold rounded-full ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  }

  if (!sessionUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-16 h-16 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="ml-0 p-8 max-w-[1440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider mb-1">{t(locale, "dashboard.operationalDashboard")}</p>
          <h2 className="font-headline-md text-headline-md text-on-surface">{t(locale, "dashboard.payrollOverview")}</h2>
          <div className="flex items-center gap-6 mt-4">
            <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center">
              <Calendar size={14} className="mr-2" />
              {currentDate}
            </p>
            
            {/* Selection Combo Box */}
            <div className="relative group">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">{t(locale, "dashboard.selectPayrollRun")}</label>
              <div className="relative">
                <select 
                  value={selectedRunId || ""}
                  onChange={(e) => setSelectedRunId(e.target.value === "" ? null : Number(e.target.value))}
                  className="appearance-none bg-white border border-outline rounded-xl pl-4 pr-10 py-2.5 text-sm font-medium focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all cursor-pointer min-w-[240px] shadow-sm group-hover:border-secondary"
                >
                  {payrollRuns.length === 0 ? (
                    <option value="">{t(locale, "dashboard.noPayrollRunsFound")}</option>
                  ) : (
                    <>
                      {payrollRuns.map((run) => (
                        <option key={run.id} value={run.id}>
                          {formatDateByLocale(new Date(run.payFrom), locale, { month: 'long', year: 'numeric' })} - {run.status.toUpperCase()}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none group-hover:text-secondary transition-colors" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-4">
          {currentCustomer ? (
            <div className="bg-secondary/10 border border-secondary/20 px-6 py-3 rounded-2xl text-right">
              <p className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] mb-1">{t(locale, "sidebar.activeCustomer")}</p>
              <h1 className="text-3xl font-black text-secondary tracking-tight">
                {currentCustomer.name}
              </h1>
            </div>
          ) : (
            <div className="bg-slate-100 border border-slate-200 px-6 py-3 rounded-2xl opacity-50 text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">{t(locale, "sidebar.activeCustomer")}</p>
              <h1 className="text-3xl font-black text-slate-400 tracking-tight italic">
                {t(locale, "common.noneSelected")}
              </h1>
            </div>
          )}
          
          <div className="flex space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 border border-outline rounded-lg bg-white text-on-surface font-medium text-sm hover:bg-surface-container transition-all">
              <Download size={16} />
              <span>{t(locale, "dashboard.exportSummary")}</span>
            </button>
            <Link
              href="/payroll-run"
              className="flex items-center space-x-2 px-4 py-2 bg-secondary text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-all shadow-sm"
            >
              <Plus size={16} />
              <span>{t(locale, "dashboard.startNewRun")}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Top Bento Grid */}
      <div className="grid grid-cols-12 gap-6 mb-8">
        {/* Large Payroll Card */}
        <div className="col-span-8 bg-white border border-outline rounded-xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[280px]">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <DollarSign size={160} className="text-on-surface" />
          </div>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-title-sm text-title-sm text-on-surface mb-1">
                {selectedRun ? `${formatDateByLocale(new Date(selectedRun.payFrom), locale, { month: 'long', year: 'numeric' })} ${t(locale, "dashboard.payrollRun")}` : t(locale, "dashboard.noPayrollSelected")}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {selectedRun ? `${t(locale, "dashboard.period")} ${formatDateByLocale(new Date(selectedRun.payFrom), locale)} ${t(locale, "dashboard.to")} ${formatDateByLocale(new Date(selectedRun.payTo), locale)}` : t(locale, "dashboard.pleaseSelect")}
              </p>
            </div>
            {selectedRun && (
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 text-xs rounded-full bg-surface-container-low border border-outline text-on-surface-variant font-mono">{t(locale, "dashboard.runId")} {selectedRun.id}</span>
                {getStatusBadge(selectedRun.status)}
              </div>
            )}
          </div>
          <div className="flex items-baseline space-x-4 my-6">
            <span className="font-display-lg text-[48px] text-on-surface">{formatCurrency(metrics.totalPayroll)}</span>
            <span className="flex items-center text-green-600 font-semibold text-sm">
              <TrendingUp size={16} className="mr-1" />
              +2.4% {t(locale, "dashboard.vsSept")}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-4 border-t border-slate-100 pt-6">
            <div>
              <p className="text-on-surface-variant text-xs font-semibold mb-1">{t(locale, "dashboard.activeEmployees")}</p>
              <p className="text-on-surface font-bold">{metrics.employees}</p>
            </div>
            <div>
              <p className="text-on-surface-variant text-xs font-semibold mb-1">{t(locale, "dashboard.taxLiabilities")}</p>
              <p className="text-on-surface font-bold">{formatCurrency(metrics.taxLiabilities)}</p>
            </div>
            <div>
              <p className="text-on-surface-variant text-xs font-semibold mb-1">{t(locale, "dashboard.deductions")}</p>
              <p className="text-on-surface font-bold">{formatCurrency(metrics.deductions)}</p>
            </div>
            <div>
              <p className="text-on-surface-variant text-xs font-semibold mb-1">{t(locale, "dashboard.bankTransfer")}</p>
              <p className="text-on-surface font-bold">{metrics.bankTransfer}</p>
            </div>
          </div>
          {/* Status Progress Bar */}
          {selectedRun && (
            <div className="mt-8">
              <div className="flex justify-between text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-tighter">
                <span className={selectedRun.status === 'draft' || selectedRun.status === 'calculated' || selectedRun.status === 'approved' || selectedRun.status === 'closed' ? "text-secondary" : ""}>{t(locale, "dashboard.draft")}</span>
                <span className={selectedRun.status === 'calculated' || selectedRun.status === 'approved' || selectedRun.status === 'closed' ? "text-secondary" : ""}>{t(locale, "dashboard.calculated")}</span>
                <span className={selectedRun.status === 'approved' || selectedRun.status === 'closed' ? "text-secondary" : ""}>{t(locale, "dashboard.approved")}</span>
                <span className={selectedRun.status === 'closed' ? "text-secondary" : ""}>{t(locale, "dashboard.closed")}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div className={`h-full border-r border-white ${selectedRun.status === 'draft' ? 'bg-secondary w-1/4' : 'bg-secondary w-1/4'}`}></div>
                <div className={`h-full border-r border-white ${selectedRun.status === 'calculated' || selectedRun.status === 'approved' || selectedRun.status === 'closed' ? 'bg-secondary w-1/4' : 'bg-slate-200 w-1/4'}`}></div>
                <div className={`h-full border-r border-white ${selectedRun.status === 'approved' || selectedRun.status === 'closed' ? 'bg-secondary w-1/4' : 'bg-slate-200 w-1/4'}`}></div>
                <div className={`h-full ${selectedRun.status === 'closed' ? 'bg-secondary w-1/4' : 'bg-slate-200 w-1/4'}`}></div>
              </div>
              <div className="mt-4 flex justify-end">
                <Link 
                  href={`/payroll-run?id=${selectedRun.id}`}
                  className="text-secondary font-bold text-sm flex items-center hover:underline"
                >
                  {t(locale, "dashboard.editRecalculate")}
                  <ArrowRight size={16} className="ml-1" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions & Secondary Stats */}
        <div className="col-span-4 space-y-6">
          {/* Recent Exceptions Card */}
          <div className="bg-white border border-outline rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-title-sm text-title-sm text-on-surface">{t(locale, "dashboard.recentExceptions")}</h3>
              {exceptions.length > 0 && (
                <span className="bg-error-container text-error text-xs font-bold px-2 py-1 rounded">{exceptions.length} {t(locale, exceptions.length === 1 ? "dashboard.exceptionItem" : "dashboard.exceptionItems")}</span>
              )}
            </div>
            {!selectedRun ? (
              <p className="text-on-surface-variant text-sm italic py-4 text-center">{t(locale, "dashboard.selectRunToView")}</p>
            ) : exceptions.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-on-surface-variant">
                <CheckCircle2 size={32} className="text-green-500 mb-2" />
                <p className="text-sm font-medium">{t(locale, "dashboard.noExceptions")}</p>
                <p className="text-xs">{t(locale, "dashboard.allEmployeesPass")}</p>
              </div>
            ) : (
            <div className="space-y-4">
              {exceptions.map((exception) => (
                <div key={exception.id} className={`flex items-center space-x-3 p-3 rounded-lg border ${
                  exception.type === 'error' ? 'bg-red-50/50 border-red-100' : 'bg-amber-50/50 border-amber-100'
                }`}>
                  <exception.icon size={20} className={exception.type === 'error' ? 'text-error shrink-0' : 'text-amber-500 shrink-0'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-on-surface text-sm font-semibold">{exception.title}</p>
                    <p className="text-on-surface-variant text-xs truncate">{exception.description}</p>
                  </div>
                </div>
              ))}
            </div>
            )}
            {exceptions.length > 0 && (
              <Link 
                href="/exceptions"
                className="block w-full mt-4 py-2 text-center text-secondary text-sm font-bold hover:underline"
              >
                {t(locale, "dashboard.viewAllExceptions")}
              </Link>
            )}
          </div>

          {/* Quick Action Buttons Stack */}
          <div className="grid grid-cols-2 gap-4">
            <Link 
              href="/report-center"
              className="bg-white border border-outline p-4 rounded-xl flex flex-col items-center justify-center space-y-2 hover:border-secondary hover:text-secondary transition-all group shadow-sm"
            >
              <FileText size={32} className="text-on-surface-variant group-hover:text-secondary" />
              <span className="text-xs font-bold uppercase tracking-tight">{t(locale, "dashboard.viewReports")}</span>
            </Link>
            <Link 
              href="/employees"
              className="bg-white border border-outline p-4 rounded-xl flex flex-col items-center justify-center space-y-2 hover:border-secondary hover:text-secondary transition-all group shadow-sm"
            >
              <Users size={32} className="text-on-surface-variant group-hover:text-secondary" />
              <span className="text-xs font-bold uppercase tracking-tight">{t(locale, "dashboard.directory")}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Data Table Section */}
      <div className="bg-white border border-outline rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-outline flex items-center justify-between bg-surface-container-low">
          <h3 className="font-title-sm text-title-sm text-on-surface">{t(locale, "dashboard.employeePaySummary")}</h3>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                className="pl-10 pr-4 py-2 border border-outline rounded-lg text-sm w-64 focus:ring-2 focus:ring-secondary focus:border-secondary outline-none font-body-sm"
                placeholder={t(locale, "dashboard.searchEmployees")}
                type="text"
              />
            </div>
            <button className="p-2 border border-outline rounded-lg hover:bg-white bg-white">
              <Filter size={16} className="text-on-surface" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-bold text-[12px] uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold border-b border-outline">{t(locale, "dashboard.employeeName")}</th>
                <th className="px-6 py-4 font-semibold border-b border-outline">{t(locale, "dashboard.baseSalary")}</th>
                <th className="px-6 py-4 font-semibold border-b border-outline">{t(locale, "dashboard.overtime")}</th>
                <th className="px-6 py-4 font-semibold border-b border-outline">{t(locale, "dashboard.deductions")}</th>
                <th className="px-6 py-4 font-semibold border-b border-outline">{t(locale, "dashboard.netPay")}</th>
                <th className="px-6 py-4 font-semibold border-b border-outline text-right">{t(locale, "dashboard.actions")}</th>
              </tr>
            </thead>
            <tbody className="text-on-surface text-sm divide-y divide-slate-100">
              {employeeSummary.map((employee) => (
                <tr key={employee.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-4 font-medium text-on-surface">{employee.name}</td>
                  <td className="px-6 py-4 font-data-mono">{formatCurrency(employee.baseSalary)}</td>
                  <td className="px-6 py-4 font-data-mono">{formatCurrency(employee.overtime)}</td>
                  <td className="px-6 py-4 font-data-mono text-error">-{formatCurrency(employee.deductions)}</td>
                  <td className="px-6 py-4 font-bold text-on-surface">{formatCurrency(employee.netPay)}</td>
                  <td className="px-6 py-4 text-right flex justify-end gap-1">
                    <Link 
                      href="/employees"
                      className="p-2 text-on-surface-variant hover:text-secondary transition-all"
                      title={t(locale, "dashboard.editEmployee")}
                    >
                      <Edit size={16} />
                    </Link>
                    <Link 
                      href={`/payroll-run?id=${selectedRunId}&viewEmployee=${employee.id}`}
                      className="p-2 text-on-surface-variant hover:text-secondary transition-all"
                      title={t(locale, "dashboard.viewPayrollDetails")}
                    >
                      <Eye size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-outline flex items-center justify-between text-sm text-on-surface-variant">
          <p>{t(locale, "dashboard.showing")} <span className="font-bold text-on-surface">{Math.min(employeeSummary.length, 5)}</span> {t(locale, "dashboard.of")} <span className="font-bold text-on-surface">{employeeSummary.length}</span> {t(locale, "dashboard.employees")}</p>
          <div className="flex items-center space-x-2">
            <button className="px-3 py-1 border border-outline rounded hover:bg-surface-container-low disabled:opacity-50" disabled>{t(locale, "dashboard.previous")}</button>
            <button className="px-3 py-1 bg-secondary text-white rounded font-bold">1</button>
            <button className="px-3 py-1 border border-outline rounded hover:bg-surface-container-low">2</button>
            <button className="px-3 py-1 border border-outline rounded hover:bg-surface-container-low">3</button>
            <span className="px-2">...</span>
            <button className="px-3 py-1 border border-outline rounded hover:bg-surface-container-low">25</button>
            <button className="px-3 py-1 border border-outline rounded hover:bg-surface-container-low">{t(locale, "dashboard.next")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
