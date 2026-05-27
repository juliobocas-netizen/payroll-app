"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Plus,
  MoreVertical,
  Edit3,
  Trash2,
  Eye,
  Download,
  Upload,
  X,
  Check,
  AlertCircle,
  Building2,
  Filter,
  LayoutGrid,
  List,
  UserPlus,
} from "lucide-react";
import { useCustomer } from "@/components/Sidebar";
import { getEmployeesAction, createEmployeeAction, updateEmployeeAction, importStaffAction, getBankAccountsAction, checkEmployeeTransactionsAction } from "@/lib/server-actions";
import * as XLSX from "xlsx";
import { t, formatCurrencyByLocale } from "@/lib/translations";

interface Employee {
  id: number;
  customerId: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  identificationNumber: string | null;
  sssNumber: string | null;
  birthDate: string | null;
  departmentId: number | null;
  positionId: number | null;
  baseSalary: number;
  salaryFrequency: string;
  paymentMethod: string;
  bankId: number | null;
  accountNumber: string | null;
  accountType: string | null;
  isOvertimeEligible: boolean;
  restDay: string;
  hireDate: string | null;
  terminationDate: string | null;
  isActive: boolean;
  department: { id: number; name: string } | null;
  position: { id: number; title: string } | null;
  bank: { id: number; bankName: string } | null;
}

interface Department {
  id: number;
  name: string;
}

interface Position {
  id: number;
  title: string;
}

export default function EmployeesPage() {
  const { currentCustomer, sessionUser } = useCustomer();
  const locale = sessionUser?.languagePref || "es";
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPayType, setFilterPayType] = useState("all");
  const [banks, setBanks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<any>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeHasTransactions, setEmployeeHasTransactions] = useState(false);
  const [formData, setFormData] = useState({
    employeeCode: "",
    firstName: "",
    lastName: "",
    identificationNumber: "",
    sssNumber: "",
    birthDate: "",
    departmentId: "" as string | number,
    positionId: "" as string | number,
    baseSalary: 0,
    salaryFrequency: "monthly",
    paymentMethod: "bank",
    bankId: "" as string | number,
    accountNumber: "",
    accountType: "checking",
    restDay: "domingo",
    hireDate: "",
    isOvertimeEligible: true,
    isActive: true,
  });

  useEffect(() => {
    fetchEmployees();
  }, [currentCustomer]);

  async function fetchEmployees() {
    setIsLoading(true);
    try {
      if (currentCustomer) {
        const res = await getEmployeesAction(currentCustomer.id);
        if (res.success && res.employees) {
          const formattedEmployees = res.employees.map((emp: any) => ({
            ...emp,
            hireDate: emp.hireDate ? new Date(emp.hireDate).toISOString().split('T')[0] : null,
            birthDate: emp.birthDate ? new Date(emp.birthDate).toISOString().split('T')[0] : null,
            terminationDate: emp.terminationDate ? new Date(emp.terminationDate).toISOString().split('T')[0] : null,
          }));
          setEmployees(formattedEmployees);
        } else {
          setEmployees([]);
        }

        const bankRes = await getBankAccountsAction(false);
        if (bankRes.success && bankRes.banks) setBanks(bankRes.banks);
      } else {
        setEmployees([]);
      }

      const storedDepts = localStorage.getItem("gpm_departments") || "[]";
      let depts = JSON.parse(storedDepts);
      if (depts.length === 0) {
        depts = [
          { id: 1, name: "Operations" },
          { id: 2, name: "Finance" },
          { id: 3, name: "HR" },
          { id: 4, name: "Sales" },
        ];
        localStorage.setItem("gpm_departments", JSON.stringify(depts));
      }
      setDepartments(depts);

      const storedPositions = localStorage.getItem("gpm_positions") || "[]";
      let pos = JSON.parse(storedPositions);
      if (pos.length === 0) {
        pos = [
          { id: 1, title: "Manager" },
          { id: 2, title: "Analyst" },
          { id: 3, title: "Specialist" },
          { id: 4, title: "Clerk" },
        ];
        localStorage.setItem("gpm_positions", JSON.stringify(pos));
      }
      setPositions(pos);

    } catch (error) {
      console.error("Failed to fetch employees:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSave = async () => {
    if (!currentCustomer) return;

    const form = new FormData();
    form.append("customerId", currentCustomer.id.toString());
    form.append("employeeCode", formData.employeeCode);
    form.append("firstName", formData.firstName);
    form.append("lastName", formData.lastName);
    form.append("identificationNumber", formData.identificationNumber || "");
    form.append("sssNumber", formData.sssNumber || "");
    form.append("birthDate", formData.birthDate || "");
    form.append("departmentId", formData.departmentId.toString());
    form.append("positionId", formData.positionId.toString());
    form.append("baseSalary", formData.baseSalary.toString());
    form.append("salaryFrequency", formData.salaryFrequency);
    form.append("paymentMethod", formData.paymentMethod);
    form.append("bankId", formData.bankId.toString());
    form.append("accountNumber", formData.accountNumber);
    form.append("accountType", formData.accountType);
    form.append("restDay", formData.restDay);
    form.append("hireDate", formData.hireDate || "");
    form.append("isOvertimeEligible", formData.isOvertimeEligible ? "true" : "false");

    try {
      if (editingEmployee) {
        const res = await updateEmployeeAction(editingEmployee.id, form);
        if (!res.success) {
          alert(res.error || "Failed to update employee");
          return;
        }
      } else {
        const res = await createEmployeeAction(form);
        if (!res.success) {
          alert(res.error || "Failed to create employee");
          return;
        }
      }
      setIsModalOpen(false);
      setEditingEmployee(null);
      setEmployeeHasTransactions(false);
      await fetchEmployees();
    } catch (error) {
      console.error("Failed to save employee:", error);
      alert("Failed to save employee. Please try again.");
    }
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { employeeCode: "EMP001", firstName: "Juan", lastName: "Perez", identificationNumber: "8-000-000", sssNumber: "123456789", department: "Operations", position: "Analyst", baseSalary: 1000, salaryFrequency: "monthly", paymentMethod: "bank", hireDate: "2023-01-01", isActive: true }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    
    const url = window.URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Staff_Import_Template.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleImportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentCustomer) return;

    setIsImporting(true);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const ab = evt.target?.result;
        const wb = XLSX.read(ab, { type: "array" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const res = await importStaffAction(currentCustomer.id, data);
        if (res.success) {
          setImportSummary(res.summary);
          await fetchEmployees();
        } else {
          alert(res.error || "Failed to import staff.");
        }
      } catch (error) {
        console.error("Import error", error);
        alert("Invalid file format.");
      } finally {
        setIsImporting(false);
        // Reset file input
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleEdit = async (emp: Employee) => {
    setEditingEmployee(emp);
    const txnRes = await checkEmployeeTransactionsAction(emp.id);
    setEmployeeHasTransactions(txnRes.success ? txnRes.hasTransactions : false);
    setFormData({
      employeeCode: emp.employeeCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      identificationNumber: emp.identificationNumber || "",
      sssNumber: emp.sssNumber || "",
      birthDate: emp.birthDate || "",
      departmentId: emp.departmentId || "",
      positionId: emp.positionId || "",
      baseSalary: emp.baseSalary,
      salaryFrequency: emp.salaryFrequency,
      paymentMethod: emp.paymentMethod,
      bankId: emp.bankId || "",
      accountNumber: emp.accountNumber || "",
      accountType: emp.accountType || "checking",
      restDay: emp.restDay,
      hireDate: emp.hireDate || "",
      isOvertimeEligible: emp.isOvertimeEligible,
      isActive: emp.isActive,
    });
    setIsModalOpen(true);
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.identificationNumber && emp.identificationNumber.includes(searchQuery));

    const matchesDepartment = filterDepartment === "all" ||
      emp.department?.name === filterDepartment;

    const matchesStatus = filterStatus === "all" ||
      (filterStatus === "Active" && emp.isActive) ||
      (filterStatus === "On Leave" && emp.isActive) ||
      (filterStatus === "Terminated" && !emp.isActive);

    const matchesPayType = filterPayType === "all" ||
      emp.salaryFrequency.toLowerCase() === filterPayType.toLowerCase();

    return matchesSearch && matchesDepartment && matchesStatus && matchesPayType;
  });

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.isActive).length;
  const departmentsCount = new Set(employees.map(e => e.department?.name).filter(Boolean)).size;
  const onboardingCount = 4; // Mock data

  function formatCurrency(amount: number) {
    return formatCurrencyByLocale(amount, locale);
  }

  function getInitials(firstName: string, lastName: string) {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  }

  function getStatusBadge(isActive: boolean) {
    if (isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
          {t(locale, "employees.active")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
        {t(locale, "employees.inactive")}
      </span>
    );
  }

  return (
    <div className="ml-0 p-8 max-w-[1440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header & Actions */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h3 className="font-display-lg text-display-lg text-on-surface">{t(locale, "employees.title")}</h3>
          <p className="font-body-base text-body-base text-on-surface-variant mt-1">
            {t(locale, "employees.subtitle")}
          </p>
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
            <button 
              disabled={!currentCustomer}
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 border border-outline rounded-lg text-on-surface font-medium hover:bg-surface-container transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              <Upload size={16} />
              <span className="text-sm">{t(locale, "employees.importStaff")}</span>
            </button>
            <button 
              disabled={!currentCustomer}
              onClick={() => {
                setEditingEmployee(null);
                setEmployeeHasTransactions(false);
                setFormData({
                  employeeCode: "",
                  firstName: "",
                  lastName: "",
                  identificationNumber: "",
                  sssNumber: "",
                  birthDate: "",
                  departmentId: "",
                  positionId: "",
                  baseSalary: 0,
                  salaryFrequency: "monthly",
                  paymentMethod: "bank",
                  bankId: "",
                  accountNumber: "",
                  accountType: "checking",
                  restDay: "domingo",
                  hireDate: "",
                  isOvertimeEligible: true,
                  isActive: true,
                });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg text-white font-medium hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus size={16} />
              <span className="text-sm">{t(locale, "employees.addEmployee")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Quick View */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-outline shadow-sm">
          <p className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider mb-2">{t(locale, "employees.totalEmployees")}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-on-surface">{totalEmployees}</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-outline shadow-sm">
          <p className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider mb-2">{t(locale, "employees.activePayroll")}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-on-surface">{activeEmployees}</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-outline shadow-sm">
          <p className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider mb-2">{t(locale, "employees.departments")}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-on-surface">{departmentsCount}</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-outline shadow-sm">
          <p className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider mb-2">{t(locale, "employees.customer")}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-secondary truncate">{currentCustomer?.name || t(locale, "common.noneSelected")}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-outline flex flex-wrap gap-4 items-center mb-8">
        <div className="flex items-center gap-2 px-3 py-2 border border-outline rounded text-sm text-on-surface bg-surface-container-low">
          <Filter size={18} />
          <span className="font-medium">{t(locale, "employees.filterBy")}</span>
        </div>
        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          className="text-sm border-outline rounded focus:ring-secondary focus:border-secondary bg-white"
        >
          <option value="all">{t(locale, "employees.departmentAll")}</option>
          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border-outline rounded focus:ring-secondary focus:border-secondary bg-white"
        >
          <option value="all">{t(locale, "employees.statusAll")}</option>
          <option value="Active">{t(locale, "employees.active")}</option>
          <option value="Inactive">{t(locale, "employees.inactive")}</option>
        </select>
        <select
          value={filterPayType}
          onChange={(e) => setFilterPayType(e.target.value)}
          className="text-sm border-outline rounded focus:ring-secondary focus:border-secondary bg-white"
        >
          <option value="all">{t(locale, "employees.payTypeAll")}</option>
          <option value="monthly">{t(locale, "employees.monthly")}</option>
          <option value="biweekly">{t(locale, "employees.biweekly")}</option>
          <option value="weekly">{t(locale, "employees.weekly")}</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-outline rounded-lg overflow-hidden shadow-sm">
        {/* Search Header */}
        <div className="px-6 py-4 border-b border-outline flex items-center justify-between bg-surface-container-low">
          <div className="relative max-w-md w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder={t(locale, "employees.searchDirectory")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary focus:border-secondary outline-none font-body-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-on-surface-variant">{t(locale, "employees.loading")}</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>{t(locale, "employees.noEmployeesFound")}</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low border-b border-outline">
              <tr>
                <th className="px-6 py-4 font-label-bold text-label-bold text-on-surface-variant uppercase">{t(locale, "employees.employeeName")}</th>
                <th className="px-6 py-4 font-label-bold text-label-bold text-on-surface-variant uppercase">{t(locale, "employees.idNo")}</th>
                <th className="px-6 py-4 font-label-bold text-label-bold text-on-surface-variant uppercase">{t(locale, "employees.department")}</th>
                <th className="px-6 py-4 font-label-bold text-label-bold text-on-surface-variant uppercase">{t(locale, "employees.position")}</th>
                <th className="px-6 py-4 font-label-bold text-label-bold text-on-surface-variant uppercase">{t(locale, "employees.status")}</th>
                <th className="px-6 py-4 font-label-bold text-label-bold text-on-surface-variant uppercase text-right">{t(locale, "employees.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                        {getInitials(emp.firstName, emp.lastName)}
                      </div>
                      <div>
                        <p className="font-medium text-on-surface">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-on-surface-variant">{emp.position?.title || "-"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-data-mono text-data-mono text-on-surface">{emp.employeeCode}</td>
                  <td className="px-6 py-4 text-sm text-on-surface">{emp.department?.name || "-"}</td>
                  <td className="px-6 py-4 text-sm text-on-surface">{emp.position?.title || "-"}</td>
                  <td className="px-6 py-4">
                    {getStatusBadge(emp.isActive)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleEdit(emp)}
                      className="p-1 text-on-surface-variant hover:text-secondary transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button className="p-1 text-on-surface-variant hover:text-on-surface transition-all">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        <div className="px-6 py-4 bg-surface-container-low border-t border-outline flex justify-between items-center text-sm text-on-surface-variant">
          <p>{t(locale, "employees.showing")} {filteredEmployees.length} {t(locale, "employees.of")} {employees.length} {t(locale, "employees.entries")}</p>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-outline flex justify-between items-center bg-surface-container-low">
              <h4 className="font-bold text-on-surface">
                {editingEmployee ? t(locale, "employees.editProfile") : t(locale, "employees.registerNew")} - {currentCustomer?.name}
              </h4>
              <button onClick={() => { setIsModalOpen(false); setEditingEmployee(null); setEmployeeHasTransactions(false); }} className="text-on-surface-variant hover:text-on-surface">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "employees.firstName")}</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "employees.lastName")}</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "employees.employeeCode")}</label>
                <input
                  type="text"
                  value={formData.employeeCode}
                  disabled={!!editingEmployee && employeeHasTransactions}
                  onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "employees.identificationNumber")}</label>
                <input
                  type="text"
                  value={formData.identificationNumber}
                  onChange={(e) => setFormData({ ...formData, identificationNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "employees.department")}</label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none bg-white"
                >
                  <option value="">{t(locale, "employees.selectDepartment")}</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "employees.position")}</label>
                <select
                  value={formData.positionId}
                  onChange={(e) => setFormData({ ...formData, positionId: e.target.value })}
                  className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none bg-white"
                >
                  <option value="">{t(locale, "employees.selectPosition")}</option>
                  {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "employees.socialSecurityId")}</label>
                <input
                  type="text"
                  value={formData.sssNumber}
                  onChange={(e) => setFormData({ ...formData, sssNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "employees.birthDate")}</label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "employees.baseSalary")}</label>
                <input
                  type="number"
                  value={formData.baseSalary}
                  onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "employees.payFrequency")}</label>
                <select
                  value={formData.salaryFrequency}
                  onChange={(e) => setFormData({ ...formData, salaryFrequency: e.target.value })}
                  className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none bg-white"
                >
                  <option value="monthly">{t(locale, "employees.monthly")}</option>
                  <option value="biweekly">{t(locale, "employees.biweekly")}</option>
                  <option value="weekly">{t(locale, "employees.weekly")}</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "employees.hireDate")}</label>
                <input
                  type="date"
                  value={formData.hireDate}
                  onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                  className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "employees.paymentMethod")}</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none bg-white"
                >
                  <option value="bank">{t(locale, "reportDetail.bank")}</option>
                  <option value="transfer">{t(locale, "reportDetail.transfer")}</option>
                  <option value="cash">{t(locale, "reportDetail.cash")}</option>
                  <option value="check">{t(locale, "reportDetail.check")}</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "employees.bank")}</label>
                <select
                  value={formData.bankId}
                  onChange={(e) => setFormData({ ...formData, bankId: e.target.value })}
                  className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none bg-white"
                >
                  <option value="">{banks.length > 0 ? t(locale, "employees.selectBank") : t(locale, "employees.noBanks")}</option>
                  {banks.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.bankName}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "employees.accountNumber")}</label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "employees.accountType")}</label>
                <select
                  value={formData.accountType}
                  onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                  className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none bg-white"
                >
                  <option value="checking">{t(locale, "employees.checking")}</option>
                  <option value="savings">{t(locale, "employees.savings")}</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-secondary rounded border-outline"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-on-surface">{t(locale, "employees.employeeActive")}</label>
              </div>
            </div>
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline flex justify-end gap-3">
              <button 
                onClick={() => { setIsModalOpen(false); setEditingEmployee(null); setEmployeeHasTransactions(false); }}
                className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-all"
              >
                {t(locale, "employees.cancel")}
              </button>
              <button 
                onClick={handleSave}
                className="px-6 py-2 bg-secondary text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-sm"
              >
                {editingEmployee ? t(locale, "employees.updateEmployee") : t(locale, "employees.saveEmployee")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Staff Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-outline flex justify-between items-center bg-surface-container-low">
              <h4 className="font-bold text-on-surface">Import Staff - {currentCustomer?.name}</h4>
              <button onClick={() => { setIsImportModalOpen(false); setImportSummary(null); }} className="text-on-surface-variant hover:text-on-surface">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {!importSummary ? (
                <>
                  <p className="text-sm text-on-surface-variant mb-6">
                    Download the Excel template, fill it with your employee data, and upload it to import or update staff records.
                    Required columns: employeeCode, firstName, lastName, baseSalary.
                  </p>
                  
                  <div className="flex flex-col gap-4">
                    <button 
                      onClick={handleDownloadTemplate}
                      className="flex items-center justify-center gap-2 px-4 py-3 border border-outline rounded-lg font-medium text-secondary hover:bg-secondary/5 transition-all"
                    >
                      <Download size={18} />
                      Download Excel Template
                    </button>
                    
                    <div className="relative">
                      <input 
                        type="file" 
                        accept=".xlsx, .xls"
                        onChange={handleImportUpload}
                        disabled={isImporting}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${isImporting ? 'bg-surface-container text-on-surface-variant cursor-not-allowed' : 'bg-secondary text-white hover:bg-blue-700'}`}>
                        {isImporting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-on-surface-variant border-t-transparent rounded-full animate-spin"></div>
                            Importing Data...
                          </>
                        ) : (
                          <>
                            <Upload size={18} />
                            Upload and Import Excel File
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-green-600 bg-green-50 p-4 rounded-lg border border-green-200">
                    <Check className="flex-shrink-0" size={24} />
                    <div>
                      <h5 className="font-bold">Import Completed</h5>
                      <p className="text-sm text-green-700">Processed {importSummary.totalProcessed} records.</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-container-low p-4 rounded-lg">
                      <p className="text-xs font-bold text-on-surface-variant uppercase mb-1">New Employees</p>
                      <p className="text-2xl font-black text-on-surface">{importSummary.newEmployees}</p>
                    </div>
                    <div className="bg-surface-container-low p-4 rounded-lg">
                      <p className="text-xs font-bold text-on-surface-variant uppercase mb-1">Updated Employees</p>
                      <p className="text-2xl font-black text-on-surface">{importSummary.updatedEmployees.length}</p>
                    </div>
                  </div>

                  {importSummary.updatedEmployees.length > 0 && (
                    <div className="border border-outline rounded-lg overflow-hidden">
                      <div className="bg-surface-container-low px-3 py-2 border-b border-outline">
                        <p className="text-xs font-bold text-on-surface-variant uppercase">Updated Employees List</p>
                      </div>
                      <ul className="max-h-32 overflow-y-auto divide-y divide-outline text-sm">
                        {importSummary.updatedEmployees.map((emp: any, idx: number) => (
                          <li key={idx} className="px-3 py-2 flex justify-between">
                            <span className="font-medium text-on-surface">{emp.name}</span>
                            <span className="text-on-surface-variant font-data-mono">{emp.code}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {importSummary.newDepartments.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-sm">
                      <p className="font-bold text-blue-800 mb-1">New Departments Created:</p>
                      <p className="text-blue-700">{importSummary.newDepartments.join(", ")}</p>
                    </div>
                  )}

                  {importSummary.newPositions.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-sm">
                      <p className="font-bold text-blue-800 mb-1">New Positions Created:</p>
                      <p className="text-blue-700">{importSummary.newPositions.join(", ")}</p>
                    </div>
                  )}

                  {importSummary.errors.length > 0 && (
                    <div className="border border-red-200 rounded-lg overflow-hidden">
                      <div className="bg-red-50 px-3 py-2 border-b border-red-200 flex items-center gap-2">
                        <AlertCircle className="text-red-500" size={16} />
                        <p className="text-xs font-bold text-red-700 uppercase">Errors Encountered ({importSummary.errors.length})</p>
                      </div>
                      <ul className="max-h-32 overflow-y-auto divide-y divide-red-100 text-sm bg-red-50/30">
                        {importSummary.errors.map((err: any, idx: number) => (
                          <li key={idx} className="px-3 py-2">
                            <span className="font-bold text-red-600 mr-2">Row {err.row}:</span>
                            <span className="text-red-700">{err.error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>

  );
}
