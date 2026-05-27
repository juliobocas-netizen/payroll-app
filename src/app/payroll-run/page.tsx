"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import * as XLSX from 'xlsx';
import { useSearchParams, useRouter } from "next/navigation";
import { getPayrollRunDetailsAction, getPayCalendarsAction, createPayrollRunAction, getPayrollInputsAction, savePayrollInputsAction, calculatePayrollAction, getEmployeesAction, getPayrollRunsByCustomerAction, clearPayrollInputsAction, acknowledgeWarningAction, getAcknowledgedWarningsAction, checkSalaryVariationsAction, deletePayrollRunAction } from "@/lib/server-actions";
import { computeHashFromPayrollData } from '@/lib/calcHash';
import {
  Calendar,
  Upload,
  Calculator,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  AlertTriangle,
  Download,
  Eye,
  FileText,
  DollarSign,
  Users,
  User,
  Clock,
  Shield,
  X,
  Check,
  RefreshCw,
  MessageSquare,
  ChevronDown,
  Trash2,
  Printer,
} from "lucide-react";
import { useCustomer } from "@/components/Sidebar";
import { t, formatDateByLocale, formatDateTimeByLocale, formatCurrencyByLocale } from "@/lib/translations";

interface PayrollLine {
  id: number;
  employeeCode: string;
  employeeName: string;
  baseSalary: number;
  overtime: number;
  bonuses: number;
  grossPay: number;
  css: number;
  seguro: number;
  isr: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  hasException: boolean;
  thirteenthMonth: number;
  earnings: any[];
  deductions: any[];
  monthlySalary: number;
  hourlyRate: number;
}

export default function PayrollRunPage() {
  const { sessionUser } = useCustomer();
  const locale = sessionUser?.languagePref || "es";
  return (
    <Suspense fallback={<div>{t(locale, "payroll.loading")}</div>}>
      <PayrollRunContent />
    </Suspense>
  );
}

function PayrollRunContent() {
  const { currentCustomer, sessionUser } = useCustomer();
  const locale = sessionUser?.languagePref || "es";
  const searchParams = useSearchParams();
  const router = useRouter();
  const runId = searchParams.get("id");

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [existingRuns, setExistingRuns] = useState<any[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");
  const [selectedExistingRunId, setSelectedExistingRunId] = useState<string>("");
  
  // Form fields
  const [payFrom, setPayFrom] = useState("");
  const [payTo, setPayTo] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [notes, setNotes] = useState("");

  const [isCalculating, setIsCalculating] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollLine | null>(null);
  const [payrollData, setPayrollData] = useState<PayrollLine[]>([]);
  const [payrollInputs, setPayrollInputs] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [inputMode, setInputMode] = useState<'hours' | 'amount'>('hours');
  const [inputMethod, setInputMethod] = useState<'manual' | 'excel'>('manual');
  const [showEmployeeSearch, setShowEmployeeSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isLoadingInputs, setIsLoadingInputs] = useState(false);
  const [selectedNoteInput, setSelectedNoteInput] = useState<{ employeeCode: string, employeeName: string } | null>(null);

  const [warnings, setWarnings] = useState<any[]>([]);
  const [acknowledgedWarnings, setAcknowledgedWarnings] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Check if there's data in hours or amounts mode
  const hasHoursData = payrollInputs.some(input => 
    (input.regularHours && input.regularHours > 0) || 
    (input.overtimeHours && input.overtimeHours > 0) || 
    (input.holidayHours && input.holidayHours > 0) || 
    (input.restDayHours && input.restDayHours > 0)
  );
  
  const hasAmountsData = payrollInputs.some(input => 
    (input.regularAmount && input.regularAmount > 0) || 
    (input.overtimeAmount && input.overtimeAmount > 0) || 
    (input.holidayAmount && input.holidayAmount > 0) || 
    (input.thirteenthAmount && input.thirteenthAmount > 0) || 
    (input.bonusAmount && input.bonusAmount > 0) || 
    (input.otherAmount && input.otherAmount > 0)
  );

  const canSwitchToHours = !hasAmountsData;
  const canSwitchToAmounts = !hasHoursData;

  useEffect(() => {
    const loadWarnings = async () => {
      if (currentCustomer && currentStep === 3 && payrollInputs.length > 0) {
        const res = await getAcknowledgedWarningsAction(currentCustomer.id);
        if (res.success && res.warnings) {
          setAcknowledgedWarnings(res.warnings);
          
          const calculatedWarnings: any[] = [];
          const empGroups = payrollInputs.reduce((acc, curr) => {
            if (!acc[curr.employeeCode]) acc[curr.employeeCode] = [];
            acc[curr.employeeCode].push(curr);
            return acc;
          }, {} as Record<string, any[]>);

          Object.keys(empGroups).forEach(code => {
            const inputs = empGroups[code];
            const empName = inputs[0].employee?.firstName ? `${inputs[0].employee.firstName} ${inputs[0].employee.lastName}` : code;
            const empId = inputs[0].employeeId;
            if (!empId) return;

            let totalReg = 0;
            let totalOT = 0;
            let totalHours = 0;
            let totalGross = 0;

            inputs.forEach((i: any) => {
              if (i.inputType === 'hours') {
                totalReg += i.regularHours || 0;
                totalOT += i.overtimeHours || 0;
                totalHours += (i.regularHours || 0) + (i.overtimeHours || 0) + (i.holidayHours || 0) + (i.restDayHours || 0);
              } else {
                // For amount inputs, we need to calculate equivalent hours for validation
                // This is approximate since we don't have the hourly rate here
                totalGross += (i.regularAmount || 0) + (i.overtimeAmount || 0) + (i.holidayAmount || 0) + (i.otherAmount || 0);
              }
            });

            // Warning: Exceed 80 hours per week
            if (totalHours > 80) {
              calculatedWarnings.push({ 
                employeeId: empId, 
                employeeCode: code, 
                employeeName: empName, 
                type: "EXCEED_80_HOURS", 
                message: `Total hours worked (${totalHours.toFixed(1)}) exceeds 80 hours per week limit.`, 
                severity: "warning"
              });
            }

            // Observation: Overtime exceeds 10 hours
            if (totalOT > 10) {
              calculatedWarnings.push({ 
                employeeId: empId, 
                employeeCode: code, 
                employeeName: empName, 
                type: "EXCESS_OT_OBSERVATION", 
                message: `Overtime hours (${totalOT.toFixed(1)}) exceed 10 hours limit.`, 
                severity: "observation"
              });
            }

            // Legacy warnings
            if (totalReg > 48 && totalOT === 0) {
              calculatedWarnings.push({ employeeId: empId, employeeCode: code, employeeName: empName, type: "OVER_48_NO_OT", message: "Worked > 48 regular hours without overtime declared.", severity: "warning" });
            }
            if (totalReg < 48 && inputs.length < 6) {
              calculatedWarnings.push({ employeeId: empId, employeeCode: code, employeeName: empName, type: "MISSING_DAYS", message: "Less than 48 regular hours and missing working days.", severity: "warning" });
            }
          });

          // Check salary variation warning (requires historical data)
          if (currentCustomer && runId) {
            const salaryVariationRes = await checkSalaryVariationsAction(currentCustomer.id, Number(runId), payrollInputs);
            if (salaryVariationRes.success && salaryVariationRes.warnings) {
              calculatedWarnings.push(...salaryVariationRes.warnings);
            }
          }
          
          const filteredWarnings = calculatedWarnings.filter(w => !res.warnings.find((aw: any) => aw.employeeId === w.employeeId && aw.warningType === w.type));
          setWarnings(filteredWarnings);
        }
      }
    };
    
    loadWarnings();
  }, [currentStep, currentCustomer, payrollInputs, runId]);

  async function handleAcknowledgeWarning(employeeId: number, type: string) {
    if (!currentCustomer) return;
    const res = await acknowledgeWarningAction(employeeId, currentCustomer.id, type);
    if (res.success) {
      setWarnings(prev => prev.filter(w => !(w.employeeId === employeeId && w.type === type)));
    } else {
      alert(res.error || "Failed to acknowledge warning");
    }
  }

  const loadEmployees = async (customerId: number) => {
    setIsLoadingEmployees(true);
    const res = await getEmployeesAction(customerId);
    if (res.success && res.employees) {
      setAllEmployees(res.employees);
    } else {
      setAllEmployees([]);
    }
    setIsLoadingEmployees(false);
  };

  useEffect(() => {
    if (currentCustomer) {
      getPayCalendarsAction(currentCustomer.id).then(res => {
        if (res.success && res.calendars) {
          setCalendars(res.calendars);
        }
      });
      getPayrollRunsByCustomerAction(currentCustomer.id).then(res => {
        if (res.success && res.runs) {
          setExistingRuns(res.runs.filter((r: any) => r.status === 'draft' || r.status === 'calculated'));
        }
      });
    }
  }, [currentCustomer]);

  useEffect(() => {
    if (showEmployeeSearch && !isLoadingEmployees && allEmployees.length === 0) {
      const customerId = selectedRun?.customerId ?? currentCustomer?.id;
      if (customerId) {
        loadEmployees(customerId);
      }
    }
  }, [showEmployeeSearch, currentCustomer, selectedRun, allEmployees.length, isLoadingEmployees]);

  useEffect(() => {
    if (runId) {
      getPayrollRunDetailsAction(Number(runId)).then(res => {
        if (res.success && res.payrollRun) {
          const run = res.payrollRun;
          setSelectedRun(run);
          setPayFrom(new Date(run.payFrom).toISOString().split('T')[0]);
          setPayTo(new Date(run.payTo).toISOString().split('T')[0]);
          setPaymentDate(new Date(run.paymentDate).toISOString().split('T')[0]);
          setNotes(run.notes || "");
          
          // Support `step` query param to navigate directly to a specific step
          const stepParam = searchParams.get('step');
          if (stepParam) {
            setCurrentStep(Number(stepParam));
          } else if (run.status === 'draft') setCurrentStep(2);
          else if (run.status === 'calculated') setCurrentStep(3);
          else if (run.status === 'approved' || run.status === 'closed') setCurrentStep(4);

          // Load inputs
          setIsLoadingInputs(true);
          getPayrollInputsAction(Number(runId)).then(inputRes => {
            setIsLoadingInputs(false);
            if (inputRes.success && inputRes.inputs) {
              setPayrollInputs(inputRes.inputs);
              // Auto-detect input type from stored data
              const hasHours = inputRes.inputs.some((i: any) =>
                (i.regularHours && i.regularHours > 0) ||
                (i.overtimeHours && i.overtimeHours > 0) ||
                (i.holidayHours && i.holidayHours > 0) ||
                (i.restDayHours && i.restDayHours > 0)
              );
              const hasAmounts = inputRes.inputs.some((i: any) =>
                (i.regularAmount && i.regularAmount > 0) ||
                (i.overtimeAmount && i.overtimeAmount > 0) ||
                (i.holidayAmount && i.holidayAmount > 0) ||
                (i.thirteenthAmount && i.thirteenthAmount > 0) ||
                (i.bonusAmount && i.bonusAmount > 0) ||
                (i.otherAmount && i.otherAmount > 0)
              );
              if (hasAmounts && !hasHours) setInputMode('amount');
              else if (hasHours && !hasAmounts) setInputMode('hours');
            }
          });

          // Load results for Step 4
          const empMap: Record<number, PayrollLine> = {};
          run.earnings.forEach((e: any) => {
            if (!empMap[e.employeeId]) {
              empMap[e.employeeId] = {
                id: e.employeeId,
                employeeCode: e.employee.employeeCode,
                employeeName: `${e.employee.firstName} ${e.employee.lastName}`,
                baseSalary: 0,
                overtime: 0,
                bonuses: 0,
                grossPay: 0,
                css: 0,
                seguro: 0,
                isr: 0,
                otherDeductions: 0,
                totalDeductions: 0,
                netPay: 0,
                hasException: false,
                thirteenthMonth: 0,
                earnings: [],
                deductions: [],
                monthlySalary: e.employee.baseSalary || 0,
                hourlyRate: (e.employee.baseSalary || 0) / 240
              };
            }
            empMap[e.employeeId].earnings.push(e);
            if (e.earningCode === 'SALARIO') empMap[e.employeeId].baseSalary += e.totalAmount;
            else if (e.earningCode.includes('HORA')) empMap[e.employeeId].overtime += e.totalAmount;
            else empMap[e.employeeId].bonuses += e.totalAmount;
            empMap[e.employeeId].grossPay += e.totalAmount;
          });

          run.deductions.forEach((d: any) => {
            if (empMap[d.employeeId]) {
              empMap[d.employeeId].deductions.push(d);
              if (d.deductionCode === 'CSS') empMap[d.employeeId].css += d.amount;
              else if (d.deductionCode === 'SEGURO_EDUCATIVO') empMap[d.employeeId].seguro += d.amount;
              else if (d.deductionCode === 'ISR') empMap[d.employeeId].isr += d.amount;
              else empMap[d.employeeId].otherDeductions += d.amount;
              empMap[d.employeeId].totalDeductions += d.amount;
            }
          });

          Object.values(empMap).forEach(line => {
            line.netPay = line.grossPay - line.totalDeductions;
            line.thirteenthMonth = line.grossPay / 12;
          });

          setPayrollData(Object.values(empMap));
          // Load employees for this customer
          const customerId = run.customerId ?? currentCustomer?.id;
          if (customerId) {
            loadEmployees(customerId);
          }
        }
      });
    } else if (currentCustomer) {
      loadEmployees(currentCustomer.id);
    }
  }, [runId, currentCustomer]);

  const viewEmployeeId = searchParams.get("viewEmployee");
  useEffect(() => {
    if (viewEmployeeId && payrollData.length > 0) {
      const line = payrollData.find(l => l.id === Number(viewEmployeeId));
      if (line) {
        setSelectedEmployee(line);
        setShowReviewModal(true);
      }
    }
  }, [viewEmployeeId, payrollData]);

  function handleCalendarSelect(id: string) {
    setSelectedCalendarId(id);
    const cal = calendars.find(c => c.id === Number(id));
    if (cal) {
      const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setPayFrom(formatDate(new Date(cal.payFrom)));
      setPayTo(formatDate(new Date(cal.payTo)));
      setPaymentDate(formatDate(new Date(cal.paymentDate)));
    }
  }

  async function handleStartRun() {
    if (!currentCustomer) return;
    const parseLocalDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };
    const res = await createPayrollRunAction(
      currentCustomer.id,
      Number(selectedCalendarId),
      parseLocalDate(payFrom),
      parseLocalDate(payTo),
      parseLocalDate(paymentDate)
    );
    if (res.success && res.payrollRun) {
      router.push(`/payroll-run?id=${res.payrollRun.id}`);
    } else {
      alert(res.error || "Failed to start payroll run");
    }
  }

  async function handleResetData() {
    if (!runId) return;
    if (confirm("Are you sure you want to clear all input data for this payroll run? This cannot be undone.")) {
      setIsLoadingInputs(true);
      const res = await clearPayrollInputsAction(Number(runId));
      if (res.success) {
        setPayrollInputs([]);
      } else {
        alert(res.error || "Failed to clear data");
      }
      setIsLoadingInputs(false);
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadExcelTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = [
      "Employee Code", "Date", "Type",
      "Regular Hours", "Overtime Hours", "Holiday Hours", "Rest Day Hours",
      "Amount", "Notes",
    ];
    const exampleRows = [
      ["TC-001", "2026-01-15", "hours", 8, 2, 0, 0, "", "Regular day with 2 OT hours"],
      ["TC-002", "2026-01-15", "amount", "", "", "", "", 150.00, "Bonus payment"],
      ["TC-001", "2026-01-16", "hours", 8, 0, 0, 0, "", ""],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
    ws["!cols"] = headers.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "payroll_import_template.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const newInputs: any[] = [];
        data.forEach((row: any) => {
          const empCode = row['Employee Code']?.toString() || row['Codigo de Empleado']?.toString();
          const dateStr = row['Date'] || row['Fecha'];
          const type = row['Type']?.toString().toLowerCase() || row['Tipo']?.toString().toLowerCase() || 'hours'; // hours or amount
          
          if (!empCode || !dateStr) return;
          
          let parsedDate;
          if (typeof dateStr === 'number') {
            // Excel serial date
            parsedDate = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
          } else {
            parsedDate = new Date(dateStr);
          }
          
          if (isNaN(parsedDate.getTime())) return;

          newInputs.push({
            employeeCode: empCode.toUpperCase(),
            date: parsedDate.toISOString(),
            inputType: type.includes('amount') || type.includes('monto') ? 'amount' : 'hours',
            source: 'excel',
            status: 'pending',
            regularHours: parseFloat(row['Regular Hours'] || row['Horas Regulares'] || 0),
            overtimeHours: parseFloat(row['Overtime Hours'] || row['Horas Extras'] || 0),
            holidayHours: parseFloat(row['Holiday Hours'] || row['Horas Feriadas'] || 0),
            restDayHours: parseFloat(row['Rest Day Hours'] || row['Horas Descanso'] || 0),
            dailyAmount: parseFloat(row['Amount'] || row['Monto'] || 0),
            notes: row['Notes'] || row['Notas'] || '',
          });
        });

        if (newInputs.length > 0) {
          setPayrollInputs(prev => [...prev, ...newInputs]);
          alert(`Successfully imported ${newInputs.length} rows.`);
        } else {
          alert('No valid rows found in the Excel file.');
        }
      } catch (err) {
        console.error("Excel import error:", err);
        alert('Failed to parse Excel file. Please check the format.');
      }
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  function formatDate(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function getDatesInRange(startDate: string | Date, endDate: string | Date) {
    // Ensure we work with ISO date strings without timezone offsets
    const startStr = typeof startDate === 'string' ? startDate : startDate.toISOString();
    const endStr = typeof endDate === 'string' ? endDate : endDate.toISOString();
    const startParts = startStr.split('T')[0].split('-').map(Number);
    const endParts = endStr.split('T')[0].split('-').map(Number);
    const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
    const end = new Date(endParts[0], endParts[1] - 1, endParts[2]);
    const dates = [];
    const current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  const periodDates = selectedRun ? getDatesInRange(selectedRun.payFrom, selectedRun.payTo) : [];

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const inputs = Array.from(document.querySelectorAll('.grid-input')) as HTMLInputElement[];
      const currentIndex = inputs.indexOf(e.currentTarget);
      if (currentIndex !== -1 && currentIndex + 1 < inputs.length) {
        inputs[currentIndex + 1].focus();
        inputs[currentIndex + 1].select();
      }
    }
  };

  function handleInputChange(employeeCode: string, date: string, field: string, value: string) {
    const numValue = parseFloat(value) || 0;
    setPayrollInputs(prev => {
      const dateStr = new Date(date).toISOString().split('T')[0];
      const existingIndex = prev.findIndex(i => i.employeeCode === employeeCode && new Date(i.date).toISOString().split('T')[0] === dateStr);
      
      if (existingIndex > -1) {
        const newInputs = [...prev];
        const existingInput = newInputs[existingIndex];
        
        // If switching input types, clear the other type's fields
        const isAmountField = ['regularAmount', 'overtimeAmount', 'holidayAmount', 'thirteenthAmount', 'bonusAmount', 'otherAmount'].includes(field);
        const isHourField = ['regularHours', 'overtimeHours', 'holidayHours', 'restDayHours'].includes(field);
        
        if (isAmountField && existingInput.inputType === 'hours') {
          // Clear hour fields when entering amounts
          newInputs[existingIndex] = { 
            ...existingInput, 
            regularHours: 0, 
            overtimeHours: 0, 
            holidayHours: 0, 
            restDayHours: 0,
            inputType: 'amount',
            [field]: numValue 
          };
        } else if (isHourField && existingInput.inputType === 'amount') {
          // Clear amount fields when entering hours
          newInputs[existingIndex] = { 
            ...existingInput, 
            regularAmount: 0, 
            overtimeAmount: 0, 
            holidayAmount: 0, 
            thirteenthAmount: 0, 
            bonusAmount: 0, 
            otherAmount: 0,
            inputType: 'hours',
            [field]: numValue 
          };
        } else {
          newInputs[existingIndex] = { ...existingInput, [field]: numValue };
        }
        
        return newInputs;
      } else {
        return [...prev, { 
          employeeCode, 
          date: new Date(date), 
          [field]: numValue, 
          inputType: inputMode, 
          source: 'manual',
          status: 'pending'
        }];
      }
    });
  }

  function handleNoteChange(employeeCode: string, value: string) {
    setPayrollInputs(prev => {
      // Find the first input for this employee to attach the note to
      const existingIndex = prev.findIndex(i => i.employeeCode === employeeCode);
      
      if (existingIndex > -1) {
        const newInputs = [...prev];
        newInputs[existingIndex] = { ...newInputs[existingIndex], notes: value };
        return newInputs;
      } else {
        // If no inputs exist yet, create a dummy one for the start date just to hold the note
        return [...prev, { 
          employeeCode, 
          date: new Date(payFrom), 
          notes: value,
          inputType: inputMode, 
          source: 'manual',
          status: 'pending'
        }];
      }
    });
  }

  function getInputValue(employeeCode: string, date: string, field: string) {
    const dateStr = new Date(date).toISOString().split('T')[0];
    const input = payrollInputs.find(i => i.employeeCode === employeeCode && new Date(i.date).toISOString().split('T')[0] === dateStr);
    return input ? input[field] || "" : "";
  }

  function getEmployeeStatus(employeeCode: string) {
    const empInputs = payrollInputs.filter(i => i.employeeCode === employeeCode);
    if (empInputs.some(i => i.status === 'error')) return 'error';
    if (empInputs.every(i => i.status === 'validated')) return 'validated';
    return 'pending';
  }

  async function handleSaveInputs(moveToNext = false) {
    if (!runId) return;
    setIsCalculating(true);
    const res = await savePayrollInputsAction(Number(runId), payrollInputs);
    setIsCalculating(false);
    if (res.success) {
      getPayrollInputsAction(Number(runId)).then(inputRes => {
        if (inputRes.success && inputRes.inputs) {
          setPayrollInputs(inputRes.inputs);
        }
      });
      if (moveToNext) setCurrentStep(3);
    } else {
      alert(res.error);
    }
  }

  async function handleRunCalculation() {
    if (!runId || !currentCustomer) return;
    setIsCalculating(true);
    const res = await calculatePayrollAction(Number(runId), sessionUser?.userId);
    if (res.success) {
      // Refresh run details to get the new results
      const detailRes = await getPayrollRunDetailsAction(Number(runId));
      if (detailRes.success && detailRes.payrollRun) {
        const run = detailRes.payrollRun;
        setSelectedRun(run);
        
        // Re-calculate the payrollData map
        const empMap: Record<number, PayrollLine> = {};
        run.earnings.forEach((e: any) => {
          if (!empMap[e.employeeId]) {
            empMap[e.employeeId] = {
              id: e.employeeId,
              employeeCode: e.employee.employeeCode,
              employeeName: `${e.employee.firstName} ${e.employee.lastName}`,
              baseSalary: 0,
              overtime: 0,
              bonuses: 0,
              grossPay: 0,
              css: 0,
              seguro: 0,
              isr: 0,
              otherDeductions: 0,
              totalDeductions: 0,
              netPay: 0,
              hasException: false,
              thirteenthMonth: 0,
              earnings: [],
              deductions: [],
              monthlySalary: e.employee.baseSalary || 0,
              hourlyRate: (e.employee.baseSalary || 0) / 240
            };
          }
          empMap[e.employeeId].earnings.push(e);
          if (e.earningCode === 'SALARIO') empMap[e.employeeId].baseSalary += e.totalAmount;
          else if (e.earningCode.includes('HORA')) empMap[e.employeeId].overtime += e.totalAmount;
          else empMap[e.employeeId].bonuses += e.totalAmount;
          empMap[e.employeeId].grossPay += e.totalAmount;
        });

        run.deductions.forEach((d: any) => {
          if (empMap[d.employeeId]) {
            empMap[d.employeeId].deductions.push(d);
            if (d.deductionCode === 'CSS') empMap[d.employeeId].css += d.amount;
            else if (d.deductionCode === 'SEGURO_EDUCATIVO') empMap[d.employeeId].seguro += d.amount;
            else if (d.deductionCode === 'ISR') empMap[d.employeeId].isr += d.amount;
            else empMap[d.employeeId].otherDeductions += d.amount;
            empMap[d.employeeId].totalDeductions += d.amount;
          }
        });

        Object.values(empMap).forEach(line => {
          line.netPay = line.grossPay - line.totalDeductions;
          line.thirteenthMonth = line.grossPay / 12;
        });

        setPayrollData(Object.values(empMap));
      }
      setIsCalculating(false);
      setCurrentStep(4);
    } else {
      setIsCalculating(false);
      alert(res.error || "Failed to calculate payroll");
    }
  }

  const uniqueEmployeeCodes = Array.from(new Set(payrollInputs.map(i => i.employeeCode)));
  const searchQuery = searchTerm.trim().toLowerCase();
  const filteredEmployees = allEmployees.filter(emp => {
    if (!searchQuery) return true;
    return (
      emp.firstName?.toLowerCase().includes(searchQuery) ||
      emp.lastName?.toLowerCase().includes(searchQuery) ||
      emp.employeeCode?.toLowerCase().includes(searchQuery)
    );
  });

  const steps = [
    { id: 1, name: t(locale, "payroll.step.period"), icon: Calendar, description: t(locale, "payroll.step.periodDesc") },
    { id: 2, name: t(locale, "payroll.step.inputs"), icon: Upload, description: t(locale, "payroll.step.inputsDesc") },
    { id: 3, name: t(locale, "payroll.step.calculate"), icon: Calculator, description: t(locale, "payroll.step.calculateDesc") },
    { id: 4, name: t(locale, "payroll.step.review"), icon: CheckCircle2, description: t(locale, "payroll.step.reviewDesc") },
  ];

  function formatCurrency(amount: number) {
    return formatCurrencyByLocale(amount, locale);
  }

  function exportEmployeeDetailToExcel(emp: PayrollLine) {
    const wb = XLSX.utils.book_new();
    const rows: any[][] = [
      ['GPM Payroll - ' + t(locale, "payroll.employeeDetail")],
      [],
      [t(locale, "payroll.employee"), emp.employeeName],
      [t(locale, "payroll.code"), emp.employeeCode],
      [t(locale, "payroll.baseMonthlySalary"), emp.monthlySalary],
      [t(locale, "payroll.hourlyRate"), emp.hourlyRate],
      [],
      [t(locale, "payroll.earningsBreakdown")],
      [t(locale, "common.description"), t(locale, "common.code"), t(locale, "payroll.quantity"), t(locale, "payroll.multiplier"), t(locale, "payroll.unitRate"), t(locale, "payroll.subtotal")],
    ];
    emp.earnings.forEach((e: any) => {
      const mult = e.unitAmount / emp.hourlyRate;
      rows.push([e.description || '', e.earningCode || '', e.quantity || 0, parseFloat(mult.toFixed(2)), e.unitAmount, e.totalAmount]);
    });
    rows.push(['', '', '', '', t(locale, "payroll.totalGross"), emp.grossPay]);
    rows.push([]);
    rows.push([t(locale, "payroll.deductionsBreakdown")]);
    rows.push([t(locale, "common.description"), t(locale, "common.amount")]);
    emp.deductions.forEach((d: any) => {
      rows.push([d.description || d.deductionCode || '', d.amount]);
    });
    rows.push(['', t(locale, "payroll.totalDeductionsLabel"), emp.totalDeductions]);
    rows.push([]);
    rows.push([t(locale, "payroll.netIncome"), emp.netPay]);
    rows.push([t(locale, "payroll.xiiiMonthAccrual"), emp.thirteenthMonth]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Employee Detail');
    XLSX.writeFile(wb, `employee_${emp.employeeCode}_${Date.now()}.xlsx`);
  }

  function printEmployeeDetail(emp: PayrollLine) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const multiplier = (e: any) => e.unitAmount / emp.hourlyRate;
    const earningsRows = emp.earnings.map((e: any) => `
      <tr>
        <td style="padding:6px 10px;border:1px solid #ddd">${e.description || ''}<br><small style="color:#888">${e.earningCode || ''}</small></td>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:center">${e.quantity || 0}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:center">${multiplier(e).toFixed(2)}x</td>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:right">$${e.unitAmount.toFixed(2)}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:right">$${e.totalAmount.toFixed(2)}</td>
      </tr>
    `).join('');
    const deductionsRows = emp.deductions.map((d: any) => `
      <tr>
        <td style="padding:6px 10px;border:1px solid #ddd">${d.description || d.deductionCode || ''}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:right">-$${d.amount.toFixed(2)}</td>
      </tr>
    `).join('');
    printWindow.document.write(`
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
      <div class="meta">${t(locale, "payroll.code")}: ${emp.employeeCode} | ${t(locale, "payroll.baseMonthlySalary")}: $${emp.monthlySalary.toFixed(2)} | ${t(locale, "payroll.hourlyRate")}: $${emp.hourlyRate.toFixed(2)}/h</div>
      <h3 style="margin:0 0 8px;font-size:14px">${t(locale, "payroll.earnings")}</h3>
      <table><thead><tr>
        <th>${t(locale, "common.description")}</th><th style="text-align:center">${t(locale, "payroll.quantity")}</th><th style="text-align:center">${t(locale, "payroll.multiplier")}</th><th style="text-align:right">${t(locale, "payroll.unitRate")}</th><th style="text-align:right">${t(locale, "payroll.subtotal")}</th>
      </tr></thead><tbody>${earningsRows}</tbody>
      <tfoot><tr class="total"><td colspan="4" style="text-align:right">${t(locale, "payroll.totalGross")}</td><td style="text-align:right">$${emp.grossPay.toFixed(2)}</td></tr></tfoot></table>
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
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }

  const totalGross = payrollData.reduce((sum, emp) => sum + emp.grossPay, 0);
  const totalNet = payrollData.reduce((sum, emp) => sum + emp.netPay, 0);
  const totalCSS = payrollData.reduce((sum, emp) => sum + emp.css, 0);
  const totalISR = payrollData.reduce((sum, emp) => sum + emp.isr, 0);
  const totalThirteenth = payrollData.reduce((sum, emp) => sum + emp.thirteenthMonth, 0);
  const exceptionsCount = payrollData.filter(emp => emp.hasException).length;

  const isClosedOrApproved = selectedRun?.status === 'closed' || selectedRun?.status === 'approved';

  return (
    <div className="ml-0 p-8 max-w-[1600px] mx-auto flex flex-col gap-stack_lg animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* CLOSED AND APPROVED Banner */}
      {isClosedOrApproved && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-8 py-5 rounded-xl shadow-lg flex items-center gap-4">
          <Shield size={32} className="text-white/90 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-2xl font-black uppercase tracking-wider">{t(locale, "payroll.closedAndApproved")}</h3>
            <p className="text-white/80 text-sm mt-1">
              {t(locale, "payroll.lockedWarning")}
              {selectedRun?.closedByUser?.fullName && ` ${t(locale, "payroll.approvedBy")} ${selectedRun.closedByUser.fullName}`}
              {selectedRun?.closedAt && ` ${t(locale, "payroll.onDate")} ${formatDateTimeByLocale(new Date(selectedRun.closedAt), locale, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
          <div className="bg-white/20 px-4 py-2 rounded-lg">
            <span className="text-sm font-bold uppercase tracking-wider">Run #{selectedRun?.id}</span>
          </div>
        </div>
      )}

      {/* Wizard Header & Breadcrumb */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-2 text-on-surface-variant font-label-bold mb-2">
            <span>{t(locale, "payroll.cycles")}</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span>{selectedRun ? `${formatDateByLocale(new Date(selectedRun.payFrom), locale, { month: 'long', year: 'numeric' })} ${t(locale, "common.period")}` : t(locale, "payroll.newPeriod")}</span>
          </div>
          <h2 className="font-display-lg text-display-lg text-on-surface">{t(locale, "payroll.wizardTitle")}</h2>
          <p className="text-on-surface-variant font-body-sm mt-1">
            {selectedRun ? `${t(locale, "dashboard.reviewCalculations")} ${formatDateByLocale(new Date(selectedRun.payTo), locale)}` : t(locale, "payroll.wizardDesc")}
          </p>
          {runId && (
            <div className="mt-2 flex justify-end">
              <span className="px-3 py-1 text-xs rounded-full bg-surface-container-low border border-outline text-on-surface-variant">{t(locale, "payroll.runId")} {runId}</span>
            </div>
          )}
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
          
          <div className="flex gap-3">
            {currentStep === 4 && (
              <>
                <button 
                  onClick={handleRunCalculation}
                  className="px-6 py-2.5 rounded-lg border border-outline bg-white text-on-surface font-label-bold hover:bg-surface-container transition-all flex items-center gap-2"
                >
                  <RefreshCw size={18} className={isCalculating ? "animate-spin" : ""} />
                  {t(locale, "payroll.recalculate")}
                </button>
                <button 
                  onClick={() => {
                    const hash = computeHashFromPayrollData(selectedRun?.payrollData ?? []);
                    router.push(`/review-approve?id=${selectedRun?.id}&calcHash=${hash}`);
                  }}
                  className="px-6 py-2.5 rounded-lg bg-secondary text-white font-label-bold hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                  <Shield size={18} />
                  {t(locale, "payroll.reviewApprove")}
                </button>
              </>
            )}
            {currentStep === 2 && (
              <button
                onClick={() => handleSaveInputs(true)}
                disabled={isCalculating}
                className="px-6 py-2.5 rounded-lg bg-secondary text-white font-label-bold hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isCalculating ? t(locale, "payroll.saveContinue") : t(locale, "payroll.continueCalc")}
                <ArrowRight size={18} />
              </button>
            )}
            {currentStep === 3 && (
              <button
                onClick={handleRunCalculation}
                disabled={isCalculating}
                className="px-6 py-2.5 rounded-lg bg-secondary text-white font-label-bold hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isCalculating ? t(locale, "payroll.calculating") : t(locale, "payroll.executeCalc")}
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Multi-step Progress Bar */}
      <div className="grid grid-cols-4 gap-4 p-4 bg-white border border-outline rounded-xl">
        {steps.map((step) => {
          const isReviewStep = step.id === 4;
          const isApprovedOrClosed = selectedRun?.status === 'approved' || selectedRun?.status === 'closed';
          const isDisabled = isReviewStep && isApprovedOrClosed;
          
          return (
            <div
              key={step.id}
              onClick={() => {
                if (isDisabled) return; // Prevent navigation to disabled Review step
                // Allow navigation to any step if runId is present, or back to Step 1
                if (runId || step.id === 1) setCurrentStep(step.id);
              }}
              className={`flex items-center gap-3 px-4 py-2 transition-all rounded-lg ${
                isDisabled
                  ? 'opacity-50 cursor-not-allowed bg-slate-50'
                  : currentStep === step.id
                  ? 'bg-secondary/5 border border-secondary/20 relative cursor-pointer hover:bg-surface-container-low'
                  : currentStep > step.id
                  ? 'opacity-100 cursor-pointer hover:bg-surface-container-low'
                  : 'opacity-60 cursor-pointer hover:bg-surface-container-low'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                isDisabled
                  ? 'bg-slate-200 text-slate-400'
                  : currentStep === step.id
                  ? 'bg-secondary text-white'
                  : currentStep > step.id
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {isDisabled ? <Shield size={16} /> : currentStep > step.id ? <Check size={16} /> : step.id}
              </div>
              <div className="flex-1">
                <span className={`font-label-bold text-sm ${
                  isDisabled ? 'text-slate-400' : currentStep === step.id ? 'text-secondary' : 'text-slate-600'
                }`}>
                  {step.name}
                </span>
                {isDisabled && (
                  <div className="text-xs text-slate-400 mt-1">
                    <div className="flex items-center gap-1">
                      <User size={10} />
                      <span>{t(locale, "payroll.approvedBy")} {selectedRun.closedByUser?.fullName || t(locale, "review.system")}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock size={10} />
                      <span>{selectedRun.closedAt ? formatDateTimeByLocale(new Date(selectedRun.closedAt), locale) : t(locale, "review.na")}</span>
                    </div>
                  </div>
                )}
              </div>
              {currentStep === step.id && !isDisabled && (
                <div className="absolute bottom-0 left-0 h-1 bg-secondary w-full rounded-full"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="grid grid-cols-12 gap-stack_lg">
        {currentStep === 1 && (
          <div className="col-span-12 xl:col-span-8 space-y-6">
            <div className="bg-white border border-outline rounded-xl p-8">
              <h3 className="font-headline-sm text-on-surface mb-6">{t(locale, "payroll.createNew")}</h3>
              <div className="space-y-6 max-w-2xl">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={14} />
                    {t(locale, "payroll.calendar")}
                  </label>
                  <select
                    value={selectedCalendarId}
                    onChange={(e) => handleCalendarSelect(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-outline focus:ring-2 focus:ring-secondary outline-none transition-all"
                  >
                    <option value="">{t(locale, "payroll.selectCalendar")}</option>
                    {calendars.map((cal) => (
                      <option key={cal.id} value={cal.id}>
                        {cal.frequency.toUpperCase()} - {formatDate(new Date(cal.payFrom))} to {formatDate(new Date(cal.payTo))} ({cal.periodLabel})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">{t(locale, "payroll.payFrom")}</label>
                    <input type="date" value={payFrom} onChange={(e) => setPayFrom(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-outline focus:ring-2 focus:ring-secondary outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">{t(locale, "payroll.payTo")}</label>
                    <input type="date" value={payTo} onChange={(e) => setPayTo(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-outline focus:ring-2 focus:ring-secondary outline-none" />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleStartRun}
                    disabled={!payFrom || !payTo || !paymentDate}
                    className="px-8 py-3 bg-secondary text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {t(locale, "payroll.initialize")}
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            </div>

            {existingRuns.length > 0 && (
              <div className="bg-white border border-outline rounded-xl p-8 mt-6">
                <h3 className="font-headline-sm text-on-surface mb-6">{t(locale, "payroll.resumeExisting")}</h3>
                <div className="space-y-6 max-w-2xl">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
                      <Clock size={14} />
                      {t(locale, "payroll.pendingRuns")}
                    </label>
                    <div className="relative group">
                      <select
                        value={selectedExistingRunId}
                        onChange={(e) => setSelectedExistingRunId(e.target.value)}
                        className="appearance-none bg-white border border-outline rounded-xl pl-4 pr-10 py-3 text-sm font-medium focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all cursor-pointer w-full group-hover:border-secondary"
                      >
                        <option value="">{t(locale, "payroll.selectExisting")}</option>
                        {existingRuns.map((run) => (
                          <option key={run.id} value={run.id}>
                            #{run.id} — {formatDateByLocale(new Date(run.payFrom), locale, { month: 'long', year: 'numeric' })} — {run.status.toUpperCase()}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none group-hover:text-secondary transition-colors" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        if (selectedExistingRunId) {
                          router.push(`/payroll-run?id=${selectedExistingRunId}`);
                        }
                      }}
                      disabled={!selectedExistingRunId}
                      className="flex-1 px-8 py-3 bg-secondary text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {t(locale, "payroll.resumeRun")}
                      <ArrowRight size={20} />
                    </button>
                    {selectedExistingRunId && (() => {
                      const selected = existingRuns.find(r => r.id.toString() === selectedExistingRunId);
                      const canDelete = selected && selected.status !== 'closed' && selected.status !== 'approved';
                      return canDelete ? (
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="px-6 py-3 bg-error/10 border-2 border-error text-error rounded-xl font-bold hover:bg-error/20 transition-all flex items-center gap-2 shadow-sm"
                        >
                          <Trash2 size={18} />
                          Delete Permanently
                        </button>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div className="col-span-12 space-y-6">
            <div className="bg-white border border-outline rounded-xl p-6">
              <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <h3 className="font-headline-sm text-on-surface">{t(locale, "payroll.dataInput")}</h3>
                  <div className="flex bg-surface-container rounded-lg p-1">
                    <button 
                      onClick={() => setInputMethod('manual')}
                      className={`px-4 py-1.5 rounded-md text-sm font-label-bold transition-all ${inputMethod === 'manual' ? 'bg-white shadow-sm text-secondary' : 'text-on-surface-variant'}`}
                    >
                      {t(locale, "payroll.manualEntry")}
                    </button>
                    <button 
                      onClick={() => setInputMethod('excel')}
                      className={`px-4 py-1.5 rounded-md text-sm font-label-bold transition-all ${inputMethod === 'excel' ? 'bg-white shadow-sm text-secondary' : 'text-on-surface-variant'}`}
                    >
                      {t(locale, "payroll.excelImport")}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex bg-surface-container rounded-lg p-1 mr-4">
                    <button 
                      onClick={() => setInputMode('hours')}
                      disabled={!canSwitchToHours}
                      className={`px-4 py-1.5 rounded-md text-sm font-label-bold transition-all ${inputMode === 'hours' ? 'bg-white shadow-sm text-secondary' : 'text-on-surface-variant'} ${!canSwitchToHours ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {t(locale, "payroll.captureHours")}
                    </button>
                    <button 
                      onClick={() => setInputMode('amount')}
                      disabled={!canSwitchToAmounts}
                      className={`px-4 py-1.5 rounded-md text-sm font-label-bold transition-all ${inputMode === 'amount' ? 'bg-white shadow-sm text-secondary' : 'text-on-surface-variant'} ${!canSwitchToAmounts ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {t(locale, "payroll.captureAmounts")}
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => {
                      const customerId = selectedRun?.customerId ?? currentCustomer?.id;
                      if (allEmployees.length === 0 && customerId) {
                        loadEmployees(customerId);
                      }
                      setShowEmployeeSearch(true);
                    }}
                    className="px-4 py-2 bg-secondary text-white rounded-lg font-label-bold flex items-center gap-2 hover:bg-secondary/90 transition-all"
                  >
                    <Users size={18} />
                    {t(locale, "payroll.addEntry")}
                  </button>
                  
                  <button 
                    onClick={() => handleSaveInputs(false)}
                    disabled={isCalculating}
                    className="px-4 py-2 border border-secondary text-secondary rounded-lg font-label-bold flex items-center gap-2 hover:bg-secondary/5 transition-all disabled:opacity-50"
                  >
                    {isCalculating ? <RefreshCw size={18} className="animate-spin" /> : <Shield size={18} />}
                    {t(locale, "payroll.validateSave")}
                  </button>
                  <button 
                    onClick={handleResetData}
                    disabled={isCalculating || isLoadingInputs || payrollInputs.length === 0}
                    className="px-4 py-2 border border-error text-error rounded-lg font-label-bold flex items-center gap-2 hover:bg-error/5 transition-all disabled:opacity-50"
                  >
                    <X size={18} />
                    {t(locale, "payroll.resetData")}
                  </button>
                </div>
              </div>

              {inputMethod === 'manual' ? (
                <div className="overflow-x-auto border border-outline rounded-xl relative min-h-[200px]">
                  {isLoadingInputs && (
                    <div className="absolute inset-0 bg-white/50 z-20 flex items-center justify-center backdrop-blur-[1px]">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw size={32} className="text-secondary animate-spin" />
                        <p className="text-sm font-label-bold text-on-surface-variant">{t(locale, "payroll.loadingEntries")}</p>
                      </div>
                    </div>
                  )}
                  <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead className="bg-surface-container-low border-b border-outline">
                      <tr>
                        <th className="px-4 py-3 font-label-bold text-[11px] uppercase tracking-wider sticky left-0 bg-surface-container-low z-10 w-48">Employee</th>
                        <th className="px-4 py-3 font-label-bold text-[11px] uppercase tracking-wider text-center border-l border-outline w-32">Type</th>
                        {periodDates.map(date => (
                          <th key={date.toISOString()} className="px-2 py-3 font-label-bold text-[10px] text-center border-l border-outline min-w-[60px]">
                            {formatDateByLocale(date, locale, { weekday: 'short' })}<br/>
                            {date.getDate()}
                          </th>
                        ))}
                        <th className="px-4 py-3 font-label-bold text-[11px] uppercase tracking-wider text-center border-l border-outline w-24">Total</th>
                        <th className="px-4 py-3 font-label-bold text-[11px] uppercase tracking-wider text-center border-l border-outline w-32">Comment / Docs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline">
                      {uniqueEmployeeCodes.length === 0 ? (
                        <tr>
                          <td colSpan={periodDates.length + 4} className="px-6 py-12 text-center text-on-surface-variant italic">
                            No employee entries added. Use the "Add Employee Entry" button to begin.
                          </td>
                        </tr>
                      ) : (
                        uniqueEmployeeCodes.map(code => {
                          const status = getEmployeeStatus(code);
                          const employee = allEmployees.find(e => e.employeeCode === code);
                          const empInputs = payrollInputs.filter(i => i.employeeCode === code);
                          
                          // Calculate totals for this row
                          const rowTotal = empInputs.reduce((sum, input) => {
                            if (inputMode === 'hours') {
                              return sum + (input.regularHours || 0) + (input.overtimeHours || 0) + (input.holidayHours || 0);
                            } else {
                              return sum + (input.regularAmount || 0) + (input.overtimeAmount || 0) + (input.holidayAmount || 0) + (input.thirteenthAmount || 0) + (input.bonusAmount || 0) + (input.otherAmount || 0);
                            }
                          }, 0);

                          return (
                            <tr key={code} className="hover:bg-surface-container-lowest transition-colors">
                              <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-outline shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${status === 'validated' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                                  <div className="truncate">
                                    <p className="font-bold text-sm text-on-surface truncate">{employee ? `${employee.firstName} ${employee.lastName}` : "Unknown"}</p>
                                    <p className="text-[10px] text-on-surface-variant">{code}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 py-2 text-[10px] bg-slate-50">
                                {inputMode === 'hours' ? (
                                  <div className="flex flex-col gap-1 text-[9px] font-bold text-slate-500">
                                    <span className="bg-blue-100 text-blue-700 px-1 rounded">REG</span>
                                    <span className="bg-orange-100 text-orange-700 px-1 rounded">OVT</span>
                                    <span className="bg-purple-100 text-purple-700 px-1 rounded">HOL</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1 text-[8px] font-bold text-slate-500">
                                    <span className="bg-green-100 text-green-700 px-1 rounded">REG</span>
                                    <span className="bg-orange-100 text-orange-700 px-1 rounded">OVT</span>
                                    <span className="bg-purple-100 text-purple-700 px-1 rounded">HOL</span>
                                    <span className="bg-yellow-100 text-yellow-700 px-1 rounded">13TH</span>
                                    <span className="bg-pink-100 text-pink-700 px-1 rounded">BON</span>
                                    <span className="bg-gray-100 text-gray-700 px-1 rounded">OTH</span>
                                  </div>
                                )}
                              </td>
                              {periodDates.map(date => {
                                const dateStr = date.toISOString().split('T')[0];
                                return (
                                  <td key={dateStr} className="px-1 py-1 border-l border-outline">
                                    {inputMode === 'hours' ? (
                                      <div className="flex flex-col gap-1">
                                        <input 
                                          type="text" 
                                          placeholder="0"
                                          value={getInputValue(code, dateStr, 'regularHours')}
                                          onChange={(e) => handleInputChange(code, dateStr, 'regularHours', e.target.value)}
                                          onKeyDown={handleInputKeyDown}
                                          className="grid-input w-full text-center text-xs py-0.5 border border-transparent hover:border-outline focus:border-secondary focus:bg-secondary/5 outline-none rounded"
                                        />
                                        <input 
                                          type="text" 
                                          placeholder="0"
                                          value={getInputValue(code, dateStr, 'overtimeHours')}
                                          onChange={(e) => handleInputChange(code, dateStr, 'overtimeHours', e.target.value)}
                                          onKeyDown={handleInputKeyDown}
                                          className="grid-input w-full text-center text-xs py-0.5 border border-transparent hover:border-outline focus:border-secondary focus:bg-secondary/5 outline-none rounded bg-orange-50/30"
                                        />
                                        <input 
                                          type="text" 
                                          placeholder="0"
                                          value={getInputValue(code, dateStr, 'holidayHours')}
                                          onChange={(e) => handleInputChange(code, dateStr, 'holidayHours', e.target.value)}
                                          onKeyDown={handleInputKeyDown}
                                          className="grid-input w-full text-center text-xs py-0.5 border border-transparent hover:border-outline focus:border-secondary focus:bg-secondary/5 outline-none rounded bg-purple-50/30"
                                        />
                                      </div>
                                    ) : (
                                      <div className="flex flex-col gap-0.5 text-[10px]">
                                        <div className="flex flex-col gap-0.5">
                                          <label className="text-green-600 font-bold px-0.5">REG</label>
                                          <input 
                                            type="text" 
                                            placeholder="0.00"
                                            value={getInputValue(code, dateStr, 'regularAmount')}
                                            onChange={(e) => handleInputChange(code, dateStr, 'regularAmount', e.target.value)}
                                            onKeyDown={handleInputKeyDown}
                                            className="grid-input w-full text-center text-xs py-0.5 border border-transparent hover:border-outline focus:border-secondary focus:bg-secondary/5 outline-none rounded"
                                          />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                          <label className="text-orange-600 font-bold px-0.5">OVT</label>
                                          <input 
                                            type="text" 
                                            placeholder="0.00"
                                            value={getInputValue(code, dateStr, 'overtimeAmount')}
                                            onChange={(e) => handleInputChange(code, dateStr, 'overtimeAmount', e.target.value)}
                                            onKeyDown={handleInputKeyDown}
                                            className="grid-input w-full text-center text-xs py-0.5 border border-transparent hover:border-outline focus:border-secondary focus:bg-secondary/5 outline-none rounded bg-orange-50/30"
                                          />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                          <label className="text-purple-600 font-bold px-0.5">HOL</label>
                                          <input 
                                            type="text" 
                                            placeholder="0.00"
                                            value={getInputValue(code, dateStr, 'holidayAmount')}
                                            onChange={(e) => handleInputChange(code, dateStr, 'holidayAmount', e.target.value)}
                                            onKeyDown={handleInputKeyDown}
                                            className="grid-input w-full text-center text-xs py-0.5 border border-transparent hover:border-outline focus:border-secondary focus:bg-secondary/5 outline-none rounded bg-purple-50/30"
                                          />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                          <label className="text-yellow-600 font-bold px-0.5">13TH</label>
                                          <input 
                                            type="text" 
                                            placeholder="0.00"
                                            value={getInputValue(code, dateStr, 'thirteenthAmount')}
                                            onChange={(e) => handleInputChange(code, dateStr, 'thirteenthAmount', e.target.value)}
                                            onKeyDown={handleInputKeyDown}
                                            className="grid-input w-full text-center text-xs py-0.5 border border-transparent hover:border-outline focus:border-secondary focus:bg-secondary/5 outline-none rounded bg-yellow-50/30"
                                          />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                          <label className="text-pink-600 font-bold px-0.5">BON</label>
                                          <input 
                                            type="text" 
                                          placeholder="0.00"
                                          value={getInputValue(code, dateStr, 'bonusAmount')}
                                          onChange={(e) => handleInputChange(code, dateStr, 'bonusAmount', e.target.value)}
                                          onKeyDown={handleInputKeyDown}
                                          className="grid-input w-full text-center text-xs py-0.5 border border-transparent hover:border-outline focus:border-secondary focus:bg-secondary/5 outline-none rounded bg-pink-50/30"
                                          />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                          <label className="text-gray-600 font-bold px-0.5">OTH</label>
                                          <input 
                                            type="text" 
                                            placeholder="0.00"
                                            value={getInputValue(code, dateStr, 'otherAmount')}
                                            onChange={(e) => handleInputChange(code, dateStr, 'otherAmount', e.target.value)}
                                            onKeyDown={handleInputKeyDown}
                                            className="grid-input w-full text-center text-xs py-0.5 border border-transparent hover:border-outline focus:border-secondary focus:bg-secondary/5 outline-none rounded bg-gray-50/30"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                              {/* Total Column */}
                              <td className="px-4 py-3 text-center border-l border-outline bg-slate-50">
                                <span className={`font-black ${inputMode === 'hours' ? 'text-secondary' : 'text-green-700'} text-sm`}>
                                  {inputMode === 'hours' ? rowTotal : formatCurrency(rowTotal)}
                                </span>
                              </td>
                              {/* Comment / Docs Column */}
                              <td className="px-4 py-3 text-center border-l border-outline">
                                <div className="flex items-center justify-center gap-2">
                                  <button 
                                    onClick={() => setSelectedNoteInput({ employeeCode: code, employeeName: employee ? `${employee.firstName} ${employee.lastName}` : "Unknown" })}
                                    className={`p-1.5 rounded-lg transition-all ${empInputs.some(i => i.notes) ? 'bg-secondary/10 text-secondary' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                    title="Add comments or attachments"
                                  >
                                    <MessageSquare size={16} />
                                  </button>
                                  <button 
                                    className={`p-1.5 rounded-lg transition-all ${empInputs.some(i => i.attachmentUrl) ? 'bg-secondary/10 text-secondary' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                    title="View attachments"
                                  >
                                    <FileText size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 border-2 border-dashed border-outline rounded-xl flex flex-col items-center justify-center text-center bg-surface-container-lowest">
                  <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center text-secondary mb-4">
                    <FileSpreadsheet size={32} />
                  </div>
                  <h4 className="font-headline-sm mb-2">Import Payroll Data from Excel</h4>
                  <p className="text-on-surface-variant max-w-md mb-6">
                    Upload your payroll template.
                  </p>
                  
                  <div className="bg-blue-50 text-blue-900 text-sm p-4 rounded-xl text-left max-w-2xl mb-6 shadow-sm border border-blue-100">
                    <p className="font-bold mb-2 flex items-center gap-2"><AlertTriangle size={16}/> Excel Template Requirements</p>
                    <p className="mb-2">Your file must include the following column headers (in English or Spanish):</p>
                    <ul className="list-disc pl-5 space-y-1 mb-2">
                      <li><strong>Employee Code</strong> (or Codigo de Empleado)</li>
                      <li><strong>Date</strong> (or Fecha)</li>
                      <li><strong>Type</strong> (or Tipo) - values: "hours" or "amount"</li>
                    </ul>
                    <p>Depending on the <strong>Type</strong>, include these columns:</p>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>For "hours": <strong>Regular Hours</strong>, <strong>Overtime Hours</strong>, <strong>Holiday Hours</strong>, <strong>Rest Day Hours</strong></li>
                      <li>For "amount": <strong>Amount</strong> (or Monto)</li>
                      <li>Optional: <strong>Notes</strong> (or Notas)</li>
                    </ul>
                  </div>

                  <div className="flex gap-4">
                    <input 
                      type="file" 
                      accept=".xlsx, .xls" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      className="hidden" 
                      id="excel-upload"
                    />
                    <label 
                      htmlFor="excel-upload"
                      className="cursor-pointer px-6 py-2.5 bg-secondary text-white rounded-lg font-label-bold flex items-center gap-2 hover:shadow-lg transition-all"
                    >
                      <Upload size={18} />
                      Choose File
                    </label>
                    <button onClick={downloadExcelTemplate} className="px-6 py-2.5 border border-outline text-on-surface rounded-lg font-label-bold flex items-center gap-2 hover:bg-surface-container transition-all">
                      <Download size={18} />
                      Download Template
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="col-span-12 flex flex-col items-center justify-center p-8 lg:p-20 bg-white border border-outline rounded-xl">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${isCalculating ? 'bg-secondary/10' : 'bg-green-100'}`}>
              <Calculator size={48} className={isCalculating ? 'text-secondary animate-pulse' : 'text-green-600'} />
            </div>
            <h3 className="font-display-sm mb-2">{isCalculating ? "Calculating Payroll..." : "Ready to Calculate"}</h3>
            <p className="text-on-surface-variant max-w-lg text-center mb-8">
              {isCalculating 
                ? "The system is applying statutory rules, tax brackets, and recurring items to the validated inputs. This may take a few moments."
                : "All data inputs have been validated. You can now execute the final calculation engine to generate earnings and deductions."}
            </p>

            {warnings.length > 0 && !isCalculating && (
              <div className="w-full max-w-4xl mb-8 border border-warning rounded-xl overflow-hidden shadow-sm">
                <div className="bg-warning/10 p-4 border-b border-warning/20 flex items-center gap-2">
                  <AlertTriangle className="text-warning" size={20} />
                  <h4 className="font-label-bold text-warning-dark">Validation Warnings & Observations</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-container-lowest border-b border-outline">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Employee</th>
                        <th className="px-4 py-2 font-semibold">Type</th>
                        <th className="px-4 py-2 font-semibold">Alert</th>
                        <th className="px-4 py-2 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline">
                      {warnings.map((w, idx) => (
                        <tr key={idx} className="hover:bg-surface-container-lowest">
                          <td className="px-4 py-3">
                            <div className="font-medium text-on-surface">{w.employeeName}</div>
                            <div className="text-xs text-on-surface-variant">{w.employeeCode}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              w.severity === 'observation' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {w.severity === 'observation' ? 'Observation' : 'Warning'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant">{w.message}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleAcknowledgeWarning(w.employeeId, w.type)}
                              className="px-3 py-1 bg-white border border-outline rounded-md text-xs font-semibold text-secondary hover:bg-secondary hover:text-white transition-all flex items-center gap-1"
                            >
                              <Check size={14} /> Accept
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!isCalculating && (
              <button 
                onClick={handleRunCalculation}
                className="px-12 py-4 bg-secondary text-white rounded-xl font-display-sm hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-3"
              >
                Execute Engine
                <ArrowRight size={24} />
              </button>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <>
            <div className="col-span-12 xl:col-span-9 flex flex-col gap-6">
              <div className="bg-white border border-outline rounded-xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-title-sm text-title-sm">{t(locale, "payroll.calculatedResults")}</h3>
                  <div className="flex gap-2">
                    <button className="p-2 rounded-lg hover:bg-slate-50 text-slate-400"><Download size={18} /></button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-container-low border-b border-outline">
                      <tr>
                        <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "payroll.employee")}</th>
                        <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "payroll.grossPay")}</th>
                        <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "payroll.css")}</th>
                        <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "payroll.isr")}</th>
                        <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant text-blue-600">{t(locale, "payroll.xiiiMonth")}</th>
                        <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant">{t(locale, "payroll.netPayCol")}</th>
                        <th className="px-6 py-4 font-label-bold text-[12px] uppercase tracking-wider text-on-surface-variant text-right">{t(locale, "payroll.actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payrollData.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-12 text-center text-on-surface-variant italic">{t(locale, "payroll.noResults")}</td></tr>
                      ) : (
                        payrollData.map((emp) => (
                          <tr key={emp.id} className="hover:bg-surface-container-low transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">{emp.employeeName.split(' ').map(n => n[0]).join('')}</div>
                                <div><p className="font-medium text-on-surface text-sm">{emp.employeeName}</p><p className="text-xs text-on-surface-variant">{emp.employeeCode}</p></div>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-data-mono text-sm font-medium">{formatCurrency(emp.grossPay)}</td>
                            <td className="px-6 py-4 font-data-mono text-sm text-error">{formatCurrency(emp.css)}</td>
                            <td className="px-6 py-4 font-data-mono text-sm text-error">{formatCurrency(emp.isr)}</td>
                            <td className="px-6 py-4 font-data-mono text-sm text-blue-600">{formatCurrency(emp.thirteenthMonth)}</td>
                            <td className="px-6 py-4 font-bold text-on-surface">{formatCurrency(emp.netPay)}</td>
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => { setSelectedEmployee(emp); setShowReviewModal(true); }} className="p-1 text-on-surface-variant hover:text-secondary"><Eye size={16} /></button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-span-12 xl:col-span-3 space-y-6">
              <div className="bg-white border border-outline rounded-xl p-6">
                <h3 className="font-title-sm text-title-sm text-on-surface mb-4">{t(locale, "payroll.summary")}</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
                    <span className="text-sm text-on-surface-variant">{t(locale, "payroll.gross")}</span>
                    <span className="font-data-mono font-bold">{formatCurrency(totalGross)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-label-bold">{t(locale, "payroll.net")}</span>
                    <span className="font-display-lg text-[24px]">{formatCurrency(totalNet)}</span>
                  </div>
                </div>
              </div>
              
              
              {selectedRun?.calculatedAt && (
                <div className="bg-surface-container-lowest border border-outline border-dashed rounded-xl p-5">
                  <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-1.5"><Clock size={14}/> {t(locale, "payroll.calcAudit")}</h4>
                  <div className="text-xs space-y-2 text-on-surface">
                    <p className="flex justify-between border-b border-outline-variant pb-1">
                      <span className="font-semibold text-on-surface-variant">{t(locale, "payroll.generatedOn")}</span> 
                      <span>{formatDateTimeByLocale(new Date(selectedRun.calculatedAt), locale)}</span>
                    </p>
                    {selectedRun.calculatedByUser && (
                      <p className="flex justify-between">
                        <span className="font-semibold text-on-surface-variant">{t(locale, "payroll.operator")}</span> 
                        <span className="font-medium text-secondary">{selectedRun.calculatedByUser.fullName}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Employee Search Modal */}
      {showEmployeeSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-outline flex justify-between items-center bg-surface-container">
              <h3 className="font-title-sm">Add Employee Entry</h3>
              <button onClick={() => setShowEmployeeSearch(false)} className="p-1 hover:bg-slate-200 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-4">
              <div className="mb-4">
              <label htmlFor="employee-search" className="block text-sm font-semibold text-on-surface mb-2">Search employees</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined">search</span>
                <input 
                  id="employee-search"
                  type="text" 
                  placeholder="Type a name or code to search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-outline bg-surface text-sm focus:border-secondary focus:ring-2 focus:ring-secondary outline-none transition-all"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto divide-y divide-outline">
                {isLoadingEmployees ? (
                  <p className="p-4 text-center text-on-surface-variant italic">{t(locale, "employees.loading")}</p>
                ) : allEmployees.length === 0 ? (
                  <div className="p-4 text-center text-on-surface-variant">
                    <p className="italic mb-3">{t(locale, "payroll.noEntries")}</p>
                    <button
                      onClick={() => {
                        const customerId = selectedRun?.customerId ?? currentCustomer?.id;
                        if (customerId) loadEmployees(customerId);
                      }}
                      className="px-4 py-2 bg-secondary text-white rounded-lg text-sm"
                    >
                      Reload employee list
                    </button>
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <p className="p-4 text-center text-on-surface-variant italic">{t(locale, "employees.noEmployeesFound")}</p>
                ) : (
                  filteredEmployees.map(emp => (
                    <button 
                      key={emp.id}
                      onClick={() => {
                        handleInputChange(emp.employeeCode, payFrom, 'regularHours', '0');
                        setShowEmployeeSearch(false);
                        setSearchTerm("");
                      }}
                      className="w-full p-3 flex items-center justify-between hover:bg-secondary/5 transition-all group"
                    >
                      <div className="text-left">
                        <p className="font-bold text-sm text-on-surface group-hover:text-secondary">{emp.firstName} {emp.lastName}</p>
                        <p className="text-[10px] text-on-surface-variant">{emp.employeeCode}</p>
                      </div>
                      <span className="material-symbols-outlined text-secondary opacity-0 group-hover:opacity-100 transition-all">add_circle</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Detail Modal */}
      {/* Employee Detail Modal */}
      {showReviewModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-outline flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-on-surface">Employee Payroll Details</h2>
                <p className="text-xs text-on-surface-variant">Detailed calculation for the current period</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => exportEmployeeDetailToExcel(selectedEmployee)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-low hover:bg-surface-container rounded-lg transition-all">
                  <FileSpreadsheet size={16} />
                  Export
                </button>
                <button onClick={() => printEmployeeDetail(selectedEmployee)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-low hover:bg-surface-container rounded-lg transition-all">
                  <Printer size={16} />
                  Print
                </button>
                <button onClick={() => setShowReviewModal(false)} className="p-2 hover:bg-surface-container rounded-lg transition-all">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Employee Header */}
              <div className="flex items-center gap-4 bg-surface-container-lowest p-4 rounded-xl border border-outline/5">
                <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center text-secondary text-2xl font-black">
                  {selectedEmployee.employeeName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-on-surface tracking-tight">{selectedEmployee.employeeName}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="px-2 py-0.5 bg-surface-container rounded text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{selectedEmployee.employeeCode}</span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase">
                      <Shield size={10} />
                      Validated Record
                    </span>
                  </div>
                </div>
              </div>

              {/* Calculation Metadata */}
              {selectedRun?.calculatedAt && (
                <div className="flex items-center justify-between bg-surface-container-lowest border border-outline border-dashed rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-on-surface-variant" />
                    <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Calculation Audit</span>
                  </div>
                  <div className="flex items-center gap-6 text-xs text-on-surface">
                    <div>
                      <span className="font-semibold text-on-surface-variant mr-2">Generated:</span>
                      {formatDateTimeByLocale(new Date(selectedRun.calculatedAt), locale)}
                    </div>
                    {selectedRun.calculatedByUser && (
                      <div>
                        <span className="font-semibold text-on-surface-variant mr-2">Operator:</span>
                        <span className="font-medium text-secondary">{selectedRun.calculatedByUser.fullName}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Calculation Basis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline/10 flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-secondary border border-outline/20">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Base Monthly Salary</p>
                    <p className="font-bold text-lg text-on-surface">{formatCurrency(selectedEmployee.monthlySalary)}</p>
                  </div>
                </div>
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline/10 flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-secondary border border-outline/20">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Calculated Hourly Rate</p>
                    <p className="font-bold text-lg text-on-surface">{formatCurrency(selectedEmployee.hourlyRate)} <span className="text-[10px] font-normal text-on-surface-variant">/ hour (240h divisor)</span></p>
                  </div>
                </div>
              </div>

              {/* Earnings Detail Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <h4 className="font-label-bold text-on-surface-variant uppercase flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    Earnings & Hours Breakdown
                  </h4>
                  <span className="text-[10px] font-bold text-on-surface-variant italic">Aggregated from daily work logs</span>
                </div>
                <div className="border border-outline rounded-xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-surface-container-low border-b border-outline">
                      <tr>
                        <th className="px-4 py-3 font-bold text-[11px] uppercase text-on-surface-variant">Item Description</th>
                        <th className="px-4 py-3 font-bold text-[11px] uppercase text-on-surface-variant text-center">Qty/Hours</th>
                        <th className="px-4 py-3 font-bold text-[11px] uppercase text-on-surface-variant text-center">Multiplier</th>
                        <th className="px-4 py-3 font-bold text-[11px] uppercase text-on-surface-variant text-right">Unit Rate</th>
                        <th className="px-4 py-3 font-bold text-[11px] uppercase text-on-surface-variant text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline">
                      {selectedEmployee.earnings.map((e: any, idx: number) => {
                        const multiplier = e.unitAmount / selectedEmployee.hourlyRate;
                        const isPremium = multiplier > 1.01;
                        return (
                          <tr key={idx} className="hover:bg-surface-container-lowest transition-colors text-[13px]">
                            <td className="px-4 py-3">
                              <div className="font-medium text-on-surface">{e.description}</div>
                              <div className="text-[10px] text-on-surface-variant">{e.earningCode}</div>
                            </td>
                            <td className="px-4 py-3 text-center font-data-mono font-medium">{e.quantity}</td>
                            <td className="px-4 py-3 text-center font-data-mono text-on-surface-variant">
                              {isPremium ? `${multiplier.toFixed(2)}x` : '1.00x'}
                            </td>
                            <td className="px-4 py-3 text-right font-data-mono">
                              {isPremium ? (
                                <div className="flex flex-col items-end">
                                  <span>{formatCurrency(e.unitAmount)}</span>
                                  <span className="text-[10px] opacity-60">({formatCurrency(selectedEmployee.hourlyRate)} * {multiplier.toFixed(2)})</span>
                                </div>
                              ) : (
                                formatCurrency(e.unitAmount)
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-bold font-data-mono text-on-surface">{formatCurrency(e.totalAmount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-green-50/30 border-t border-outline">
                      <tr className="font-bold">
                        <td colSpan={4} className="px-4 py-4 text-right text-on-surface-variant uppercase tracking-wider text-xs">Total Gross Income</td>
                        <td className="px-4 py-4 text-right text-xl text-secondary">{formatCurrency(selectedEmployee.grossPay)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Deductions Detail Section */}
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
                      {selectedEmployee.deductions.map((d: any, idx: number) => (
                        <tr key={idx} className="hover:bg-surface-container-lowest transition-colors">
                          <td className="px-4 py-3 text-on-surface">{d.description || d.deductionCode}</td>
                          <td className="px-4 py-3 text-right font-bold font-data-mono text-error">{formatCurrency(d.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-red-50/30 border-t border-outline">
                      <tr className="font-bold">
                        <td className="px-4 py-4 text-right text-on-surface-variant uppercase tracking-wider text-xs">Total Deductions</td>
                        <td className="px-4 py-4 text-right text-lg text-error">{formatCurrency(selectedEmployee.totalDeductions)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Final Reconciliation */}
              <div className="bg-secondary p-6 rounded-2xl flex justify-between items-center text-white shadow-xl">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1">Final Net Income</p>
                  <h3 className="text-3xl font-black tracking-tight">{formatCurrency(selectedEmployee.netPay)}</h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1">XIII Month Accrual</p>
                  <p className="text-xl font-bold font-data-mono">{formatCurrency(selectedEmployee.thirteenthMonth)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Operator Notes & Attachments Modal */}
      {selectedNoteInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl">
            <div className="p-6 border-b border-outline flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-on-surface">Comments & Documentation</h2>
                <p className="text-xs text-on-surface-variant">{selectedNoteInput.employeeName} ({selectedNoteInput.employeeCode})</p>
              </div>
              <button onClick={() => setSelectedNoteInput(null)} className="p-2 hover:bg-surface-container rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Operator Comments</label>
                <textarea 
                  value={payrollInputs.find(i => i.employeeCode === selectedNoteInput.employeeCode)?.notes || ""}
                  onChange={(e) => handleNoteChange(selectedNoteInput.employeeCode, e.target.value)}
                  placeholder="Enter any relevant information for this employee entry..."
                  className="w-full h-32 p-3 border border-outline rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Attachments</label>
                <div className="border-2 border-dashed border-outline rounded-xl p-8 flex flex-col items-center gap-3 hover:bg-surface-container-lowest transition-all cursor-pointer">
                  <Upload className="text-slate-400" size={32} />
                  <div className="text-center">
                    <p className="text-sm font-bold text-on-surface">Click to upload or drag documents</p>
                    <p className="text-xs text-on-surface-variant mt-1">PDF, JPG, or PNG (Max 5MB)</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-surface-container-low border-t border-outline flex justify-end">
              <button 
                onClick={() => setSelectedNoteInput(null)}
                className="px-6 py-2 bg-secondary text-white rounded-lg font-label-bold hover:shadow-lg transition-all"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 size={24} className="text-error" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface">Delete Payroll Run</h3>
                  <p className="text-sm text-on-surface-variant">This action cannot be undone</p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                {(() => {
                  const selected = existingRuns.find(r => r.id.toString() === selectedExistingRunId);
                  return (
                    <div className="bg-red-50/50 rounded-xl p-4 text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Period:</span>
                        <span className="font-medium">{selected ? new Date(selected.payFrom).toLocaleDateString() + ' - ' + new Date(selected.payTo).toLocaleDateString() : ''}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Status:</span>
                        <span className="font-medium uppercase">{selected?.status}</span>
                      </div>
                    </div>
                  );
                })()}
                {deleteError && (
                  <p className="text-sm text-error bg-red-50 p-3 rounded-lg">{deleteError}</p>
                )}
              </div>
              <p className="text-sm text-red-600 mb-6 bg-red-50 p-3 rounded-lg flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <span>This will permanently delete this payroll run and all associated data (inputs, earnings, deductions).</span>
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => { setShowDeleteConfirm(false); setDeleteError(""); }}
                  className="flex-1 px-4 py-2 border border-outline text-on-surface font-medium rounded-lg hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    setDeleteError("");
                    const res = await deletePayrollRunAction(Number(selectedExistingRunId));
                    if (res.success) {
                      setSelectedExistingRunId("");
                      setExistingRuns(prev => prev.filter(r => r.id.toString() !== selectedExistingRunId));
                      setShowDeleteConfirm(false);
                    } else {
                      setDeleteError(res.error || "Failed to delete");
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-error text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
