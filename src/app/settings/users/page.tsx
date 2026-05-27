"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Plus,
  MoreVertical,
  Edit3,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Filter,
  CheckCircle2,
  XCircle,
  Mail,
  User,
  Building2,
  ChevronRight,
} from "lucide-react";
import { useCustomer } from "@/components/Sidebar";
import { t } from "@/lib/translations";

interface UserRecord {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  roleId: number;
  roleName: string;
  roleLevel: number;
  customerId: number | null;
  isActive: boolean;
  createdAt: string;
}

interface Role {
  id: number;
  name: string;
  level: number;
  description: string;
}

export default function UsersPage() {
  const { allCustomers, sessionUser, currentCustomer } = useCustomer();
  const locale = sessionUser?.languagePref || "es";
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<Role[]>([
    { id: 1, name: "SuperAdmin", level: 5, description: "System-wide administrative access" },
    { id: 2, name: "Admin", level: 4, description: "Customer-level administrative access" },
    { id: 3, name: "Approver", level: 4, description: "Payroll approval authorization" },
    { id: 4, name: "Processor", level: 3, description: "Payroll calculation and management" },
    { id: 5, name: "Data Entry", level: 2, description: "Employee data and time entry" },
    { id: 6, name: "External", level: 1, description: "Restricted read-only access" },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    fullName: "",
    roleId: 5,
    customerId: null as number | null,
    isActive: true,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  function loadUsers() {
    setIsLoading(true);
    try {
      const storedUsers = localStorage.getItem("gpm_users");
      if (storedUsers) {
        setUsers(JSON.parse(storedUsers));
      } else {
        // Initial mock data if none exists
        const initialUsers: UserRecord[] = [
          {
            id: 1,
            username: "admin",
            email: "admin@gpm.com",
            fullName: "System Administrator",
            roleId: 1,
            roleName: "SuperAdmin",
            roleLevel: 5,
            customerId: null,
            isActive: true,
            createdAt: new Date().toISOString(),
          },
          {
            id: 2,
            username: "jdoe",
            email: "j.doe@company.com",
            fullName: "John Doe",
            roleId: 4,
            roleName: "Processor",
            roleLevel: 3,
            customerId: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
          },
        ];
        setUsers(initialUsers);
        localStorage.setItem("gpm_users", JSON.stringify(initialUsers));
      }
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSaveUser() {
    const role = roles.find(r => r.id === Number(formData.roleId));
    
    if (editingUser) {
      const updatedUsers = users.map(u => 
        u.id === editingUser.id 
          ? { 
              ...u, 
              ...formData, 
              roleId: Number(formData.roleId),
              roleName: role?.name || "User",
              roleLevel: role?.level || 1 
            } 
          : u
      );
      setUsers(updatedUsers);
      localStorage.setItem("gpm_users", JSON.stringify(updatedUsers));
    } else {
      const newUser: UserRecord = {
        id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
        ...formData,
        roleId: Number(formData.roleId),
        roleName: role?.name || "User",
        roleLevel: role?.level || 1,
        createdAt: new Date().toISOString(),
      };
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      localStorage.setItem("gpm_users", JSON.stringify(updatedUsers));
    }
    
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({
      username: "",
      email: "",
      fullName: "",
      roleId: 5,
      customerId: null,
      isActive: true,
    });
  }

  function handleEdit(user: UserRecord) {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      fullName: user.fullName || "",
      roleId: user.roleId,
      customerId: user.customerId,
      isActive: user.isActive,
    });
    setIsModalOpen(true);
  }

  function toggleStatus(userId: number) {
    const updatedUsers = users.map(u => 
      u.id === userId ? { ...u, isActive: !u.isActive } : u
    );
    setUsers(updatedUsers);
    localStorage.setItem("gpm_users", JSON.stringify(updatedUsers));
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.fullName && user.fullName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesRole = filterRole === "all" || user.roleName === filterRole;
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "Active" && user.isActive) || 
      (filterStatus === "Inactive" && !user.isActive);
    
    // Filter by current customer selection
    const matchesCustomer = !currentCustomer || user.customerId === currentCustomer.id || user.customerId === null;

    return matchesSearch && matchesRole && matchesStatus && matchesCustomer;
  });

  function getRoleIcon(level: number) {
    if (level >= 5) return <ShieldCheck size={18} className="text-secondary" />;
    if (level >= 4) return <Shield size={18} className="text-blue-500" />;
    return <ShieldAlert size={18} className="text-amber-500" />;
  }

  return (
    <div className="ml-0 p-8 max-w-[1440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h3 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">{t(locale, "users.title")}</h3>
          <p className="font-body-base text-on-surface-variant mt-1">
            {t(locale, "users.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-outline rounded-lg text-on-surface font-medium hover:bg-surface-container transition-all">
            <Shield size={16} className="text-secondary" />
            <span className="text-sm">{t(locale, "users.auditLog")}</span>
          </button>
          <button 
            onClick={() => {
              setEditingUser(null);
              setFormData({
                username: "",
                email: "",
                fullName: "",
                roleId: 5,
                customerId: currentCustomer?.id || null,
                isActive: true,
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg text-white font-medium hover:bg-blue-700 transition-all shadow-sm"
          >
            <UserPlus size={16} />
            <span className="text-sm">{t(locale, "users.register")}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-outline flex flex-wrap gap-4 items-center mb-8 shadow-sm">
        <div className="relative max-w-md w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder={t(locale, "users.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="text-sm border-outline rounded focus:ring-secondary focus:border-secondary bg-white"
        >
          <option value="all">{t(locale, "users.allRoles")}</option>
          {roles.map(r => (
            <option key={r.id} value={r.name}>{r.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border-outline rounded focus:ring-secondary focus:border-secondary bg-white"
        >
          <option value="all">{t(locale, "users.allStatus")}</option>
          <option value="Active">{t(locale, "common.active")}</option>
          <option value="Inactive">{t(locale, "common.inactive")}</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-outline rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low border-b border-outline">
            <tr>
              <th className="px-6 py-4 font-label-bold text-label-bold text-on-surface-variant uppercase">{t(locale, "users.columnUser")}</th>
              <th className="px-6 py-4 font-label-bold text-label-bold text-on-surface-variant uppercase">{t(locale, "users.columnRole")}</th>
              <th className="px-6 py-4 font-label-bold text-label-bold text-on-surface-variant uppercase">{t(locale, "users.columnCustomer")}</th>
              <th className="px-6 py-4 font-label-bold text-label-bold text-on-surface-variant uppercase">{t(locale, "common.status")}</th>
              <th className="px-6 py-4 font-label-bold text-label-bold text-on-surface-variant uppercase text-right">{t(locale, "common.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={5} className="p-8 text-center text-on-surface-variant">{t(locale, "users.loading")}</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-on-surface-variant">{t(locale, "users.noResults")}</td></tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs border border-outline">
                        <User size={18} />
                      </div>
                      <div>
                        <p className="font-medium text-on-surface">{user.fullName || user.username}</p>
                        <p className="text-xs text-on-surface-variant flex items-center gap-1">
                          <Mail size={12} /> {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(user.roleLevel)}
                      <div>
                        <p className="text-sm font-medium text-on-surface">{user.roleName}</p>
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tight">Level {user.roleLevel}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-on-surface">
                      <Building2 size={16} className="text-on-surface-variant" />
                      {user.customerId ? allCustomers.find(c => c.id === user.customerId)?.name || "Unknown Customer" : "Global Admin"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => toggleStatus(user.id)}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                        user.isActive 
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" 
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {user.isActive ? (
                        <><CheckCircle2 size={14} className="mr-1" /> {t(locale, "common.active")}</>
                      ) : (
                        <><XCircle size={14} className="mr-1" /> {t(locale, "common.inactive")}</>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleEdit(user)}
                      className="p-1.5 text-on-surface-variant hover:text-secondary transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button className="p-1.5 text-on-surface-variant hover:text-on-surface transition-all">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-outline flex justify-between items-center bg-surface-container-low">
              <h4 className="font-title-sm text-on-surface">
                {editingUser ? t(locale, "users.editModalTitle") : t(locale, "users.newModalTitle")}
              </h4>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "users.username")}</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
                    placeholder={t(locale, "users.usernamePlaceholder")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "users.fullName")}</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
                    placeholder={t(locale, "users.fullNamePlaceholder")}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "users.email")}</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
                  placeholder={t(locale, "users.emailPlaceholder")}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "users.systemRole")}</label>
                  <select
                    value={formData.roleId}
                    onChange={(e) => setFormData({ ...formData, roleId: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none bg-white"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name} (Level {r.level})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "users.customerAssignment")}</label>
                  <select
                    value={formData.customerId || ""}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none bg-white"
                  >
                    <option value="">{t(locale, "users.globalCustomer")}</option>
                    {allCustomers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-secondary focus:ring-secondary border-outline rounded"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-on-surface">{t(locale, "users.accountActive")}</label>
              </div>
            </div>
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-all"
              >
                {t(locale, "common.cancel")}
              </button>
              <button 
                onClick={handleSaveUser}
                className="px-6 py-2 bg-secondary text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-sm"
              >
                {editingUser ? t(locale, "users.update") : t(locale, "users.create")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
