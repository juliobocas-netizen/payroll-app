"use client";

import { useState } from "react";
import {
  User,
  Bell,
  Shield,
  Monitor,
  Key,
  Camera,
  ChevronRight,
  X,
} from "lucide-react";
import { useCustomer } from "@/components/Sidebar";
import { updateUserPreferencesAction, changePasswordAction } from "@/lib/server-actions";
import { t } from "@/lib/translations";

export default function SettingsPage() {
  const { sessionUser, setSessionUser, currentCustomer } = useCustomer();
  const locale = sessionUser?.languagePref || "es";
  const [activeTab, setActiveTab] = useState("profile");
  const [language, setLanguage] = useState(locale);
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [currencyDisplay, setCurrencyDisplay] = useState("USD");
  const [savedMsg, setSavedMsg] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    payroll: true,
    audit: false,
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", newPwd: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  const [security, setSecurity] = useState({
    twoFactor: false,
    sessionTimeout: "30",
    ipRestriction: false,
  });

  const tabs = [
    { id: "profile", label: t(locale, "settings.profile"), icon: User },
    { id: "notifications", label: t(locale, "settings.notifications"), icon: Bell },
    { id: "security", label: t(locale, "settings.security"), icon: Shield },
    { id: "preferences", label: t(locale, "settings.preferences"), icon: Monitor },
  ];

  const handleSavePreferences = async () => {
    if (!sessionUser) return;
    const res = await updateUserPreferencesAction(sessionUser.userId, {
      languagePref: language,
      dateFormat: dateFormat,
      currencyDisplay: currencyDisplay,
    });
    if (res.success) {
      const updated = {
        ...sessionUser,
        languagePref: language,
        dateFormat,
        currencyDisplay,
      };
      setSessionUser(updated);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
    }
  };

  if (!sessionUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-on-surface-variant">{t(locale, "common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="ml-0 p-8 max-w-[1440px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="font-display-lg text-display-lg text-on-surface">{t(locale, "settings.title")}</h2>
        <p className="font-body-base text-on-surface-variant mt-1">
          {t(locale, "settings.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 md:col-span-3">
          <div className="bg-white border border-outline rounded-xl overflow-hidden">
            <div className="p-6 border-b border-outline">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-white font-bold">
                  {sessionUser.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2) || sessionUser.username.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-on-surface">{sessionUser.fullName || sessionUser.username}</p>
                  <p className="text-xs text-on-surface-variant">{sessionUser.roleName}</p>
                </div>
              </div>
            </div>
            <nav className="p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-secondary/10 text-secondary font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  <tab.icon size={18} />
                  <span className="font-body-sm">{tab.label}</span>
                  <ChevronRight size={16} className="ml-auto opacity-50" />
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="col-span-12 md:col-span-9">
          {activeTab === "profile" && (
            <div className="bg-white border border-outline rounded-xl p-6">
              <h3 className="font-title-sm text-title-sm text-on-surface mb-6">{t(locale, "settings.profileInfo")}</h3>
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-white text-2xl font-bold">
                    {sessionUser.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2) || sessionUser.username.slice(0, 2).toUpperCase()}
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 border border-outline rounded-lg text-sm hover:bg-surface-container transition-all">
                    <Camera size={16} />
                    {t(locale, "settings.changePhoto")}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-on-surface">{t(locale, "settings.fullName")}</label>
                    <input
                      type="text"
                      value={sessionUser.fullName || ""}
                      readOnly
                      className="w-full p-3 rounded-lg border border-outline bg-white focus:ring-2 focus:ring-secondary outline-none font-body-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-on-surface">{t(locale, "settings.email")}</label>
                    <input
                      type="email"
                      value={sessionUser.email}
                      readOnly
                      className="w-full p-3 rounded-lg border border-outline bg-white focus:ring-2 focus:ring-secondary outline-none font-body-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-on-surface">{t(locale, "settings.username")}</label>
                    <input
                      type="text"
                      value={sessionUser.username}
                      disabled
                      readOnly
                      className="w-full p-3 rounded-lg border border-outline bg-surface-container-low font-body-base text-on-surface-variant"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-on-surface">{t(locale, "settings.role")}</label>
                    <input
                      type="text"
                      value={sessionUser.roleName}
                      disabled
                      readOnly
                      className="w-full p-3 rounded-lg border border-outline bg-surface-container-low font-body-base text-on-surface-variant"
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-outline">
                  <button className="px-6 py-2 bg-secondary text-white rounded-lg font-medium hover:bg-blue-700 transition-all">
                    {t(locale, "settings.saveChanges")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="bg-white border border-outline rounded-xl p-6">
              <h3 className="font-title-sm text-title-sm text-on-surface mb-6">{t(locale, "settings.notificationPrefs")}</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-outline">
                  <div>
                    <p className="font-medium text-on-surface">{t(locale, "settings.emailNotifications")}</p>
                    <p className="text-sm text-on-surface-variant">{t(locale, "settings.emailDesc")}</p>
                  </div>
                  <button
                    onClick={() => setNotifications({ ...notifications, email: !notifications.email })}
                    className={`w-12 h-6 rounded-full transition-all relative ${
                      notifications.email ? 'bg-secondary' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${
                      notifications.email ? 'left-6.5' : 'left-0.5'
                    }`} />
                  </button>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-outline">
                  <div>
                    <p className="font-medium text-on-surface">{t(locale, "settings.pushNotifications")}</p>
                    <p className="text-sm text-on-surface-variant">{t(locale, "settings.pushDesc")}</p>
                  </div>
                  <button
                    onClick={() => setNotifications({ ...notifications, push: !notifications.push })}
                    className={`w-12 h-6 rounded-full transition-all relative ${
                      notifications.push ? 'bg-secondary' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${
                      notifications.push ? 'left-6.5' : 'left-0.5'
                    }`} />
                  </button>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-outline">
                  <div>
                    <p className="font-medium text-on-surface">{t(locale, "settings.payrollAlerts")}</p>
                    <p className="text-sm text-on-surface-variant">{t(locale, "settings.payrollAlertsDesc")}</p>
                  </div>
                  <button
                    onClick={() => setNotifications({ ...notifications, payroll: !notifications.payroll })}
                    className={`w-12 h-6 rounded-full transition-all relative ${
                      notifications.payroll ? 'bg-secondary' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${
                      notifications.payroll ? 'left-6.5' : 'left-0.5'
                    }`} />
                  </button>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-on-surface">{t(locale, "settings.auditLogAlerts")}</p>
                    <p className="text-sm text-on-surface-variant">{t(locale, "settings.auditLogAlertsDesc")}</p>
                  </div>
                  <button
                    onClick={() => setNotifications({ ...notifications, audit: !notifications.audit })}
                    className={`w-12 h-6 rounded-full transition-all relative ${
                      notifications.audit ? 'bg-secondary' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${
                      notifications.audit ? 'left-6.5' : 'left-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="bg-white border border-outline rounded-xl p-6">
              <h3 className="font-title-sm text-title-sm text-on-surface mb-6">{t(locale, "settings.securitySettings")}</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between py-3 border-b border-outline">
                  <div>
                    <p className="font-medium text-on-surface">{t(locale, "settings.twoFactor")}</p>
                    <p className="text-sm text-on-surface-variant">{t(locale, "settings.twoFactorDesc")}</p>
                  </div>
                  <button
                    onClick={() => setSecurity({ ...security, twoFactor: !security.twoFactor })}
                    className={`w-12 h-6 rounded-full transition-all relative ${
                      security.twoFactor ? 'bg-secondary' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${
                      security.twoFactor ? 'left-6.5' : 'left-0.5'
                    }`} />
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">{t(locale, "settings.sessionTimeout")}</label>
                  <select
                    value={security.sessionTimeout}
                    onChange={(e) => setSecurity({ ...security, sessionTimeout: e.target.value })}
                    className="w-full p-3 rounded-lg border border-outline bg-white focus:ring-2 focus:ring-secondary outline-none font-body-base"
                  >
                    <option value="15">15 {t(locale, "common.all") === "All" ? "minutes" : "minutos"}</option>
                    <option value="30">30 {t(locale, "common.all") === "All" ? "minutes" : "minutos"}</option>
                    <option value="60">1 {t(locale, "common.all") === "All" ? "hour" : "hora"}</option>
                    <option value="120">2 {t(locale, "common.all") === "All" ? "hours" : "horas"}</option>
                  </select>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-on-surface">{t(locale, "settings.ipRestriction")}</p>
                    <p className="text-sm text-on-surface-variant">{t(locale, "settings.ipRestrictionDesc")}</p>
                  </div>
                  <button
                    onClick={() => setSecurity({ ...security, ipRestriction: !security.ipRestriction })}
                    className={`w-12 h-6 rounded-full transition-all relative ${
                      security.ipRestriction ? 'bg-secondary' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${
                      security.ipRestriction ? 'left-6.5' : 'left-0.5'
                    }`} />
                  </button>
                </div>
                <div className="pt-4 border-t border-outline">
                  <button
                    onClick={() => { setShowPasswordModal(true); setPasswordError(""); setPasswordSuccess(false); setPasswordForm({ current: "", newPwd: "", confirm: "" }); }}
                    className="flex items-center gap-2 px-6 py-2 bg-secondary text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
                  >
                    <Key size={16} />
                    {t(locale, "settings.changePassword")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showPasswordModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-outline flex justify-between items-center bg-surface-container-low">
                  <h4 className="font-bold text-on-surface">{t(locale, "settings.changePassword")}</h4>
                  <button onClick={() => setShowPasswordModal(false)} className="text-on-surface-variant hover:text-on-surface">
                    <X size={24} />
                  </button>
                </div>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setPasswordError("");
                  setPasswordSuccess(false);
                  if (passwordForm.newPwd !== passwordForm.confirm) {
                    setPasswordError(t(locale, "settings.passwordsDontMatch") || "Passwords do not match");
                    return;
                  }
                  if (passwordForm.newPwd.length < 6) {
                    setPasswordError(t(locale, "settings.passwordTooShort") || "Password must be at least 6 characters");
                    return;
                  }
                  setChangingPwd(true);
                  const res = await changePasswordAction(sessionUser.userId, passwordForm.current, passwordForm.newPwd);
                  setChangingPwd(false);
                  if (res.success) {
                    setPasswordSuccess(true);
                    setPasswordForm({ current: "", newPwd: "", confirm: "" });
                    setTimeout(() => setShowPasswordModal(false), 1500);
                  } else {
                    setPasswordError(res.error || "Failed to change password");
                  }
                }}>
                  <div className="p-6 space-y-4">
                    {passwordError && (
                      <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{passwordError}</p>
                    )}
                    {passwordSuccess && (
                      <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{t(locale, "settings.passwordChanged") || "Password changed successfully!"}</p>
                    )}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "settings.currentPassword") || "Current Password"}</label>
                      <input
                        type="password"
                        required
                        value={passwordForm.current}
                        onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                        className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "settings.newPassword") || "New Password"}</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={passwordForm.newPwd}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPwd: e.target.value })}
                        className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-on-surface-variant uppercase">{t(locale, "settings.confirmPassword") || "Confirm New Password"}</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={passwordForm.confirm}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                        className="w-full px-4 py-3 border border-outline rounded-lg text-sm focus:ring-2 focus:ring-secondary outline-none"
                      />
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-surface-container-low border-t border-outline flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(false)}
                      className="px-6 py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-all"
                    >
                      {t(locale, "common.cancel")}
                    </button>
                    <button
                      type="submit"
                      disabled={changingPwd}
                      className="px-8 py-2 bg-secondary text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
                    >
                      {changingPwd ? (t(locale, "common.saving") || "Saving...") : (t(locale, "settings.saveChanges") || "Save Changes")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="bg-white border border-outline rounded-xl p-6">
              <h3 className="font-title-sm text-title-sm text-on-surface mb-6">{t(locale, "settings.preferences")}</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">{t(locale, "settings.language")}</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full p-3 rounded-lg border border-outline bg-white focus:ring-2 focus:ring-secondary outline-none font-body-base"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">{t(locale, "settings.dateFormat")}</label>
                  <select
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                    className="w-full p-3 rounded-lg border border-outline bg-white focus:ring-2 focus:ring-secondary outline-none font-body-base"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">{t(locale, "settings.currencyDisplay")}</label>
                  <select
                    value={currencyDisplay}
                    onChange={(e) => setCurrencyDisplay(e.target.value)}
                    className="w-full p-3 rounded-lg border border-outline bg-white focus:ring-2 focus:ring-secondary outline-none font-body-base"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="PAB">PAB (B/.)</option>
                  </select>
                </div>
                <div className="pt-4 border-t border-outline">
                  {savedMsg && (
                    <p className="text-green-600 text-sm mb-2">{t(locale, "settings.preferencesSaved")}</p>
                  )}
                  <button
                    onClick={handleSavePreferences}
                    className="px-6 py-2 bg-secondary text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
                  >
                    {t(locale, "settings.savePreferences")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
