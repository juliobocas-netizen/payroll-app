"use client";

import { useState, useEffect } from "react";
import { 
  FileText, 
  Search, 
  Filter, 
  Download,
  RefreshCw,
  Eye,
  X,
  Shield,
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { useCustomer } from "@/components/Sidebar";
import { t, formatDateTimeByLocale } from "@/lib/translations";

interface AuditLog {
  id: number;
  tableName: string;
  recordId: string;
  action: string;
  changedBy: number | null;
  changedAt: string;
  oldValue: string | null;
  newValue: string | null;
  notes: string | null;
  user: { username: string; fullName: string | null } | null;
}

export default function AuditLogPage() {
  const { currentCustomer, sessionUser } = useCustomer();
  const locale = sessionUser?.languagePref || "es";
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTable, setFilterTable] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchAuditLogs();
  }, [currentCustomer]);

  async function fetchAuditLogs() {
    setIsLoading(true);
    try {
      // In production, this would be an API call
      // For now, we use mock data
      const mockLogs: AuditLog[] = [
        {
          id: 1,
          tableName: "Employee",
          recordId: "1",
          action: "INSERT",
          changedBy: 1,
          changedAt: new Date().toISOString(),
          oldValue: null,
          newValue: JSON.stringify({ employeeCode: "EMP-001", firstName: "Carlos", lastName: "Méndez" }),
          notes: "Employee created: EMP-001",
          user: { username: "admin", fullName: "Administrador GPM" },
        },
        {
          id: 2,
          tableName: "PayrollRun",
          recordId: "1",
          action: "CALCULATE",
          changedBy: 1,
          changedAt: new Date(Date.now() - 3600000).toISOString(),
          oldValue: null,
          newValue: JSON.stringify({ status: "calculated" }),
          notes: "Payroll run calculated",
          user: { username: "admin", fullName: "Administrador GPM" },
        },
        {
          id: 3,
          tableName: "PayrollRun",
          recordId: "1",
          action: "APPROVE",
          changedBy: 1,
          changedAt: new Date(Date.now() - 7200000).toISOString(),
          oldValue: null,
          newValue: null,
          notes: "Payroll run 1 approved",
          user: { username: "admin", fullName: "Administrador GPM" },
        },
        {
          id: 4,
          tableName: "Employee",
          recordId: "2",
          action: "UPDATE",
          changedBy: 1,
          changedAt: new Date(Date.now() - 86400000).toISOString(),
          oldValue: JSON.stringify({ baseSalary: 2500 }),
          newValue: JSON.stringify({ baseSalary: 2800 }),
          notes: "Employee updated: EMP-002",
          user: { username: "admin", fullName: "Administrador GPM" },
        },
        {
          id: 5,
          tableName: "Customer",
          recordId: "1",
          action: "UPDATE",
          changedBy: 1,
          changedAt: new Date(Date.now() - 172800000).toISOString(),
          oldValue: JSON.stringify({ status: "activo" }),
          newValue: JSON.stringify({ status: "inactivo" }),
          notes: "Customer updated: Tech Corp",
          user: { username: "admin", fullName: "Administrador GPM" },
        },
      ];

      setLogs(mockLogs);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.tableName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.recordId.includes(searchQuery);
    
    const matchesTable = filterTable === "all" || log.tableName === filterTable;
    const matchesAction = filterAction === "all" || log.action === filterAction;
    
    return matchesSearch && matchesTable && matchesAction;
  });

  const uniqueTables = [...new Set(logs.map(log => log.tableName))];
  const uniqueActions = [...new Set(logs.map(log => log.action))];

  function getActionBadge(action: string) {
    const styles: Record<string, string> = {
      INSERT: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      CALCULATE: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      APPROVE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      CLOSE: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
    };

    const icons: Record<string, React.ReactNode> = {
      INSERT: <CheckCircle2 size={14} />,
      UPDATE: <RefreshCw size={14} />,
      DELETE: <AlertCircle size={14} />,
      CALCULATE: <FileText size={14} />,
      APPROVE: <Shield size={14} />,
      CLOSE: <Clock size={14} />,
    };

    return (
      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[action] || styles.INSERT}`}>
        {icons[action]}
        <span>{action}</span>
      </span>
    );
  }

  function formatDate(dateStr: string, locale: string) {
    return formatDateTimeByLocale(new Date(dateStr), locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-surface">{t(locale, "audit.title")}</h1>
          <p className="font-body-base text-on-surface-variant mt-1">{t(locale, "audit.subtitle")}</p>
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
          
          <div className="flex space-x-2">
            <button 
              onClick={fetchAuditLogs}
              className="flex items-center space-x-2 px-4 py-2 border border-outline rounded-lg hover:bg-surface-container transition-all text-on-surface font-medium"
            >
              <RefreshCw size={18} />
              <span>{t(locale, "audit.reload")}</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 border border-outline rounded-lg hover:bg-surface-container transition-all text-on-surface font-medium">
              <Download size={18} />
              <span>{t(locale, "common.export")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center bg-card/50 flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder={t(locale, "audit.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <div className="flex space-x-2">
            <select 
              value={filterTable}
              onChange={(e) => setFilterTable(e.target.value)}
              className="px-4 py-2 text-sm font-medium border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">{t(locale, "audit.allTables")}</option>
              {uniqueTables.map(table => (
                <option key={table} value={table}>{table}</option>
              ))}
            </select>
            <select 
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-4 py-2 text-sm font-medium border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">{t(locale, "audit.allActions")}</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Audit Logs Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p>{t(locale, "audit.loading")}</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>{t(locale, "audit.noRecords")}</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/50 text-muted-foreground text-sm">
                  <th className="px-6 py-4 font-medium">{t(locale, "audit.dateTime")}</th>
                  <th className="px-6 py-4 font-medium">{t(locale, "audit.actionCol")}</th>
                  <th className="px-6 py-4 font-medium">{t(locale, "audit.table")}</th>
                  <th className="px-6 py-4 font-medium">{t(locale, "audit.recordId")}</th>
                  <th className="px-6 py-4 font-medium">{t(locale, "audit.user")}</th>
                  <th className="px-6 py-4 font-medium">{t(locale, "audit.notesCol")}</th>
                  <th className="px-6 py-4 font-medium">{t(locale, "audit.actionsCol")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-4 text-sm">{formatDate(log.changedAt, locale)}</td>
                    <td className="px-6 py-4">{getActionBadge(log.action)}</td>
                    <td className="px-6 py-4 text-sm font-medium">{log.tableName}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">#{log.recordId}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium">{log.user?.fullName || log.user?.username || "-"}</p>
                        <p className="text-xs text-muted-foreground">@{log.user?.username || t(locale, "audit.system")}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm max-w-xs truncate">{log.notes || "-"}</td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => { setSelectedLog(log); setShowDetailModal(true); }}
                        className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title={t(locale, "audit.viewDetails")}
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-border flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {t(locale, "audit.showing").replace("{count}", filteredLogs.length.toString()).replace("{total}", logs.length.toString())}
          </p>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-outline shadow-2xl rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold">{t(locale, "audit.recordDetails")}</h2>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-secondary rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="flex items-center space-x-4">
                {getActionBadge(selectedLog.action)}
                <div>
                  <p className="font-medium">{selectedLog.tableName} #{selectedLog.recordId}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(selectedLog.changedAt, locale)}</p>
                </div>
              </div>

              {/* User Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-secondary/50 rounded-xl">
                  <p className="text-xs text-muted-foreground">{t(locale, "audit.userLabel")}</p>
                  <p className="font-medium">{selectedLog.user?.fullName || selectedLog.user?.username || t(locale, "audit.system")}</p>
                </div>
                <div className="p-4 bg-secondary/50 rounded-xl">
                  <p className="text-xs text-muted-foreground">{t(locale, "audit.usernameLabel")}</p>
                  <p className="font-medium">@{selectedLog.user?.username || t(locale, "audit.system")}</p>
                </div>
              </div>

              {/* Notes */}
              {selectedLog.notes && (
                <div className="p-4 bg-secondary/50 rounded-xl">
                  <p className="text-xs text-muted-foreground">{t(locale, "audit.notesLabel")}</p>
                  <p className="font-medium">{selectedLog.notes}</p>
                </div>
              )}

              {/* Old Value */}
              {selectedLog.oldValue && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-2">{t(locale, "audit.oldValue")}</p>
                  <pre className="text-sm overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(JSON.parse(selectedLog.oldValue), null, 2)}
                  </pre>
                </div>
              )}

              {/* New Value */}
              {selectedLog.newValue && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-2">{t(locale, "audit.newValue")}</p>
                  <pre className="text-sm overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(JSON.parse(selectedLog.newValue), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
