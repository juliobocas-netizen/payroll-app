"use client";

import { useState, useEffect } from "react";
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Search, 
  ChevronRight, 
  MoreVertical,
  X,
  FileText,
  Users,
  Calendar,
  Eye,
  Trash2,
  Check
} from "lucide-react";
import { useCustomer } from "@/components/Sidebar";
import { t } from "@/lib/translations";

interface Exception {
  id: number;
  type: "error" | "warning" | "info";
  title: string;
  description: string;
  category: string;
  affectedRecord: string;
  status: "pending" | "resolved" | "ignored";
  priority: "high" | "medium" | "low";
  createdAt: string;
  customerId: number;
}

export default function ExceptionsPage() {
  const { currentCustomer, sessionUser } = useCustomer();
  const locale = sessionUser?.languagePref || "es";
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedException, setSelectedException] = useState<Exception | null>(null);

  useEffect(() => {
    loadExceptions();
  }, [currentCustomer]);

  function loadExceptions() {
    setIsLoading(true);
    // Mock data for demo
    const mockExceptions: Exception[] = [
      {
        id: 1,
        type: "error",
        title: "Missing Tax ID",
        description: "Employee Rodriguez, M. has a missing or invalid RUC/Tax ID.",
        category: "Payroll",
        affectedRecord: "EMP-0042",
        status: "pending",
        priority: "high",
        createdAt: new Date().toISOString(),
        customerId: 1,
      },
      {
        id: 2,
        type: "warning",
        title: "Excessive Overtime",
        description: "Kitchen Dept has exceeded the maximum overtime threshold of 48 hrs.",
        category: "Compliance",
        affectedRecord: "Dept: Kitchen",
        status: "pending",
        priority: "medium",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        customerId: 1,
      },
      {
        id: 3,
        type: "info",
        title: "Upcoming Contract Renewal",
        description: "3 employees have contracts expiring in the next 30 days.",
        category: "HR",
        affectedRecord: "Multiple",
        status: "pending",
        priority: "low",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        customerId: 1,
      },
      {
        id: 4,
        type: "error",
        title: "Duplicate Bank Account",
        description: "Account number ending in 4221 is assigned to two different employees.",
        category: "Payroll",
        affectedRecord: "ACC-4221",
        status: "pending",
        priority: "high",
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        customerId: 1,
      }
    ];

    const filtered = currentCustomer 
      ? mockExceptions.filter(ex => ex.customerId === currentCustomer.id)
      : mockExceptions;
    
    setExceptions(filtered);
    setIsLoading(false);
  }

  const filteredExceptions = exceptions.filter(ex => {
    const matchesSearch = 
      ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.affectedRecord.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === "all" || ex.type === filterType;
    const matchesStatus = filterStatus === "all" || ex.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  function getIcon(type: string) {
    switch (type) {
      case "error": return <AlertCircle className="text-error" size={20} />;
      case "warning": return <AlertTriangle className="text-amber-500" size={20} />;
      case "info": return <Clock className="text-blue-500" size={20} />;
      default: return <AlertCircle size={20} />;
    }
  }

  function getPriorityBadge(priority: string) {
    const styles = {
      high: "bg-red-100 text-red-700",
      medium: "bg-amber-100 text-amber-700",
      low: "bg-blue-100 text-blue-700",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${styles[priority as keyof typeof styles]}`}>
        {priority}
      </span>
    );
  }

  function resolveException(id: number) {
    setExceptions(prev => prev.map(ex => ex.id === id ? { ...ex, status: "resolved" } : ex));
  }

  return (
    <div className="ml-0 p-8 max-w-[1440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-surface">{t(locale, "exceptions.title")}</h2>
          <p className="font-body-base text-on-surface-variant mt-1">
            {t(locale, "exceptions.subtitle")}
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
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-outline shadow-sm">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t(locale, "exceptions.totalExceptions")}</p>
          <p className="text-3xl font-bold text-on-surface">{exceptions.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-outline shadow-sm">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t(locale, "exceptions.highPriority")}</p>
          <p className="text-3xl font-bold text-error">{exceptions.filter(e => e.priority === 'high').length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-outline shadow-sm">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t(locale, "exceptions.pending")}</p>
          <p className="text-3xl font-bold text-amber-500">{exceptions.filter(e => e.status === 'pending').length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-outline shadow-sm text-emerald-600">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t(locale, "exceptions.resolvedToday")}</p>
          <p className="text-3xl font-bold">12</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-outline flex flex-wrap gap-4 items-center mb-8 shadow-sm">
        <div className="relative max-w-md w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder={t(locale, "exceptions.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm border-outline rounded focus:ring-secondary outline-none bg-white px-4"
        >
          <option value="all">{t(locale, "exceptions.severityAll")}</option>
          <option value="error">{t(locale, "exceptions.errors")}</option>
          <option value="warning">{t(locale, "exceptions.warnings")}</option>
          <option value="info">{t(locale, "exceptions.information")}</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border-outline rounded focus:ring-secondary outline-none bg-white px-4"
        >
          <option value="all">{t(locale, "exceptions.statusAll")}</option>
          <option value="pending">{t(locale, "exceptions.pendingStatus")}</option>
          <option value="resolved">{t(locale, "exceptions.resolved")}</option>
        </select>
        <button className="flex items-center gap-2 px-3 py-2 border border-outline rounded text-sm text-on-surface hover:bg-surface-container-low transition-all ml-auto">
          <Filter size={16} />
          {t(locale, "exceptions.moreFilters")}
        </button>
      </div>

      {/* Exceptions Table */}
      <div className="bg-white border border-outline rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low border-b border-outline text-on-surface-variant font-label-bold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">{t(locale, "exceptions.anomalyDetail")}</th>
              <th className="px-6 py-4">{t(locale, "exceptions.category")}</th>
              <th className="px-6 py-4">{t(locale, "exceptions.affectedRecord")}</th>
              <th className="px-6 py-4">{t(locale, "exceptions.priority")}</th>
              <th className="px-6 py-4">{t(locale, "exceptions.status")}</th>
              <th className="px-6 py-4 text-right">{t(locale, "common.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {isLoading ? (
              <tr><td colSpan={6} className="p-8 text-center text-on-surface-variant">{t(locale, "exceptions.scanning")}</td></tr>
            ) : filteredExceptions.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-on-surface-variant">{t(locale, "exceptions.noAnomalies")}</td></tr>
            ) : (
              filteredExceptions.map((ex) => (
                <tr key={ex.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="px-6 py-4 max-w-sm">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getIcon(ex.type)}</div>
                      <div>
                        <p className="font-bold text-on-surface">{ex.title}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">{ex.description}</p>
                        <p className="text-[10px] text-on-surface-variant/60 mt-1 uppercase font-bold tracking-tighter">
                          {new Date(ex.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-on-surface-variant font-medium">{ex.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-secondary bg-secondary/5 px-2 py-1 rounded text-xs">
                      {ex.affectedRecord}
                    </span>
                  </td>
                  <td className="px-6 py-4">{getPriorityBadge(ex.priority)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      ex.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {ex.status === 'pending' ? <Clock size={12} className="mr-1" /> : <Check size={12} className="mr-1" />}
                      {ex.status === 'pending' ? t(locale, "exceptions.pending").toUpperCase() : t(locale, "exceptions.resolved").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {ex.status === 'pending' && (
                        <button 
                          onClick={() => resolveException(ex.id)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title={t(locale, "exceptions.markResolved")}
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      )}
                      <button className="p-1.5 text-on-surface-variant hover:text-secondary rounded-lg transition-all">
                        <Eye size={18} />
                      </button>
                      <button className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg transition-all">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
