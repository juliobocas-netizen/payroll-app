"use client";

import Link from "next/link";
import {
  Shield,
  Percent,
  Calendar,
  Sliders,
  Clock,
  Sun,
  Building2,
  ChevronRight,
} from "lucide-react";
import { useCustomer } from "@/components/Sidebar";
import { t } from "@/lib/translations";

export default function TableMaintenancePage() {
  const { sessionUser } = useCustomer();
  const locale = sessionUser?.languagePref || "es";

  if (!sessionUser) return null;

  const sections = [
    {
      title: t(locale, "tables.socialSecurityTitle"),
      description: t(locale, "tables.socialSecurityDesc"),
      href: "/table-maintenance/social-security",
      icon: Shield,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      title: t(locale, "tables.incomeTaxTitle"),
      description: t(locale, "tables.incomeTaxDesc"),
      href: "/table-maintenance/income-tax",
      icon: Percent,
      color: "text-blue-600 bg-blue-50",
    },
    {
      title: t(locale, "tables.thirteenthMonthTitle"),
      description: t(locale, "tables.thirteenthMonthDesc"),
      href: "/table-maintenance/thirteenth-month",
      icon: Calendar,
      color: "text-purple-600 bg-purple-50",
    },
    {
      title: t(locale, "tables.additionalParamsTitle"),
      description: t(locale, "tables.additionalParamsDesc"),
      href: "/table-maintenance/additional-params",
      icon: Sliders,
      color: "text-orange-600 bg-orange-50",
    },
    {
      title: t(locale, "tables.overtimeTitle"),
      description: t(locale, "tables.overtimeDesc"),
      href: "/table-maintenance/overtime",
      icon: Clock,
      color: "text-cyan-600 bg-cyan-50",
    },
    {
      title: t(locale, "tables.holidaysTitle"),
      description: t(locale, "tables.holidaysDesc"),
      href: "/table-maintenance/holidays",
      icon: Sun,
      color: "text-rose-600 bg-rose-50",
    },
    {
      title: t(locale, "tables.banksTitle"),
      description: t(locale, "tables.banksDesc"),
      href: "/table-maintenance/banks",
      icon: Building2,
      color: "text-indigo-600 bg-indigo-50",
    },
  ];

  return (
    <div className="ml-0 p-8 max-w-[1440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h3 className="font-display-lg text-display-lg text-on-surface">{t(locale, "tables.title")}</h3>
        <p className="font-body-base text-body-base text-on-surface-variant mt-1">
          {t(locale, "tables.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group bg-white p-6 rounded-xl border border-outline shadow-sm hover:shadow-md hover:border-secondary/30 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg ${section.color} flex items-center justify-center`}>
                  <Icon size={24} />
                </div>
                <ChevronRight size={20} className="text-on-surface-variant opacity-0 group-hover:opacity-100 transition-all -mr-1" />
              </div>
              <h4 className="font-title-sm text-title-sm text-on-surface mb-2">{section.title}</h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                {section.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
