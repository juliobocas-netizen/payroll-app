"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Search,
  Plus,
  MoreVertical,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  Globe,
  PlusCircle,
  ChevronRight,
  Filter,
  DollarSign,
} from "lucide-react";
import { useCustomer } from "@/components/Sidebar";
import { getAllCustomersAction, createCustomerAction, updateCustomerAction } from "@/lib/server-actions";
import { t } from "@/lib/translations";

interface CustomerRecord {
  id: number;
  name: string;
  ruc: string | null;
  address: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  servicioFee: number;
  status: string; // active/inactive
  createdAt: string;
}

export default function CustomersPage() {
  const { setAllCustomers, sessionUser } = useCustomer();
  const locale = sessionUser?.languagePref || "es";
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    ruc: "",
    address: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    servicioFee: 0,
    status: "activo",
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setIsLoading(true);
    const res = await getAllCustomersAction();
    if (res.success && res.customers) {
      setCustomers(res.customers as any);
      setAllCustomers(res.customers as any);
    }
    setIsLoading(false);
  }

  async function handleSave() {
    setIsLoading(true);
    const formDataObj = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      formDataObj.append(key, value.toString());
    });

    let res;
    if (editingCustomer) {
      res = await updateCustomerAction(editingCustomer.id, formDataObj);
    } else {
      res = await createCustomerAction(formDataObj);
    }

    if (res.success) {
      await loadCustomers();
      setIsModalOpen(false);
      setEditingCustomer(null);
      setFormData({
        name: "",
        ruc: "",
        address: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        servicioFee: 0,
        status: "activo",
      });
    } else {
      alert(res.error || "Failed to save customer");
    }
    setIsLoading(false);
  }

  function handleEdit(customer: CustomerRecord) {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      ruc: customer.ruc || "",
      address: customer.address || "",
      contactName: customer.contactName || "",
      contactEmail: customer.contactEmail || "",
      contactPhone: customer.contactPhone || "",
      servicioFee: customer.servicioFee,
      status: customer.status,
    });
    setIsModalOpen(true);
  }

  async function toggleStatus(id: number) {
    const customer = customers.find(c => c.id === id);
    if (!customer) return;

    const newStatus = customer.status === "activo" ? "inactivo" : "activo";
    const formDataObj = new FormData();
    formDataObj.append("status", newStatus);
    
    // Fill other required fields from existing customer to satisfy update validation
    formDataObj.append("name", customer.name);

    const res = await updateCustomerAction(id, formDataObj);
    if (res.success) {
      await loadCustomers();
    }
  }

  const filtered = customers.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.ruc && c.ruc.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.contactName && c.contactName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = filterStatus === "all" || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="ml-0 p-8 max-w-[1440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="font-display-lg text-display-lg text-on-surface">{t(locale, "customers.title")}</h3>
          <p className="font-body-base text-body-base text-on-surface-variant mt-1">
            {t(locale, "customers.subtitle")}
          </p>
        </div>
        <button 
          onClick={() => {
            setEditingCustomer(null);
            setFormData({
              name: "",
              ruc: "",
              address: "",
              contactName: "",
              contactEmail: "",
              contactPhone: "",
              servicioFee: 0,
              status: "activo",
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg text-white font-medium hover:bg-blue-700 transition-all shadow-sm"
        >
          <PlusCircle size={16} />
          <span className="text-sm">{t(locale, "customers.new")}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-outline shadow-sm">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t(locale, "customers.totalCustomers")}</p>
          <p className="text-3xl font-bold text-on-surface">{customers.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-outline shadow-sm">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t(locale, "customers.activeTenants")}</p>
          <p className="text-3xl font-bold text-emerald-600">{customers.filter(c => c.status === 'activo').length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-outline shadow-sm">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{t(locale, "customers.monthlyFees")}</p>
          <p className="text-3xl font-bold text-secondary">
            ${customers.reduce((acc, c) => acc + c.servicioFee, 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-outline flex flex-wrap gap-4 items-center mb-8 shadow-sm">
        <div className="relative max-w-md w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder={t(locale, "customers.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border-outline rounded focus:ring-secondary focus:border-secondary bg-white"
        >
          <option value="all">{t(locale, "customers.statusAll")}</option>
          <option value="activo">{t(locale, "common.active")}</option>
          <option value="inactivo">{t(locale, "common.inactive")}</option>
        </select>
        <button className="flex items-center gap-2 px-3 py-2 border border-outline rounded text-sm text-on-surface hover:bg-surface-container-low transition-all ml-auto">
          <Filter size={16} />
          {t(locale, "customers.filters")}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-outline rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low border-b border-outline text-on-surface-variant font-label-bold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">{t(locale, "customers.customerName")}</th>
              <th className="px-6 py-4">{t(locale, "customers.ruc")}</th>
              <th className="px-6 py-4">{t(locale, "customers.contactPerson")}</th>
              <th className="px-6 py-4">{t(locale, "customers.serviceFee")}</th>
              <th className="px-6 py-4">{t(locale, "common.status")}</th>
              <th className="px-6 py-4 text-right">{t(locale, "common.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {isLoading ? (
              <tr><td colSpan={6} className="p-8 text-center text-on-surface-variant">{t(locale, "customers.loading")}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-on-surface-variant">{t(locale, "customers.noResults")}</td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-secondary border border-blue-100">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-on-surface">{c.name}</p>
                        <p className="text-xs text-on-surface-variant">{c.address?.slice(0, 30)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-on-surface-variant">{c.ruc}</td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-on-surface">{c.contactName}</p>
                      <p className="text-xs text-on-surface-variant flex items-center gap-1">
                        <Mail size={12} /> {c.contactEmail}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-on-surface">
                    ${c.servicioFee.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => toggleStatus(c.id)}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                        c.status === 'activo' 
                        ? "bg-emerald-50 text-emerald-700" 
                        : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {c.status === 'activo' ? <CheckCircle2 size={14} className="mr-1" /> : <XCircle size={14} className="mr-1" />}
                      {c.status === 'activo' ? t(locale, "common.active") : t(locale, "common.inactive")}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleEdit(c)}
                      className="p-1.5 text-on-surface-variant hover:text-secondary opacity-0 group-hover:opacity-100 transition-all"
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-outline flex justify-between items-center bg-surface-container-low">
              <h4 className="font-bold text-on-surface">
                {editingCustomer ? t(locale, "customers.editModalTitle") : t(locale, "customers.newModalTitle")}
              </h4>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "customers.companyName")}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
                    placeholder={t(locale, "customers.legalNamePlaceholder")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "customers.rucLabel")}</label>
                  <input
                    type="text"
                    value={formData.ruc}
                    onChange={(e) => setFormData({ ...formData, ruc: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
                    placeholder={t(locale, "customers.rucPlaceholder")}
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "customers.address")}</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
                  placeholder={t(locale, "customers.addressPlaceholder")}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "customers.contactName")}</label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
                    placeholder={t(locale, "customers.contactNamePlaceholder")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "customers.contactEmail")}</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
                    placeholder={t(locale, "customers.contactEmailPlaceholder")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "customers.contactPhone")}</label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
                    placeholder={t(locale, "customers.contactPhonePlaceholder")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "customers.serviceFeeLabel")}</label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      type="number"
                      value={formData.servicioFee}
                      onChange={(e) => setFormData({ ...formData, servicioFee: Number(e.target.value) })}
                      className="w-full pl-9 pr-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{t(locale, "customers.accountStatus")}</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none bg-white"
                  >
                    <option value="activo">{t(locale, "common.active")}</option>
                    <option value="inactivo">{t(locale, "common.inactive")}</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-all"
              >
                {t(locale, "common.cancel")}
              </button>
              <button 
                onClick={handleSave}
                className="px-8 py-2 bg-secondary text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-sm"
              >
                {editingCustomer ? t(locale, "customers.update") : t(locale, "customers.register")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
