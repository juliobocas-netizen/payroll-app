"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Hotel,
  Building2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useCustomer, Customer } from "@/components/Sidebar";
import { useRouter } from "next/navigation";
import { t } from "@/lib/translations";

export default function SelectCustomerPage() {
  const router = useRouter();
  const { allCustomers, setCurrentCustomer, sessionUser } = useCustomer();
  const locale = sessionUser?.languagePref || "es";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    if (!sessionUser) {
      router.push("/login");
    }
  }, [sessionUser, router]);

  const filteredCustomers = allCustomers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.ruc && c.ruc.includes(searchQuery))
  );

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleContinue = () => {
    if (selectedCustomer) {
      setCurrentCustomer(selectedCustomer);
      router.push("/");
    }
  };

  if (!sessionUser) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-display-lg text-display-lg text-on-surface mb-4">
            {t(locale, "selectCustomer.title")}
          </h1>
          <p className="font-body-base text-on-surface-variant max-w-xl mx-auto">
            {t(locale, "selectCustomer.subtitle")}
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative group max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-secondary transition-colors" size={20} />
            <input
              className="w-full pl-12 pr-4 py-4 bg-white border border-outline rounded-lg font-body-base focus:ring-2 focus:ring-secondary focus:border-secondary transition-all outline-none shadow-sm"
              placeholder={t(locale, "selectCustomer.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              type="text"
            />
          </div>
        </div>

        {/* Customer Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              onClick={() => handleSelectCustomer(customer)}
              className={`bg-white border rounded-xl p-6 hover:border-secondary hover:shadow-md transition-all group cursor-pointer ${
                selectedCustomer?.id === customer.id
                  ? 'border-secondary ring-2 ring-secondary/20'
                  : 'border-outline'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center">
                  {customer.name.toLowerCase().includes('hotel') ? (
                    <Hotel size={24} className="text-secondary" />
                  ) : (
                    <Building2 size={24} className="text-secondary" />
                  )}
                </div>
                <span className="font-label-bold px-2 py-1 bg-surface-container-low text-secondary rounded text-xs">
                   {`TEN-${customer.id.toString().padStart(4, '0')}-BT`}
                </span>
              </div>
              <h3 className="font-title-sm text-title-sm text-on-surface mb-2">{customer.name}</h3>
              <p className="font-body-sm text-on-surface-variant mb-1">RUC: {customer.ruc || "N/A"}</p>
              <div className="flex items-center justify-between mt-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  customer.status === 'activo'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {customer.status === 'activo' ? t(locale, "common.active") : t(locale, "common.inactive")}
                </span>
                {selectedCustomer?.id === customer.id && (
                  <CheckCircle2 size={20} className="text-secondary" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Continue Button */}
        <div className="flex justify-center">
<button
              onClick={handleContinue}
              disabled={!selectedCustomer}
              className="flex items-center gap-2 px-8 py-3 bg-secondary text-white rounded-lg font-medium hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t(locale, "selectCustomer.continue")}
              <ArrowRight size={18} />
            </button>
        </div>
      </div>
    </div>
  );
}
