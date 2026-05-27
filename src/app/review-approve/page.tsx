"use client";

import { useState, useEffect, Suspense } from "react";
import * as XLSX from 'xlsx';
import { computeHashFromPayrollData } from '@/lib/calcHash';
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Download,
  Eye,
  ChevronRight,
  Check,
  Shield,
  X,
  Clock,
  User,
  DollarSign,
  RefreshCw,
  Banknote,
  IdCard,
  Printer,
  FileSpreadsheet,
} from "lucide-react";
import { useCustomer } from "@/components/Sidebar";
import { getPayrollRunDetailsAction, getPayrollRunsByCustomerAction, approvePayrollAction, undoApprovalAction } from "@/lib/server-actions";
import { t, formatDateByLocale, formatDateTimeByLocale, formatCurrencyByLocale } from "@/lib/translations";

interface PayrollEmployee {
  id: number;
  employeeCode: string;
  employeeName: string;
  grossPay: number;
  css: number;
  isr: number;
  seguro: number;
  otherDeductions: number;
  totalDeductions: number;
  thirteenthMonth: number;
  netPay: number;
  hasException: boolean;
}

interface PayrollRun {
  id: number;
  payFrom: string | Date;
  payTo: string | Date;
  paymentDate: string | Date;
  status: string;
  calculatedAt?: string | Date | null;
  approvedAt?: string | Date | null;
  closedAt?: string | Date | null;
  calculatedByUser?: { fullName: string | null } | null;
  approvedByUser?: { fullName: string | null } | null;
  closedByUser?: { fullName: string | null } | null;
  payrollData: PayrollEmployee[];
  earnings?: any[];
  deductions?: any[];
}

function ReviewApproveContent() {
  const { currentCustomer, sessionUser } = useCustomer();
  const locale = sessionUser?.languagePref || "es";
  const searchParams = useSearchParams();
  const router = useRouter();
  const runId = searchParams.get("id");

  const [payrollRun, setPayrollRun] = useState<PayrollRun | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showUndoConfirmDialog, setShowUndoConfirmDialog] = useState(false);
  const [hashMismatch, setHashMismatch] = useState(false);
  const [missingMeta, setMissingMeta] = useState(false);
  const [selectedEmpDetail, setSelectedEmpDetail] = useState<any>(null);
  const [showAuditFlagsModal, setShowAuditFlagsModal] = useState(false);
  const [showAuditAnalysisModal, setShowAuditAnalysisModal] = useState(false);
  const [resolvedFlags, setResolvedFlags] = useState<string[]>([]);

  interface AuditFlag {
    id: string;
    title: string;
    description: string;
    severity: 'error' | 'warning';
    employeeId?: number;
  }
  const [auditFlags, setAuditFlags] = useState<AuditFlag[]>([]);

  useEffect(() => {
    if (!runId && currentCustomer) {
      getPayrollRunsByCustomerAction(currentCustomer.id).then(res => {
        if (res.success && res.runs && res.runs.length > 0) {
          const latest = res.runs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
          router.replace(`/payroll-run?id=${latest.id}`);
        }
      });
    } else if (runId && currentCustomer) {
      loadPayrollRun();
    }
  }, [runId, currentCustomer]);

  async function loadPayrollRun() {
    if (!runId) return;
    
    setIsLoading(true);
      try {
      const result = await getPayrollRunDetailsAction(parseInt(runId));
      if (result.success) {
        setPayrollRun(result.payrollRun);
        // Validate consistency against UI-provided calcHash
        const calcHashParam = searchParams.get('calcHash') || '';
        if (calcHashParam) {
          const serverData = result.payrollRun?.payrollData ?? [];
          const serverHash = serverData.length ? computeHashFromPayrollData(serverData) : '';
          setHashMismatch(serverHash !== calcHashParam);
        } else {
          setHashMismatch(false);
        }

        // Missing calculation metadata check
        const hasMetadata = Boolean(result.payrollRun?.calculatedAt) && Boolean(result.payrollRun?.payrollData);
        if (!hasMetadata) {
          console.error(`Missing calculation metadata for payroll run ${runId}`);
        }
        setMissingMeta(!hasMetadata);

        // Compute audit flags from real payroll data
        const flags: AuditFlag[] = [];
        const payrollData = result.payrollRun?.payrollData ?? [];
        const earnings = result.payrollRun?.earnings ?? [];
        const deductions = result.payrollRun?.deductions ?? [];

        payrollData.forEach((emp: any) => {
          if (emp.netPay < 0) {
            flags.push({ id: `neg-net-${emp.id}`, title: t(locale, "review.negativeNetPay"), description: t(locale, "review.negativeNetPayDesc").replace("{name}", emp.employeeName).replace("{amount}", new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(emp.netPay)), severity: 'error', employeeId: emp.id });
          }
          if (emp.css === 0 && emp.grossPay > 0) {
            flags.push({ id: `no-css-${emp.id}`, title: t(locale, "review.missingCss"), description: t(locale, "review.missingCssDesc").replace("{name}", emp.employeeName), severity: 'warning', employeeId: emp.id });
          }
        });

        // Check for missing employee data from earnings/deductions context
        const empEarningSet = new Set<number>();
        earnings.forEach((e: any) => empEarningSet.add(e.employeeId));
        deductions.forEach((d: any) => empEarningSet.add(d.employeeId));
        empEarningSet.forEach((empId) => {
          const emp = payrollData.find((p: any) => p.id === empId);
          if (!emp) return;
          const empEarnings = earnings.filter((e: any) => e.employeeId === empId);
          const empData = empEarnings[0]?.employee;
          if (empData && !empData.sssNumber) {
            flags.push({ id: `no-sss-${empId}`, title: t(locale, "review.missingSss"), description: t(locale, "review.missingSssDesc").replace("{name}", emp.employeeName), severity: 'error', employeeId: empId });
          }
          if (empData && !empData.identificationNumber) {
            flags.push({ id: `no-id-${empId}`, title: t(locale, "review.missingId"), description: t(locale, "review.missingIdDesc").replace("{name}", emp.employeeName), severity: 'error', employeeId: empId });
          }
        });

        // Check for excessive overtime (overtime earnings > 50% of base salary)
        payrollData.forEach((emp: any) => {
          const empEarnings = earnings.filter((e: any) => e.employeeId === emp.id);
          const overtimeTotal = empEarnings.filter((e: any) => e.earningCode?.includes('HORA_EXTRA') || e.earningCode?.includes('SALARIO_EXTRA')).reduce((s: number, e: any) => s + e.totalAmount, 0);
          const baseSalary = empEarnings.find((e: any) => e.earningCode === 'SALARIO' || e.earningCode === 'SALARIO_REGULAR')?.totalAmount || 0;
          if (overtimeTotal > baseSalary * 0.5 && baseSalary > 0) {
            flags.push({ id: `excess-ot-${emp.id}`, title: t(locale, "review.excessiveOt"), description: t(locale, "review.excessiveOtDesc").replace("{name}", emp.employeeName).replace("{amount}", new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(overtimeTotal)), severity: 'warning', employeeId: emp.id });
          }
        });

        setAuditFlags(flags);
      }
    } catch (error) {
      console.error("Failed to load payroll run:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApprove() {
    if (!payrollRun || !sessionUser) return;

    setIsApproving(true);
    try {
      const result = await approvePayrollAction(payrollRun.id, sessionUser.userId);
      if (result.success) {
        await loadPayrollRun(); // Reload to get updated status
      }
    } catch (error) {
      console.error("Failed to approve payroll:", error);
    } finally {
      setIsApproving(false);
      setShowConfirmDialog(false);
    }
  }

  async function handleUndoApproval() {
    if (!payrollRun || !sessionUser) return;

    setIsUndoing(true);
    try {
      const result = await undoApprovalAction(payrollRun.id, sessionUser.userId);
      if (result.success) {
        await loadPayrollRun(); // Reload to get updated status
      }
    } catch (error) {
      console.error("Failed to undo approval:", error);
    } finally {
      setIsUndoing(false);
      setShowUndoConfirmDialog(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!payrollRun) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold text-on-surface mb-2">Payroll Run Not Found</h2>
          <p className="text-muted-foreground">The requested payroll run could not be loaded.</p>
        </div>
      </div>
    );
  }

  const payrollData = payrollRun.payrollData || [];
  const totalGross = payrollData.reduce((sum, emp) => sum + emp.grossPay, 0);
  const totalDeductions = payrollData.reduce((sum, emp) => sum + emp.totalDeductions, 0);
  const totalNet = payrollData.reduce((sum, emp) => sum + emp.netPay, 0);
  const issuesCount = payrollData.filter(emp => emp.hasException).length;

  function formatCurrency(amount: number) {
    return formatCurrencyByLocale(amount, locale);
  }

  function exportEmployeeDetailToExcel(emp: any) {
    const empEarnings = (payrollRun?.earnings || []).filter((e: any) => e.employeeId === emp.id);
    const empDeductions = (payrollRun?.deductions || []).filter((d: any) => d.employeeId === emp.id);
    const monthlySalary = empEarnings.find((e: any) => e.earningCode === 'SALARIO' || e.earningCode === 'BASICO')?.employee?.baseSalary || 0;
    const hourlyRate = monthlySalary / 240;
    const wb = XLSX.utils.book_new();
    const rows: any[][] = [
      ['GPM Payroll - ' + t(locale, "payroll.employeeDetail")],
      [],
      [t(locale, "payroll.employee"), emp.employeeName],
      [t(locale, "payroll.code"), emp.employeeCode],
      [t(locale, "payroll.baseMonthlySalary"), monthlySalary],
      [t(locale, "payroll.hourlyRate"), hourlyRate],
      [],
      [t(locale, "payroll.earningsBreakdown")],
      [t(locale, "common.description"), t(locale, "common.code"), t(locale, "payroll.quantity"), t(locale, "payroll.unitRate"), t(locale, "payroll.subtotal")],
    ];
    empEarnings.forEach((e: any) => {
      rows.push([e.description || '', e.earningCode || '', e.quantity || 0, e.unitAmount, e.totalAmount]);
    });
    rows.push(['', '', '', t(locale, "payroll.totalGross"), emp.grossPay]);
    rows.push([]);
    rows.push([t(locale, "payroll.deductionsBreakdown")]);
    rows.push([t(locale, "common.description"), t(locale, "common.amount")]);
    empDeductions.forEach((d: any) => {
      rows.push([d.description || d.deductionCode || '', d.amount]);
    });
    rows.push(['', t(locale, "payroll.totalDeductionsLabel"), emp.totalDeductions]);
    rows.push([]);
    rows.push([t(locale, "payroll.netIncome"), emp.netPay]);
    rows.push([t(locale, "payroll.xiiiMonthAccrual"), emp.thirteenthMonth]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Employee Detail');
    XLSX.writeFile(wb, `employee_${emp.employeeCode}_${Date.now()}.xlsx`);
  }

  function printEmployeeDetail(emp: any) {
    const empEarnings = (payrollRun?.earnings || []).filter((e: any) => e.employeeId === emp.id);
    const empDeductions = (payrollRun?.deductions || []).filter((d: any) => d.employeeId === emp.id);
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    const earningsRows = empEarnings.map((e: any) => `
      <tr>
        <td style="padding:6px 10px;border:1px solid #ddd">${e.description || ''}<br><small style="color:#888">${e.earningCode || ''}</small></td>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:center">${e.quantity || 0}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:right">$${e.unitAmount.toFixed(2)}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:right">$${e.totalAmount.toFixed(2)}</td>
      </tr>
    `).join('');
    const deductionsRows = empDeductions.map((d: any) => `
      <tr>
        <td style="padding:6px 10px;border:1px solid #ddd">${d.description || d.deductionCode || ''}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:right">-$${d.amount.toFixed(2)}</td>
      </tr>
    `).join('');
    printWin.document.write(`
      <html><head><title>${t(locale, "payroll.employeeDetail")} - ${emp.employeeName}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #222; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { background: #f0f0f0; padding: 8px 10px; border:1px solid #ddd; font-size: 11px; text-transform: uppercase; text-align: left; }
        td { padding: 6px 10px; border:1px solid #ddd; font-size: 13px; }
        .total { font-weight: bold; background: #f8f8f8; }
        .net { font-size: 24px; font-weight: bold; color: #0051d5; }
        .footer { border-top: 2px solid #0051d5; padding-top: 16px; display: flex; justify-content: space-between; }
        @media print { body { margin: 20px; } }
      </style></head><body>
      <h1>${emp.employeeName}</h1>
      <div class="meta">${t(locale, "payroll.code")}: ${emp.employeeCode}</div>
      <h3 style="margin:0 0 8px;font-size:14px">${t(locale, "payroll.earnings")}</h3>
      <table><thead><tr>
        <th>${t(locale, "common.description")}</th><th style="text-align:center">${t(locale, "payroll.quantity")}</th><th style="text-align:right">${t(locale, "payroll.unitRate")}</th><th style="text-align:right">${t(locale, "payroll.subtotal")}</th>
      </tr></thead><tbody>${earningsRows}</tbody>
      <tfoot><tr class="total"><td colspan="3" style="text-align:right">${t(locale, "payroll.totalGross")}</td><td style="text-align:right">$${emp.grossPay.toFixed(2)}</td></tr></tfoot></table>
      <h3 style="margin:0 0 8px;font-size:14px">${t(locale, "payroll.deductions")}</h3>
      <table><thead><tr>
        <th>${t(locale, "common.description")}</th><th style="text-align:right">${t(locale, "common.amount")}</th>
      </tr></thead><tbody>${deductionsRows}</tbody>
      <tfoot><tr class="total"><td style="text-align:right">${t(locale, "payroll.totalDeductionsLabel")}</td><td style="text-align:right">-$${emp.totalDeductions.toFixed(2)}</td></tr></tfoot></table>
      <div class="footer">
        <div><div style="font-size:11px;color:#888">${t(locale, "payroll.netIncome")}</div><div class="net">$${emp.netPay.toFixed(2)}</div></div>
        <div style="text-align:right"><div style="font-size:11px;color:#888">${t(locale, "payroll.xiiiMonthAccrual")}</div><div style="font-size:18px;font-weight:bold">$${emp.thirteenthMonth.toFixed(2)}</div></div>
      </div>
      <div style="text-align:center;font-size:11px;color:#aaa;margin-top:40px">GPM Payroll System · ${t(locale, "payroll.generated")} ${formatDateByLocale(new Date(), locale)}</div>
      </body></html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 500);
  }

  function formatDate(dateStr: string) {
    return formatDateTimeByLocale(new Date(dateStr), locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const isApproved = payrollRun.status === 'closed';
  const canApprove = sessionUser && sessionUser.roleLevel >= 4 && !isApproved && !hashMismatch && !missingMeta;
  const canUndoApproval = sessionUser && sessionUser.roleLevel >= 4 && isApproved && !hashMismatch && !missingMeta;

  return (
    <div className="ml-0 p-8 max-w-[1440px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between mb-stack_lg">
        <div>
          <nav className="flex items-center space-x-2 text-slate-400 text-xs mb-2 font-label-bold">
            <span>{t(locale, "review.payrollPeriods")}</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-secondary font-bold">
              {formatDateByLocale(new Date(payrollRun.payFrom), locale, { month: 'long', year: 'numeric' })} {t(locale, "common.period")}
            </span>
          </nav>
          <h2 className="font-display-lg text-display-lg text-on-surface">{t(locale, "review.roleUp")}</h2>
          <p className="text-on-surface-variant font-body-base mt-1">
            {t(locale, "dashboard.reviewCalculations")} {formatDateByLocale(new Date(payrollRun.payTo), locale)}
          </p>
          {runId && (
            <div className="mt-2">
              <span className="px-3 py-1 text-xs rounded-full bg-surface-container-low border border-outline text-on-surface-variant">{t(locale, "payroll.runId")} {runId}</span>
            </div>
          )}
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <button
            onClick={() => router.push(`/payroll-run?id=${payrollRun.id}&step=4`)}
            className="px-6 py-2.5 border border-slate-200 text-slate-700 font-semibold text-sm rounded hover:bg-slate-50 transition-colors flex items-center">
            <ArrowLeft size={16} className="mr-2" />
            {t(locale, "review.backToPayrollRun")}
          </button>
          <button
            onClick={() => setShowAuditAnalysisModal(true)}
            className="px-6 py-2.5 border border-slate-200 text-slate-700 font-semibold text-sm rounded hover:bg-slate-50 transition-colors flex items-center">
            <BarChart3 size={16} className="mr-2" />
            {t(locale, "review.viewAuditAnalysis")}
          </button>
          {canApprove && (
            <button 
              onClick={() => setShowConfirmDialog(true)}
              disabled={isApproving}
              className="px-6 py-2.5 bg-secondary text-white font-semibold text-sm rounded hover:bg-blue-700 transition-colors shadow-md flex items-center disabled:opacity-50"
            >
              <CheckCircle2 size={16} className="mr-2" />
              {isApproving ? t(locale, "review.approving") : t(locale, "review.approveClose")}
            </button>
          )}
          {canUndoApproval && (
            <button 
              onClick={() => setShowUndoConfirmDialog(true)}
              disabled={isUndoing}
              className="px-6 py-2.5 border border-red-200 text-red-700 font-semibold text-sm rounded hover:bg-red-50 transition-colors flex items-center disabled:opacity-50"
            >
              <X size={16} className="mr-2" />
              {isUndoing ? t(locale, "review.undoing") : t(locale, "review.undoApproveAction")}
            </button>
          )}
        </div>
      </section>

      {/* Alert / Audit Flags */}
      {auditFlags.length > 0 && (
        <div className="mb-gutter p-4 bg-amber-50 border-l-4 border-amber-400 flex items-start space-x-4">
          <AlertTriangle size={20} className="text-amber-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-900">{t(locale, "review.auditFlagsRequired")}</h4>
            <p className="text-sm text-amber-800">
              {t(locale, "review.issuesRequiringReview").replace("{count}", String(auditFlags.length).padStart(2, '0'))}
              {auditFlags.filter(f => f.severity === 'error').length > 0 && ` ${t(locale, "review.errorsAndWarnings").replace("{errors}", String(auditFlags.filter(f => f.severity === 'error').length)).replace("{warnings}", String(auditFlags.filter(f => f.severity === 'warning').length))}`}
            </p>
          </div>
          <button
            onClick={() => setShowAuditFlagsModal(true)}
            className="text-amber-900 text-sm font-bold underline hover:no-underline">{t(locale, "review.resolveNow")}</button>
        </div>
      )}

      <div className="grid grid-cols-12 gap-gutter items-start">
        {/* Left Column (Main Stats & Data) */}
        <div className="col-span-12 xl:col-span-9 space-y-gutter">
          {/* KPI Card Row */}
      {hashMismatch && (
        <div className="col-span-12 mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {t(locale, "review.hashMismatch")}
        </div>
      )}
      {missingMeta && (
        <div className="col-span-12 mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
          {t(locale, "review.missingMeta")}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm">
              <span className="font-label-bold text-slate-500 uppercase">{t(locale, "review.totalGrossPay")}</span>
              <div className="mt-2 flex items-baseline justify-between">
                <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalGross)}</h3>
                <span className="text-xs font-bold text-emerald-600 flex items-center">
                  <TrendingUp size={12} className="mr-0.5" />
                  2.4%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{t(locale, "review.vsPrevPeriod")}</p>
            </div>
            <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm">
              <span className="font-label-bold text-slate-500 uppercase">{t(locale, "review.totalDeductions")}</span>
              <div className="mt-2 flex items-baseline justify-between">
                <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalDeductions)}</h3>
                <span className="text-xs font-bold text-rose-600 flex items-center">
                  <TrendingUp size={12} className="mr-0.5" />
                  0.8%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{t(locale, "review.benefitsTaxes")}</p>
            </div>
            <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-sm">
              <span className="font-label-bold text-slate-500 uppercase">{t(locale, "review.netDisbursement")}</span>
              <div className="mt-2 flex items-baseline justify-between">
                <h3 className="text-2xl font-bold text-secondary">{formatCurrency(totalNet)}</h3>
                <span className="text-xs font-bold text-emerald-600 flex items-center">
                  <TrendingDown size={12} className="mr-0.5" />
                  1.2%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{t(locale, "review.cashFlowReq")}</p>
            </div>
          </div>

          {/* Employee Payroll Breakdown Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="font-title-sm text-slate-900">{t(locale, "review.employeeBreakdown")}</h4>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="pl-9 pr-4 py-1.5 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none w-64"
                    placeholder={t(locale, "review.filterEmployees")}
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
                    <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "review.employee")}</th>
                    <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "review.grossPay")}</th>
                    <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "review.deductions")}</th>
                    <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "review.netPay")}</th>
                    <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "review.variance")}</th>
                    <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant text-right">{t(locale, "review.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payrollData.map((emp) => (
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
                      <td className="px-6 py-4 font-data-mono text-sm text-on-surface">{formatCurrency(emp.grossPay)}</td>
                      <td className="px-6 py-4 font-data-mono text-sm text-error">{formatCurrency(emp.totalDeductions)}</td>
                      <td className="px-6 py-4 font-bold text-on-surface">{formatCurrency(emp.netPay)}</td>
                      <td className="px-6 py-4">
                        <span className="font-data-mono text-sm text-emerald-600">
                          +0.0%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedEmpDetail(emp)}
                          className="p-1 text-on-surface-variant hover:text-secondary transition-all">
                          <Eye size={16} />
                        </button>
                        {emp.hasException && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                              {t(locale, "review.issue")}
                            </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (Audit & Actions) */}
        <div className="col-span-12 xl:col-span-3 space-y-6">
          {/* Audit Flags Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-title-sm text-title-sm text-on-surface">{t(locale, "review.auditFlags")}</h3>
              <span className="bg-error-container text-error text-xs font-bold px-2 py-1 rounded">{auditFlags.length} {t(locale, auditFlags.length === 1 ? "review.item" : "review.items")}</span>
            </div>
            <div className="space-y-3">
              {auditFlags.length === 0 ? (
                <div className="flex items-center gap-3 p-3 bg-green-50/50 rounded-lg border border-green-100">
                  <CheckCircle2 size={18} className="text-green-600" />
                  <p className="text-on-surface text-sm font-semibold">{t(locale, "review.noFlags")}</p>
                </div>
              ) : (
                auditFlags.slice(0, 5).map((flag) => (
                  <div
                    key={flag.id}
                    onClick={() => setShowAuditFlagsModal(true)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-opacity-80 transition-colors ${
                      flag.severity === 'error' ? 'bg-red-50/50 border-red-100' : 'bg-amber-50/50 border-amber-100'
                    }`}>
                    <AlertTriangle size={18} className={flag.severity === 'error' ? 'text-error' : 'text-amber-500'} />
                    <div className="flex-1">
                      <p className="text-on-surface text-sm font-semibold">{flag.title}</p>
                      <p className="text-on-surface-variant text-xs truncate">{flag.description}</p>
                    </div>
                    <ChevronRight size={16} className="text-on-surface-variant" />
                  </div>
                ))
              )}
              {auditFlags.length > 5 && (
                <button onClick={() => setShowAuditFlagsModal(true)} className="w-full text-center text-xs font-bold text-secondary hover:underline py-2">
                  {t(locale, "review.viewAllFlags").replace("{count}", String(auditFlags.length))}
                </button>
              )}
            </div>
          </div>

          {/* Approval Status Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="font-title-sm text-title-sm text-on-surface mb-4">{t(locale, "review.approvalStatus")}</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                <span className="text-sm text-on-surface-variant">{t(locale, "review.status")}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isApproved 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {isApproved ? t(locale, "review.approved") : t(locale, "review.pending")}
                </span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                <span className="text-sm text-on-surface-variant">{t(locale, "review.employees")}</span>
                <span className="font-data-mono font-bold text-on-surface">{payrollData.length}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                <span className="text-sm text-on-surface-variant">{t(locale, "review.totalAmount")}</span>
                <span className="font-data-mono font-bold text-on-surface">{formatCurrency(totalNet)}</span>
              </div>
              
              {/* Approval Metadata */}
              {isApproved && payrollRun.closedAt && (
                <div className="pb-3 border-b border-outline-variant">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-on-surface-variant">{t(locale, "review.approvedBy")}</span>
                    <span className="font-medium text-on-surface text-sm">{payrollRun.closedByUser?.fullName || t(locale, "review.system")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-on-surface-variant">{t(locale, "review.approvedAt")}</span>
                    <span className="font-data-mono text-on-surface text-sm">{payrollRun.closedAt ? formatDate(payrollRun.closedAt.toString()) : t(locale, "review.na")}</span>
                  </div>
                </div>
              )}
              
              {canApprove && (
                <button 
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={isApproving}
                  className="w-full py-2.5 bg-secondary text-white font-semibold text-sm rounded hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check size={16} />
                  {isApproving ? t(locale, "review.approving") : t(locale, "review.approveClose")}
                </button>
              )}
              
              {canUndoApproval && (
                <button 
                  onClick={() => setShowUndoConfirmDialog(true)}
                  disabled={isUndoing}
                  className="w-full py-2.5 border border-red-200 text-red-700 font-semibold text-sm rounded hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <X size={16} />
                  {isUndoing ? t(locale, "review.undoing") : t(locale, "review.undoApproveAction")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Approval */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 size={24} className="text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface">{t(locale, "review.confirmApproval")}</h3>
                  <p className="text-sm text-on-surface-variant">{t(locale, "review.confirmApprovalDesc")}</p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-sm text-on-surface-variant">{t(locale, "review.period")}</span>
                  <span className="text-sm font-medium">{new Date(payrollRun.payFrom).toLocaleDateString()} - {new Date(payrollRun.payTo).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-on-surface-variant">{t(locale, "review.employeesCount")}</span>
                  <span className="text-sm font-medium">{payrollData.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-on-surface-variant">{t(locale, "review.totalAmountColon")}</span>
                  <span className="text-sm font-medium">{formatCurrency(totalNet)}</span>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant mb-6">
                {t(locale, "review.closeWarning")} {t(locale, "review.undoInfo")}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 px-4 py-2 border border-outline text-on-surface font-medium rounded-lg hover:bg-surface-container transition-colors"
                >
                  {t(locale, "payroll.cancel")}
                </button>
                <button 
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="flex-1 px-4 py-2 bg-secondary text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isApproving ? t(locale, "review.approving") : t(locale, "review.confirmApprovalBtn")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Undo Approval */}
      {showUndoConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <X size={24} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface">Undo Approval</h3>
                  <p className="text-sm text-on-surface-variant">Revert payroll period to calculated status</p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-sm text-on-surface-variant">Current Status:</span>
                  <span className="text-sm font-medium text-green-600">APPROVED</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-on-surface-variant">New Status:</span>
                  <span className="text-sm font-medium text-blue-600">CALCULATED</span>
                </div>
              </div>
              <p className="text-sm text-red-600 mb-6">
                Warning: This will allow modifications to the payroll data. 
                Approval metadata will be removed.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowUndoConfirmDialog(false)}
                  className="flex-1 px-4 py-2 border border-outline text-on-surface font-medium rounded-lg hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUndoApproval}
                  disabled={isUndoing}
                  className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isUndoing ? "Undoing..." : "Confirm Undo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Detail Modal */}
      {selectedEmpDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-outline flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-on-surface">Employee Payroll Details</h2>
                <p className="text-xs text-on-surface-variant">Detailed calculation for the current period</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => exportEmployeeDetailToExcel(selectedEmpDetail)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-low hover:bg-surface-container rounded-lg transition-all">
                  <FileSpreadsheet size={16} />
                  Export
                </button>
                <button onClick={() => printEmployeeDetail(selectedEmpDetail)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-low hover:bg-surface-container rounded-lg transition-all">
                  <Printer size={16} />
                  Print
                </button>
                <button onClick={() => setSelectedEmpDetail(null)} className="p-2 hover:bg-surface-container rounded-lg transition-all">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-8">
              {/* Employee Header */}
              <div className="flex items-center gap-4 bg-surface-container-lowest p-4 rounded-xl border border-outline/5">
                <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center text-secondary text-2xl font-black">
                  {selectedEmpDetail.employeeName.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-on-surface tracking-tight">{selectedEmpDetail.employeeName}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="px-2 py-0.5 bg-surface-container rounded text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{selectedEmpDetail.employeeCode}</span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase">
                      <Shield size={10} />
                      Validated Record
                    </span>
                  </div>
                </div>
              </div>

              {/* Calculation Metadata */}
              {payrollRun.calculatedAt && (
                <div className="flex items-center justify-between bg-surface-container-lowest border border-outline border-dashed rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-on-surface-variant" />
                    <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t(locale, "payroll.calcAudit")}</span>
                  </div>
                  <div className="flex items-center gap-6 text-xs text-on-surface">
                    <div>
                      <span className="font-semibold text-on-surface-variant mr-2">{t(locale, "review.generated")}</span>
                      {formatDateTimeByLocale(new Date(payrollRun.calculatedAt!), locale)}
                    </div>
                    {payrollRun.calculatedByUser && (
                      <div>
                        <span className="font-semibold text-on-surface-variant mr-2">{t(locale, "review.operator")}</span>
                        <span className="font-medium text-secondary">{payrollRun.calculatedByUser.fullName}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Earnings from this employee */}
              {(() => {
                const empEarnings = (payrollRun.earnings || []).filter((e: any) => e.employeeId === selectedEmpDetail.id);
                const empDeductions = (payrollRun.deductions || []).filter((d: any) => d.employeeId === selectedEmpDetail.id);
                const monthlySalary = empEarnings.find((e: any) => e.earningCode === 'SALARIO' || e.earningCode === 'BASICO')?.employee?.baseSalary || 0;
                const hourlyRate = monthlySalary / 240;

                return (
                  <>
                    {/* Calculation Basis */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-surface-container-low p-4 rounded-xl border border-outline/10 flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-secondary border border-outline/20">
                          <DollarSign size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Base Monthly Salary</p>
                          <p className="font-bold text-lg text-on-surface">{formatCurrency(monthlySalary)}</p>
                        </div>
                      </div>
                      <div className="bg-surface-container-low p-4 rounded-xl border border-outline/10 flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-secondary border border-outline/20">
                          <Clock size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Calculated Hourly Rate</p>
                          <p className="font-bold text-lg text-on-surface">{formatCurrency(hourlyRate)} <span className="text-[10px] font-normal text-on-surface-variant">/ hour (240h divisor)</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Earnings Detail */}
                    {empEarnings.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <h4 className="font-label-bold text-on-surface-variant uppercase flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            Earnings & Hours Breakdown
                          </h4>
                        </div>
                        <div className="border border-outline rounded-xl overflow-hidden bg-white shadow-sm">
                          <table className="w-full text-left border-collapse text-sm">
                            <thead className="bg-surface-container-low border-b border-outline">
                              <tr>
                                <th className="px-4 py-3 font-bold text-[11px] uppercase text-on-surface-variant">Item Description</th>
                                <th className="px-4 py-3 font-bold text-[11px] uppercase text-on-surface-variant text-center">Qty/Hours</th>
                                <th className="px-4 py-3 font-bold text-[11px] uppercase text-on-surface-variant text-right">Unit Rate</th>
                                <th className="px-4 py-3 font-bold text-[11px] uppercase text-on-surface-variant text-right">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-outline">
                              {empEarnings.map((e: any, idx: number) => (
                                <tr key={idx} className="hover:bg-surface-container-lowest transition-colors text-[13px]">
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-on-surface">{e.description}</div>
                                    <div className="text-[10px] text-on-surface-variant">{e.earningCode}</div>
                                  </td>
                                  <td className="px-4 py-3 text-center font-data-mono font-medium">{e.quantity}</td>
                                  <td className="px-4 py-3 text-right font-data-mono">{formatCurrency(e.unitAmount)}</td>
                                  <td className="px-4 py-3 text-right font-bold font-data-mono text-on-surface">{formatCurrency(e.totalAmount)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-green-50/30 border-t border-outline">
                              <tr className="font-bold">
                                <td colSpan={3} className="px-4 py-4 text-right text-on-surface-variant uppercase tracking-wider text-xs">Total Gross Income</td>
                                <td className="px-4 py-4 text-right text-xl text-secondary">{formatCurrency(selectedEmpDetail.grossPay)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Deductions Detail */}
                    {empDeductions.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-label-bold text-on-surface-variant uppercase flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                          Statutory Deductions & Adjustments
                        </h4>
                        <div className="border border-outline rounded-xl overflow-hidden bg-white shadow-sm">
                          <table className="w-full text-left border-collapse text-sm">
                            <thead className="bg-surface-container-low border-b border-outline">
                              <tr>
                                <th className="px-4 py-3 font-bold text-[11px] uppercase text-on-surface-variant">Description</th>
                                <th className="px-4 py-3 font-bold text-[11px] uppercase text-on-surface-variant text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-outline">
                              {empDeductions.map((d: any, idx: number) => (
                                <tr key={idx} className="hover:bg-surface-container-lowest transition-colors">
                                  <td className="px-4 py-3 text-on-surface">{d.description || d.deductionCode}</td>
                                  <td className="px-4 py-3 text-right font-bold font-data-mono text-error">{formatCurrency(d.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-red-50/30 border-t border-outline">
                              <tr className="font-bold">
                                <td className="px-4 py-4 text-right text-on-surface-variant uppercase tracking-wider text-xs">Total Deductions</td>
                                <td className="px-4 py-4 text-right text-lg text-error">{formatCurrency(selectedEmpDetail.totalDeductions)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Final Reconciliation */}
                    <div className="bg-secondary p-6 rounded-2xl flex justify-between items-center text-white shadow-xl">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1">Final Net Income</p>
                        <h3 className="text-3xl font-black tracking-tight">{formatCurrency(selectedEmpDetail.netPay)}</h3>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1">XIII Month Accrual</p>
                        <p className="text-xl font-bold font-data-mono">{formatCurrency(selectedEmpDetail.thirteenthMonth)}</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Audit Flags Resolution Modal */}
      {showAuditFlagsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl">
            <div className="p-6 border-b border-outline flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface">{t(locale, "review.resolveAuditFlags")}</h3>
                  <p className="text-sm text-on-surface-variant">{t(locale, "review.resolveAuditFlagsDesc")}</p>
                </div>
              </div>
              <button onClick={() => setShowAuditFlagsModal(false)} className="p-2 hover:bg-surface-container rounded-lg transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
              {auditFlags.length === 0 ? (
                <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-200">
                  <CheckCircle2 size={20} className="text-green-600" />
                  <div>
                    <p className="font-semibold text-on-surface">{t(locale, "review.noIssues")}</p>
                    <p className="text-xs text-on-surface-variant">{t(locale, "review.noIssuesDesc")}</p>
                  </div>
                </div>
              ) : (
                auditFlags.map(flag => {
                  const isResolved = resolvedFlags.includes(flag.id);
                  return (
                    <div key={flag.id} className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${isResolved ? 'bg-green-50 border-green-200' : flag.severity === 'error' ? 'bg-red-50/50 border-red-100' : 'bg-amber-50/50 border-amber-100'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isResolved ? 'bg-green-100 text-green-600' : 'bg-white text-red-500'}`}>
                        {isResolved ? <Check size={16} /> : <AlertTriangle size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-on-surface text-sm">{flag.title}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">{flag.description}</p>
                      </div>
                      <button
                        onClick={() => {
                          if (isResolved) {
                            setResolvedFlags(prev => prev.filter(f => f !== flag.id));
                          } else {
                            setResolvedFlags(prev => [...prev, flag.id]);
                          }
                        }}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${isResolved ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-white border border-outline text-on-surface hover:bg-surface-container'}`}
                      >
                        {isResolved ? <><Check size={14} /> {t(locale, "review.resolved")}</> : t(locale, "review.resolve")}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-6 bg-surface-container-low border-t border-outline flex justify-between items-center">
              <span className="text-xs text-on-surface-variant">{t(locale, "review.flagsResolved").replace("{resolved}", String(resolvedFlags.length)).replace("{total}", String(auditFlags.length))}</span>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAuditFlagsModal(false)}
                  className="px-4 py-2 border border-outline text-on-surface font-medium rounded-lg hover:bg-surface-container transition-colors text-sm"
                >
                  Close
                </button>
                {resolvedFlags.length === auditFlags.length && auditFlags.length > 0 && (
                  <button
                    onClick={() => { setShowAuditFlagsModal(false); }}
                    className="px-4 py-2 bg-secondary text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                  >
                    <Check size={16} />
                    {t(locale, "review.allFlagsResolved")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Analysis Modal */}
      {showAuditAnalysisModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-outline flex justify-between items-center sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <BarChart3 size={20} className="text-secondary" />
                <div>
                  <h3 className="text-lg font-bold text-on-surface">{t(locale, "review.auditAnalysis")}</h3>
                  <p className="text-sm text-on-surface-variant">{t(locale, "review.auditAnalysisDesc")}</p>
                </div>
              </div>
              <button onClick={() => setShowAuditAnalysisModal(false)} className="p-2 hover:bg-surface-container rounded-lg transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Period Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline/10">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "review.periodLabel")}</p>
                  <p className="font-bold text-lg text-on-surface mt-1">
                    {formatDateByLocale(new Date(payrollRun.payFrom), locale)} - {formatDateByLocale(new Date(payrollRun.payTo), locale)}
                  </p>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline/10">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "review.employees")}</p>
                  <p className="font-bold text-lg text-on-surface mt-1">{payrollData.length}</p>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline/10">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "review.statusLabel")}</p>
                  <p className={`font-bold text-lg mt-1 ${isApproved ? 'text-green-600' : 'text-blue-600'}`}>
                    {isApproved ? t(locale, "review.approved") : t(locale, "review.pending")}
                  </p>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-white border border-outline rounded-xl overflow-hidden">
                <div className="px-6 py-4 bg-surface-container-low border-b border-outline">
                  <h4 className="font-label-bold text-on-surface-variant uppercase text-xs tracking-wider">{t(locale, "review.financialSummary")}</h4>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
                    <span className="text-sm text-on-surface-variant">{t(locale, "review.totalGrossPay")}</span>
                    <span className="font-data-mono font-bold text-lg text-on-surface">{formatCurrency(totalGross)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
                    <span className="text-sm text-on-surface-variant">{t(locale, "review.totalDeductions")}</span>
                    <span className="font-data-mono font-bold text-lg text-error">{formatCurrency(totalDeductions)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-label-bold text-on-surface">{t(locale, "review.netDisbursement")}</span>
                    <span className="font-data-mono font-bold text-2xl text-secondary">{formatCurrency(totalNet)}</span>
                  </div>
                </div>
              </div>

              {/* Comparison to Previous Period (mock) */}
              <div className="bg-white border border-outline rounded-xl overflow-hidden">
                <div className="px-6 py-4 bg-surface-container-low border-b border-outline">
                  <h4 className="font-label-bold text-on-surface-variant uppercase text-xs tracking-wider">{t(locale, "review.popComparison")}</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-surface-container-lowest border-b border-outline">
                      <tr>
                        <th className="px-6 py-3 font-bold text-[11px] uppercase text-on-surface-variant">{t(locale, "review.metric")}</th>
                        <th className="px-6 py-3 font-bold text-[11px] uppercase text-on-surface-variant text-right">{t(locale, "review.prevPeriod")}</th>
                        <th className="px-6 py-3 font-bold text-[11px] uppercase text-on-surface-variant text-right">{t(locale, "review.currPeriod")}</th>
                        <th className="px-6 py-3 font-bold text-[11px] uppercase text-on-surface-variant text-right">{t(locale, "review.variance")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline">
                      {[
                        { label: t(locale, "review.grossPay"), prev: totalGross * 0.976, curr: totalGross, fmt: (v: number) => formatCurrency(v) },
                        { label: t(locale, "review.deductions"), prev: totalDeductions * 0.992, curr: totalDeductions, fmt: (v: number) => formatCurrency(v) },
                        { label: t(locale, "review.netPay"), prev: totalNet * 0.988, curr: totalNet, fmt: (v: number) => formatCurrency(v) },
                      ].map((row, i) => {
                        const variance = row.curr - row.prev;
                        const pct = row.prev !== 0 ? ((variance / row.prev) * 100) : 0;
                        return (
                          <tr key={i} className="hover:bg-surface-container-lowest transition-colors">
                            <td className="px-6 py-4 font-medium text-on-surface">{row.label}</td>
                            <td className="px-6 py-4 text-right font-data-mono text-on-surface-variant">{row.fmt(row.prev)}</td>
                            <td className="px-6 py-4 text-right font-data-mono font-semibold text-on-surface">{row.fmt(row.curr)}</td>
                            <td className="px-6 py-4 text-right">
                              <span className={`font-data-mono text-sm font-semibold ${pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Calculation Audit Info */}
              {payrollRun.calculatedAt && (
                <div className="flex items-center justify-between bg-surface-container-lowest border border-outline border-dashed rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-on-surface-variant" />
                    <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t(locale, "payroll.calcAudit")}</span>
                  </div>
                  <div className="flex items-center gap-6 text-xs text-on-surface">
                    <div>
                      <span className="font-semibold text-on-surface-variant mr-2">{t(locale, "review.generated")}</span>
                      {formatDateTimeByLocale(new Date(payrollRun.calculatedAt!), locale)}
                    </div>
                    {payrollRun.calculatedByUser && (
                      <div>
                        <span className="font-semibold text-on-surface-variant mr-2">{t(locale, "review.operator")}</span>
                        <span className="font-medium text-secondary">{payrollRun.calculatedByUser.fullName}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewApprovePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReviewApproveContent />
    </Suspense>
  );
}
