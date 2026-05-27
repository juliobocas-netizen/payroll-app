"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { getAllCustomersAction } from "@/lib/server-actions";
import { t } from "@/lib/translations";
import {
  LayoutDashboard,
  Users,
  Calculator,
  Settings,
  CircleDollarSign,
  Building2,
  LogOut,
  Shield,
  FileText,
  LogIn,
  FileSearch,
  UserCog,
  AlertTriangle,
  Calendar,
  Database,
  ChevronDown,
  ChevronRight,
  Percent,
  Clock,
  Sun,
  Sliders,
} from "lucide-react";

export interface Customer {
  id: number;
  name: string;
  ruc: string | null;
  address: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  servicioFee: number;
  status: string;
}

interface SessionUser {
  userId: number;
  username: string;
  fullName: string | null;
  email: string;
  roleId: number;
  roleName: string;
  roleLevel: number;
  customerId: number | null;
  lastCustomerId: number | null;
  languagePref: string;
  dateFormat: string;
  currencyDisplay: string;
}

interface CustomerContextType {
  currentCustomer: Customer | null;
  setCurrentCustomer: (customer: Customer | null) => void;
  isAdminView: boolean;
  allCustomers: Customer[];
  setAllCustomers: (customers: Customer[]) => void;
  sessionUser: SessionUser | null;
  setSessionUser: (user: SessionUser | null) => void;
  isInitialized: boolean;
  logout: () => void;
}

const CustomerContext = createContext<CustomerContextType>({
  currentCustomer: null,
  setCurrentCustomer: () => {},
  isAdminView: false,
  allCustomers: [],
  setAllCustomers: () => {},
  sessionUser: null,
  setSessionUser: () => {},
  isInitialized: false,
  logout: () => {},
});

export const useCustomer = () => useContext(CustomerContext);

export const useIsAdminView = () => {
  const { isAdminView } = useCustomer();
  return isAdminView;
};

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const storedSession = localStorage.getItem("gpm_session");
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        setSessionUser(parsed);
        setIsAdminView(parsed.roleLevel >= 4);
      } catch {
        localStorage.removeItem("gpm_session");
      }
    }

    // Fetch real customers from database
    getAllCustomersAction().then(res => {
      if (res.success && res.customers) {
        setAllCustomers(res.customers);
        localStorage.setItem("gpm_customers", JSON.stringify(res.customers));
        
        // Match last customer to real one
        const storedCustomerId = localStorage.getItem("gpm_last_customer");
        if (storedCustomerId) {
          const cid = parseInt(storedCustomerId);
          const found = res.customers.find((c: Customer) => c.id === cid);
          if (found) {
            setCurrentCustomer(found);
          } else {
            // ID no longer exists in DB, clear it
            setCurrentCustomer(null);
            localStorage.removeItem("gpm_last_customer");
          }
        }
      }
    });

    setIsInitialized(true);
  }, []);

  const handleSetCurrentCustomer = useCallback((customer: Customer | null) => {
    setCurrentCustomer(customer);
    if (customer) {
      localStorage.setItem("gpm_last_customer", customer.id.toString());
    }
  }, []);

  const handleSetSessionUser = useCallback((user: SessionUser | null) => {
    setSessionUser(user);
    if (user) {
      localStorage.setItem("gpm_session", JSON.stringify(user));
      setIsAdminView(user.roleLevel >= 4);
    } else {
      localStorage.removeItem("gpm_session");
      setIsAdminView(false);
    }
  }, []);

  const handleSetAllCustomers = useCallback((customers: Customer[]) => {
    setAllCustomers(customers);
    localStorage.setItem("gpm_customers", JSON.stringify(customers));
  }, []);

  const logout = useCallback(() => {
    setSessionUser(null);
    setCurrentCustomer(null);
    localStorage.removeItem("gpm_session");
    localStorage.removeItem("gpm_last_customer");
  }, []);

  return (
    <CustomerContext.Provider value={{
      currentCustomer,
      setCurrentCustomer: handleSetCurrentCustomer,
      isAdminView,
      allCustomers,
      setAllCustomers: handleSetAllCustomers,
      sessionUser,
      setSessionUser: handleSetSessionUser,
      isInitialized,
      logout,
    }}>
      {children}
    </CustomerContext.Provider>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { currentCustomer, setCurrentCustomer, allCustomers, sessionUser, logout } = useCustomer();
  const [isTableMaintenanceOpen, setIsTableMaintenanceOpen] = useState(false);
  const locale = sessionUser?.languagePref || "es";

  const isAdmin = useIsAdminView();

  const navItems = [
    { key: "sidebar.dashboard", href: "/", icon: LayoutDashboard },
    { key: "sidebar.employees", href: "/employees", icon: Users },
    { key: "sidebar.runPayroll", href: "/payroll-run", icon: Calculator },
    { key: "sidebar.audit", href: "/audit-log", icon: FileSearch },
    { key: "sidebar.reports", href: "/report-center", icon: FileText },
    { key: "sidebar.exceptions", href: "/exceptions", icon: AlertTriangle },
    { key: "sidebar.calendars", href: "/settings/pay-calendars", icon: Calendar },
    { key: "sidebar.customers", href: "/settings/customers", icon: Building2 },
    { key: "sidebar.users", href: "/settings/users", icon: UserCog },
    { key: "sidebar.settings", href: "/settings", icon: Settings },
  ];

  const tableMaintenanceItems = [
    { key: "sidebar.socialSecurity", href: "/table-maintenance/social-security", icon: Shield },
    { key: "sidebar.incomeTax", href: "/table-maintenance/income-tax", icon: Percent },
    { key: "sidebar.thirteenthMonth", href: "/table-maintenance/thirteenth-month", icon: Calendar },
    { key: "sidebar.additionalParams", href: "/table-maintenance/additional-params", icon: Sliders },
    { key: "sidebar.overtimeRules", href: "/table-maintenance/overtime", icon: Clock },
    { key: "sidebar.holidays", href: "/table-maintenance/holidays", icon: Sun },
    { key: "sidebar.bankAccounts", href: "/table-maintenance/banks", icon: Building2 },
  ];

  const isTableMaintenanceActive = pathname.startsWith("/table-maintenance");

  const activeCustomers = allCustomers.filter(c => c.status === 'activo');

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerId = parseInt(e.target.value);
    const customer = allCustomers.find(c => c.id === customerId) || null;
    setCurrentCustomer(customer);
    window.dispatchEvent(new CustomEvent('customerChanged', { detail: customer }));
  };

  return (
    <div className="sidebar flex flex-col h-full max-h-screen border-r border-outline-variant/20 overflow-hidden">
      <div className="p-6 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-white shadow-lg">
          <CircleDollarSign size={24} />
        </div>
        <span className="text-xl font-bold text-white">GPM Payroll</span>
      </div>

      {!sessionUser ? (
        <div className="flex-1 px-4 py-4 space-y-2">
          <Link
            href="/login"
            className="sidebar-nav-item flex items-center space-x-3 px-4 py-3 rounded-lg"
          >
            <LogIn size={20} />
            <span className="font-medium">{t(locale, "sidebar.signIn")}</span>
          </Link>
        </div>
      ) : (
        <>
          {isAdmin && activeCustomers.length > 0 && (
            <div className="px-4 mb-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 size={14} className="text-gray-400" />
                </div>
                <select
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-primary-container/50 border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-secondary text-white/90 appearance-none cursor-pointer hover:bg-primary-container/70 transition-colors"
                  value={currentCustomer?.id || ""}
                  onChange={handleCustomerChange}
                >
                  <option value="" className="bg-primary-container">{t(locale, "sidebar.selectCustomer")}</option>
                  {activeCustomers.map((customer) => (
                    <option key={customer.id} value={customer.id} className="bg-primary-container">
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between mt-1 px-1">
                <p className="text-xs text-gray-400">{t(locale, "sidebar.activeCustomer")}</p>
                <span className="text-xs text-secondary font-medium">{t(locale, "sidebar.adminView")}</span>
              </div>
            </div>
          )}

          <nav className="flex-1 min-h-0 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-nav-item flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? "active"
                      : ""
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{t(locale, item.key)}</span>
                </Link>
              );
            })}

            {/* Table Maintenance Collapsible - Admin only */}
            {isAdmin && (
              <div className="pt-3">
                <button
                  onClick={() => setIsTableMaintenanceOpen(!isTableMaintenanceOpen)}
                  className={`sidebar-nav-item w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                    isTableMaintenanceActive ? "active" : ""
                  }`}
                >
                  <Database size={20} />
                  <span className="font-medium flex-1 text-left">{t(locale, "sidebar.tableMaintenance")}</span>
                  {isTableMaintenanceOpen ? (
                    <ChevronDown size={16} className="opacity-60" />
                  ) : (
                    <ChevronRight size={16} className="opacity-60" />
                  )}
                </button>
                {(isTableMaintenanceOpen || isTableMaintenanceActive) && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-outline-variant/30 pl-3">
                    {tableMaintenanceItems.map((sub) => {
                      const isSubActive = pathname === sub.href;
                      const SubIcon = sub.icon;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={`sidebar-nav-item flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
                            isSubActive ? "active" : ""
                          }`}
                        >
                          <SubIcon size={16} />
                          <span>{t(locale, sub.key)}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>

          <div className="p-4 border-t border-outline-variant/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold">
                  {sessionUser.fullName?.split(' ').map(n => n[0]).join('').slice(0,2) || sessionUser.username.slice(0,2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{sessionUser.fullName || sessionUser.username}</p>
                  <p className="text-xs text-gray-400">{sessionUser.roleName}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="sidebar-nav-item p-2 rounded-lg"
                title={t(locale, "sidebar.signOut")}
              >
                <LogOut size={18} />
              </button>
            </div>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="mt-4 w-full px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest border border-outline-variant/20 rounded hover:bg-white/5 transition-all"
            >
              {t(locale, "sidebar.forceDbSync")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
