"use server";
import { revalidatePath } from "next/cache";

import { authenticateUser, getPayrollRuns, getPayrollRunDetails, getPayrollRunWithData, getPayCalendars, getAllCustomers, getCustomerById, getPayrollInputs, getEmployees, getEmployeeHasTransactions, getPayrollRunsByCustomer, getAcknowledgedWarnings, getPayrollRunDetailsByDateRange, getDepartments, getIsrBrackets, getIsrSettings, getStatutoryDeductions, getAllStatutoryDeductions, getOvertimeRules, getAllOvertimeRules, getHolidays, getThirteenthMonthParameters, getPayrollParameters, getAllPayrollParameters, getBanks, getAllBanks } from "@/lib/db/queries";
import { createEmployee, updateEmployee, deleteEmployee, createCustomer, updateCustomer, createDepartment, createPosition, createBank, updateBank, deleteBank, createPayCalendar, updatePayCalendar, deletePayCalendar, createPayrollRun, createAuditLog, clearPayrollRunEarningsAndDeductions, updatePayrollRunStatus, deletePayrollRun, upsertPayrollInput, validatePayrollInputs, clearPayrollInputs, acknowledgeWarning, createStatutoryDeduction, updateStatutoryDeduction, deleteStatutoryDeduction, createIsrTaxBracket, updateIsrTaxBracket, deleteIsrTaxBracket, createIsrSetting, updateIsrSetting, deleteIsrSetting, createOvertimeRule, updateOvertimeRule, deleteOvertimeRule, createHoliday, updateHoliday, deleteHoliday, createThirteenthMonthParameter, updateThirteenthMonthParameter, deleteThirteenthMonthParameter, createPayrollParameter, updatePayrollParameter, deletePayrollParameter, updateUserPreferences, updatePassword } from "@/lib/db/mutations";
import { calculatePayroll } from "@/lib/payroll-calculator";
import { prisma } from "@/lib/prisma";

export async function loginAction(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Username and password are required" };
  }

  console.log(`Login attempt for user: ${username}`);
  const user = await authenticateUser(username, password);
  if (!user) {
    console.log(`Login failed for user: ${username}`);
    return { error: "Invalid username or password" };
  }

  console.log(`Login success for user: ${username}`);

  const sessionData = {
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    roleId: user.roleId,
    roleName: user.roleName,
    roleLevel: user.roleLevel,
    customerId: user.customerId,
    lastCustomerId: user.lastCustomerId,
    languagePref: user.languagePref,
    dateFormat: user.dateFormat,
    currencyDisplay: user.currencyDisplay,
  };

  return { success: true, user: sessionData };
}

export async function createEmployeeAction(formData: FormData) {
  const customerId = parseInt(formData.get("customerId") as string);
  const employeeCode = ((formData.get("employeeCode") as string) || "").toUpperCase();
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const identificationNumber = formData.get("identificationNumber") as string;

  if (!customerId || !employeeCode || !firstName || !lastName) {
    return { error: "Required fields missing" };
  }

  const baseSalary = parseFloat(formData.get("baseSalary") as string);
  const salaryType = (formData.get("salaryType") as string) || "";
  if (!Number.isFinite(baseSalary) || baseSalary < 0 || !["hourly", "monthly"].includes(salaryType)) {
    return { error: "A valid salary amount and salary type are required" };
  }

  try {
    const employee = await createEmployee({
      customerId,
      employeeCode,
      firstName,
      lastName,
      identificationNumber,
      idType: (formData.get("idType") as string) || "cedula",
      sssNumber: formData.get("sssNumber") as string || undefined,
      birthDate: formData.get("birthDate") ? new Date(formData.get("birthDate") as string) : undefined,
      departmentId: formData.get("departmentId") ? parseInt(formData.get("departmentId") as string) : undefined,
      positionId: formData.get("positionId") ? parseInt(formData.get("positionId") as string) : undefined,
      baseSalary,
      salaryFrequency: (formData.get("salaryFrequency") as string) || "monthly",
      salaryType,
      paymentMethod: (formData.get("paymentMethod") as string) || "cash",
      bankId: formData.get("bankId") ? parseInt(formData.get("bankId") as string) : undefined,
      accountNumber: formData.get("accountNumber") as string || undefined,
      accountType: formData.get("accountType") as string || undefined,
      isOvertimeEligible: formData.get("isOvertimeEligible") === "true",
      restDay: (formData.get("restDay") as string) || "domingo",
      hireDate: formData.get("hireDate") ? new Date(formData.get("hireDate") as string) : undefined,
    });

    await createAuditLog({
      tableName: "Employee",
      recordId: employee.id.toString(),
      action: "INSERT",
      newValue: JSON.stringify(employee),
      notes: `Employee created: ${employeeCode}`,
    });

    revalidatePath("/");
    return { success: true, employee };
  } catch (error) {
    return { error: "Failed to create employee" };
  }
}

export async function updateEmployeeAction(id: number, formData: FormData) {
  const baseSalary = parseFloat(formData.get("baseSalary") as string);
  const salaryType = (formData.get("salaryType") as string) || "";
  if (!Number.isFinite(baseSalary) || baseSalary < 0 || !["hourly", "monthly"].includes(salaryType)) {
    return { error: "A valid salary amount and salary type are required" };
  }

  try {
    const employee = await updateEmployee(id, {
      employeeCode: ((formData.get("employeeCode") as string) || "").toUpperCase(),
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      identificationNumber: formData.get("identificationNumber") as string,
      idType: (formData.get("idType") as string) || "cedula",
      sssNumber: formData.get("sssNumber") as string || undefined,
      birthDate: formData.get("birthDate") ? new Date(formData.get("birthDate") as string) : undefined,
      departmentId: formData.get("departmentId") ? parseInt(formData.get("departmentId") as string) : undefined,
      positionId: formData.get("positionId") ? parseInt(formData.get("positionId") as string) : undefined,
      baseSalary,
      salaryFrequency: (formData.get("salaryFrequency") as string) || "monthly",
      salaryType,
      paymentMethod: (formData.get("paymentMethod") as string) || "cash",
      bankId: formData.get("bankId") ? parseInt(formData.get("bankId") as string) : undefined,
      accountNumber: formData.get("accountNumber") as string || undefined,
      accountType: formData.get("accountType") as string || undefined,
      isOvertimeEligible: formData.get("isOvertimeEligible") === "true",
      restDay: (formData.get("restDay") as string) || "domingo",
      hireDate: formData.get("hireDate") ? new Date(formData.get("hireDate") as string) : undefined,
    });

    await createAuditLog({
      tableName: "Employee",
      recordId: id.toString(),
      action: "UPDATE",
      newValue: JSON.stringify(employee),
      notes: `Employee updated: ${employee.employeeCode}`,
    });

    return { success: true, employee };
  } catch (error) {
    return { error: "Failed to update employee" };
  }
}

export async function deleteEmployeeAction(id: number) {
  try {
    await deleteEmployee(id);
    await createAuditLog({
      tableName: "Employee",
      recordId: id.toString(),
      action: "DELETE",
      notes: `Employee deactivated: ${id}`,
    });
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete employee" };
  }
}

export async function checkEmployeeTransactionsAction(employeeId: number) {
  try {
    const hasTransactions = await getEmployeeHasTransactions(employeeId);
    return { success: true, hasTransactions };
  } catch {
    return { error: "Failed to check employee transactions" };
  }
}

export async function importStaffAction(customerId: number, employeesData: any[], userId?: number) {
  try {
    const summary = {
      totalProcessed: 0,
      newEmployees: 0,
      updatedEmployees: [] as { code: string; name: string }[],
      newDepartments: [] as string[],
      newPositions: [] as string[],
      errors: [] as { row: number; error: string }[]
    };

    const departments = await prisma.department.findMany({ where: { customerId } });
    const positions = await prisma.position.findMany({ where: { customerId } });
    
    const deptMap = new Map(departments.map(d => [d.name.toLowerCase(), d.id]));
    const posMap = new Map(positions.map(p => [p.title.toLowerCase(), p.id]));

    for (let i = 0; i < employeesData.length; i++) {
      const row = employeesData[i];
      summary.totalProcessed++;
      try {
        if (!row.employeeCode || !row.firstName || !row.lastName || row.baseSalary === undefined) {
          summary.errors.push({ row: i + 2, error: "Missing required fields (employeeCode, firstName, lastName, or baseSalary)" });
          continue;
        }

        let departmentId = null;
        if (row.department) {
          const deptName = String(row.department).trim();
          const deptKey = deptName.toLowerCase();
          if (deptMap.has(deptKey)) {
            departmentId = deptMap.get(deptKey);
          } else {
            const newDept = await prisma.department.create({
              data: { customerId, name: deptName }
            });
            deptMap.set(deptKey, newDept.id);
            departmentId = newDept.id;
            summary.newDepartments.push(deptName);
          }
        }

        let positionId = null;
        if (row.position) {
          const posName = String(row.position).trim();
          const posKey = posName.toLowerCase();
          if (posMap.has(posKey)) {
            positionId = posMap.get(posKey);
          } else {
            const newPos = await prisma.position.create({
              data: { customerId, title: posName }
            });
            posMap.set(posKey, newPos.id);
            positionId = newPos.id;
            summary.newPositions.push(posName);
          }
        }

        const employeeCode = String(row.employeeCode).trim().toUpperCase();
        let hireDate = undefined;
        if (row.hireDate) {
          hireDate = new Date(row.hireDate);
          if (isNaN(hireDate.getTime())) hireDate = undefined;
        }

        const dataObj = {
          firstName: String(row.firstName).trim(),
          lastName: String(row.lastName).trim(),
          identificationNumber: row.identificationNumber ? String(row.identificationNumber).trim() : null,
          sssNumber: row.sssNumber ? String(row.sssNumber).trim() : null,
          baseSalary: parseFloat(row.baseSalary) || 0,
          salaryFrequency: row.salaryFrequency ? String(row.salaryFrequency).toLowerCase() : "monthly",
          salaryType: row.salaryType ? String(row.salaryType).toLowerCase() : "monthly",
          paymentMethod: row.paymentMethod ? String(row.paymentMethod).toLowerCase() : "cash",
          departmentId,
          positionId,
          hireDate,
          isActive: row.isActive !== undefined ? (String(row.isActive).toLowerCase() === 'true' || row.isActive === true) : true
        };

        const existingEmp = await prisma.employee.findUnique({
          where: {
            customerId_employeeCode: { customerId, employeeCode }
          }
        });

        if (existingEmp) {
          await prisma.employee.update({
            where: { id: existingEmp.id },
            data: dataObj
          });
          summary.updatedEmployees.push({ code: employeeCode, name: `${dataObj.firstName} ${dataObj.lastName}` });
        } else {
          await prisma.employee.create({
            data: {
              customerId,
              employeeCode,
              ...dataObj
            }
          });
          summary.newEmployees++;
        }
      } catch (err: any) {
        summary.errors.push({ row: i + 2, error: err.message || "Failed to process row" });
      }
    }

    revalidatePath("/employees");
    return { success: true, summary };
  } catch (error: any) {
    console.error("Import staff error:", error);
    return { error: "Failed to import staff data" };
  }
}

export async function createCustomerAction(formData: FormData) {
  try {
    const customer = await createCustomer({
      name: formData.get("name") as string,
      ruc: ((formData.get("ruc") as string) || "").toUpperCase() || undefined,
      address: (formData.get("address") as string) || undefined,
      contactName: (formData.get("contactName") as string) || undefined,
      contactEmail: (formData.get("contactEmail") as string) || undefined,
      contactPhone: (formData.get("contactPhone") as string) || undefined,
      servicioFee: formData.get("servicioFee") ? parseFloat(formData.get("servicioFee") as string) : 0,
      status: (formData.get("status") as string) || "activo",
    });

    await createAuditLog({
      tableName: "Customer",
      recordId: customer.id.toString(),
      action: "INSERT",
      notes: `Customer created: ${customer.name}`,
    });

    revalidatePath("/");
    return { success: true, customer };
  } catch (error) {
    console.error("Create customer error:", error);
    return { error: "Failed to create customer" };
  }
}

export async function updateCustomerAction(id: number, formData: FormData) {
  try {
    const customer = await updateCustomer(id, {
      name: formData.get("name") as string,
      ruc: ((formData.get("ruc") as string) || "").toUpperCase() || undefined,
      address: (formData.get("address") as string) || undefined,
      contactName: (formData.get("contactName") as string) || undefined,
      contactEmail: (formData.get("contactEmail") as string) || undefined,
      contactPhone: (formData.get("contactPhone") as string) || undefined,
      servicioFee: formData.get("servicioFee") ? parseFloat(formData.get("servicioFee") as string) : 0,
      status: (formData.get("status") as string) || "activo",
    });

    await createAuditLog({
      tableName: "Customer",
      recordId: id.toString(),
      action: "UPDATE",
      notes: `Customer updated: ${customer.name}`,
    });

    revalidatePath("/");
    return { success: true, customer };
  } catch (error) {
    return { error: "Failed to update customer" };
  }
}

export async function createPayrollRunAction(customerId: number, calendarId: number, payFrom: Date, payTo: Date, paymentDate: Date) {
  try {
    const payrollRun = await createPayrollRun({
      customerId,
      calendarId,
      payFrom,
      payTo,
      paymentDate,
    });

    await createAuditLog({
      tableName: "PayrollRun",
      recordId: payrollRun.id.toString(),
      action: "INSERT",
      notes: `Payroll run created for customer ${customerId}`,
    });

    return { success: true, payrollRun };
  } catch (error) {
    return { error: "Failed to create payroll run" };
  }
}

export async function calculatePayrollAction(payrollRunId: number, userId?: number) {
  try {
    const results = await calculatePayroll(payrollRunId, userId);
    await updatePayrollRunStatus(payrollRunId, 'calculated', userId);
    revalidatePath(`/payroll-run?id=${payrollRunId}`);
    return { success: true, results };
  } catch (error) {
    console.error("Payroll calculation error:", error);
    return { error: "Failed to calculate payroll" };
  }
}

export async function approvePayrollAction(payrollRunId: number, userId?: number) {
  try {
    await updatePayrollRunStatus(payrollRunId, "closed", userId);
    await createAuditLog({
      tableName: "PayrollRun",
      recordId: payrollRunId.toString(),
      action: "APPROVE",
      changedBy: userId,
      notes: `Payroll run ${payrollRunId} approved and closed`,
    });
    return { success: true };
  } catch (error) {
    return { error: "Failed to approve payroll" };
  }
}

export async function undoApprovalAction(payrollRunId: number, userId?: number) {
  try {
    // Get current payroll run to determine previous status
    const payrollRun = await getPayrollRunDetails(payrollRunId);
    if (!payrollRun) {
      return { error: "Payroll run not found" };
    }

    // Revert to calculated status (assuming that's the previous state)
    await updatePayrollRunStatus(payrollRunId, "calculated", userId);
    
    // Clear approval metadata
    await prisma.payrollRun.update({
      where: { id: payrollRunId },
      data: {
        approvedBy: null,
        approvedAt: null,
        closedBy: null,
        closedAt: null,
      },
    });

    await createAuditLog({
      tableName: "PayrollRun",
      recordId: payrollRunId.toString(),
      action: "UNDO_APPROVAL",
      changedBy: userId,
      notes: `Payroll run ${payrollRunId} approval undone`,
    });
    return { success: true };
  } catch (error) {
    return { error: "Failed to undo approval" };
  }
}

export async function closePayrollAction(payrollRunId: number, userId?: number) {
  try {
    await updatePayrollRunStatus(payrollRunId, "closed", userId);
    await createAuditLog({
      tableName: "PayrollRun",
      recordId: payrollRunId.toString(),
      action: "CLOSE",
      changedBy: userId,
      notes: `Payroll run ${payrollRunId} closed`,
    });
    return { success: true };
  } catch (error) {
    return { error: "Failed to close payroll" };
  }
}

export async function getPayrollRunsAction(customerId: number) {
  try {
    const runs = await getPayrollRuns(customerId);
    return { success: true, runs };
  } catch (error) {
    return { error: "Failed to fetch payroll runs" };
  }
}

export async function getPayrollRunDetailsAction(payrollRunId: number) {
  try {
    const payrollRun = await getPayrollRunWithData(payrollRunId);
    if (!payrollRun) {
      return { error: "Payroll run not found" };
    }
    return { success: true, payrollRun };
  } catch (error) {
    console.error("Failed to get payroll run details:", error);
    return { error: "Failed to load payroll run details" };
  }
}

export async function getPayCalendarsAction(customerId: number) {
  try {
    const calendars = await getPayCalendars(customerId);
    return { success: true, calendars };
  } catch (error) {
    return { error: "Failed to fetch pay calendars" };
  }
}

export async function createPayCalendarAction(formData: FormData) {
  try {
    const customerIdStr = formData.get("customerId");
    if (!customerIdStr) return { error: "Customer ID is required" };
    
    const customerId = parseInt(customerIdStr as string);
    
    // Verify customer exists
    const customer = await getCustomerById(customerId);
    if (!customer) {
      return { error: `Customer with ID ${customerId} does not exist in the database. Please re-select the customer from the sidebar.` };
    }

    const frequency = formData.get("frequency") as string;
    const payFromStr = formData.get("payFrom");
    const payToStr = formData.get("payTo");
    const paymentDateStr = formData.get("paymentDate");

    if (!payFromStr || !payToStr || !paymentDateStr) {
      return { error: "Dates are required" };
    }

    const payFrom = new Date(payFromStr as string);
    const payTo = new Date(payToStr as string);
    const paymentDate = new Date(paymentDateStr as string);

    if (isNaN(payFrom.getTime()) || isNaN(payTo.getTime()) || isNaN(paymentDate.getTime())) {
      return { error: "One or more dates are invalid" };
    }

    const periodLabel = formData.get("periodLabel") as string || undefined;

    const data = {
      customerId,
      frequency,
      payFrom,
      payTo,
      paymentDate,
      periodLabel,
    };

    console.log("Attempting to create PayCalendar with data:", JSON.stringify(data));

    const calendar = await createPayCalendar(data);

    await createAuditLog({
      tableName: "PayCalendar",
      recordId: calendar.id.toString(),
      action: "INSERT",
      notes: `Pay calendar created for customer ${customerId}: ${frequency}`,
    });

    return { success: true, calendar };
  } catch (error: any) {
    console.error("Create PayCalendar Error:", error);
    return { error: `Failed to create pay calendar: ${error.message || "Unknown error"}` };
  }
}

export async function updatePayCalendarAction(id: number, formData: FormData) {
  try {
    const calendar = await updatePayCalendar(id, {
      frequency: formData.get("frequency") as string || undefined,
      payFrom: formData.get("payFrom") ? new Date(formData.get("payFrom") as string) : undefined,
      payTo: formData.get("payTo") ? new Date(formData.get("payTo") as string) : undefined,
      paymentDate: formData.get("paymentDate") ? new Date(formData.get("paymentDate") as string) : undefined,
      periodLabel: formData.get("periodLabel") as string || undefined,
      isActive: formData.get("isActive") === "true" || undefined,
    });

    await createAuditLog({
      tableName: "PayCalendar",
      recordId: id.toString(),
      action: "UPDATE",
      notes: `Pay calendar updated: ${id}`,
    });

    revalidatePath("/");
    return { success: true, calendar };
  } catch (error) {
    return { error: "Failed to update pay calendar" };
  }
}

export async function deletePayCalendarAction(id: number) {
  try {
    await deletePayCalendar(id);
    await createAuditLog({
      tableName: "PayCalendar",
      recordId: id.toString(),
      action: "DELETE",
      notes: `Pay calendar deactivated: ${id}`,
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete pay calendar" };
  }
}

export async function getAllCustomersAction() {
  try {
    const customers = await getAllCustomers();
    return { success: true, customers };
  } catch (error) {
    return { error: "Failed to fetch customers" };
  }
}

export async function savePayrollInputsAction(payrollRunId: number, inputs: any[]) {
  try {
    for (const input of inputs) {
      try {
        // Ensure date is properly formatted
        let dateObj: Date;
        if (typeof input.date === 'string') {
          dateObj = new Date(input.date);
        } else if (input.date instanceof Date) {
          dateObj = input.date;
        } else {
          dateObj = new Date(input.date);
        }
        
        // Set to start of day in UTC
        const cleanDate = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()));
        
        await upsertPayrollInput({
          payrollRunId,
          employeeCode: (input.employeeCode || '').toUpperCase(),
          date: cleanDate,
          regularHours: input.regularHours,
          overtimeHours: input.overtimeHours,
          holidayHours: input.holidayHours,
          restDayHours: input.restDayHours,
          regularAmount: input.regularAmount,
          overtimeAmount: input.overtimeAmount,
          holidayAmount: input.holidayAmount,
          thirteenthAmount: input.thirteenthAmount,
          bonusAmount: input.bonusAmount,
          otherAmount: input.otherAmount,
          inputType: input.inputType,
          source: input.source || 'manual',
          employeeId: input.employeeId,
        });
      } catch (inputError: any) {
        console.error(`Error saving input for employee ${input.employeeCode}:`, inputError);
        throw new Error(`Failed to save input for employee ${input.employeeCode}: ${inputError.message}`);
      }
    }
    await validatePayrollInputs(payrollRunId);
    revalidatePath(`/payroll-run?id=${payrollRunId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Save payroll inputs error:", error);
    return { error: error.message || "Failed to save payroll inputs" };
  }
}

export async function getPayrollInputsAction(payrollRunId: number) {
  try {
    const inputs = await getPayrollInputs(payrollRunId);
    return { success: true, inputs };
  } catch (error) {
    return { error: "Failed to fetch payroll inputs" };
  }
}

export async function getEmployeesAction(customerId: number) {
  try {
    const employees = await getEmployees(customerId);
    return { success: true, employees };
  } catch (error) {
    return { error: "Failed to fetch employees" };
  }
}
export async function clearPayrollInputsAction(payrollRunId: number) {
  try {
    await clearPayrollInputs(payrollRunId);
    revalidatePath(`/payroll-run?id=${payrollRunId}`);
    return { success: true };
  } catch (error) {
    return { error: "Failed to clear payroll inputs" };
  }
}

export async function getPayrollRunsByCustomerAction(customerId: number) {
  try {
    const runs = await getPayrollRunsByCustomer(customerId);
    return { success: true, runs };
  } catch (error) {
    return { error: "Failed to fetch payroll runs" };
  }
}

export async function getPayrollRunDetailsByDateRangeAction(customerId: number, payFrom: Date, payTo: Date) {
  try {
    const payrollRun = await getPayrollRunDetailsByDateRange(customerId, payFrom, payTo);
    if (!payrollRun) {
      return { error: "No payroll data found in the specified date range" };
    }
    return { success: true, payrollRun };
  } catch (error) {
    console.error("Failed to get payroll run details by date range:", error);
    return { error: "Failed to load payroll data for the specified date range" };
  }
}

export async function getDepartmentsAction(customerId: number) {
  const { getDepartments } = await import("@/lib/db/queries");
  try {
    const departments = await getDepartments(customerId);
    return { success: true, departments };
  } catch (error) {
    return { error: "Failed to fetch departments" };
  }
}

export async function deletePayrollRunAction(payrollRunId: number) {
  try {
    // Verify status allows deletion
    const run = await getPayrollRunDetails(payrollRunId);
    if (!run) return { error: "Payroll run not found" };
    if (run.status === 'closed' || run.status === 'approved') {
      return { error: "Cannot delete a payroll run that is closed or approved" };
    }
    await deletePayrollRun(payrollRunId);
    await createAuditLog({
      tableName: "PayrollRun",
      recordId: payrollRunId.toString(),
      action: "DELETE",
      notes: `Payroll run ${payrollRunId} deleted`,
    });
    revalidatePath("/payroll-run");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete payroll run" };
  }
}

export async function acknowledgeWarningAction(employeeId: number, customerId: number, warningType: string) {
  try {
    await acknowledgeWarning(employeeId, customerId, warningType);
    return { success: true };
  } catch (error) {
    return { error: "Failed to acknowledge warning" };
  }
}

export async function getAcknowledgedWarningsAction(customerId: number) {
  try {
    const warnings = await getAcknowledgedWarnings(customerId);
    return { success: true, warnings };
  } catch (error) {
    return { error: "Failed to fetch acknowledged warnings" };
  }
}

// ──────────────────────────────────────────────
// PARAMETER TABLE SERVER ACTIONS
// ──────────────────────────────────────────────

// ── Statutory Deductions (Social Security) ──

export async function getStatutoryDeductionsAction(includeInactive = false) {
  try {
    const deductions = includeInactive ? await getAllStatutoryDeductions() : await getStatutoryDeductions();
    return { success: true, deductions };
  } catch {
    return { error: "Failed to fetch statutory deductions" };
  }
}

export async function createStatutoryDeductionAction(formData: FormData) {
  try {
    const deduction = await createStatutoryDeduction({
      code: formData.get("code") as string,
      description: formData.get("description") as string || undefined,
      rate: formData.get("rate") ? parseFloat(formData.get("rate") as string) : undefined,
      capAmount: formData.get("capAmount") ? parseFloat(formData.get("capAmount") as string) : undefined,
      employeeRate: formData.get("employeeRate") ? parseFloat(formData.get("employeeRate") as string) : undefined,
      employerRate: formData.get("employerRate") ? parseFloat(formData.get("employerRate") as string) : undefined,
      effectiveFrom: new Date(formData.get("effectiveFrom") as string),
      effectiveTo: formData.get("effectiveTo") ? new Date(formData.get("effectiveTo") as string) : undefined,
      isActive: formData.get("isActive") !== "false",
    });
    await createAuditLog({ tableName: "StatutoryDeduction", recordId: deduction.id.toString(), action: "INSERT", notes: `Statutory deduction created: ${deduction.code}` });
    revalidatePath("/table-maintenance");
    return { success: true, deduction };
  } catch (error: any) {
    return { error: error.message || "Failed to create statutory deduction" };
  }
}

export async function updateStatutoryDeductionAction(id: number, formData: FormData) {
  try {
    const deduction = await updateStatutoryDeduction(id, {
      code: formData.get("code") as string || undefined,
      description: formData.get("description") as string || undefined,
      rate: formData.get("rate") ? parseFloat(formData.get("rate") as string) : undefined,
      capAmount: formData.get("capAmount") ? parseFloat(formData.get("capAmount") as string) : undefined,
      employeeRate: formData.get("employeeRate") ? parseFloat(formData.get("employeeRate") as string) : undefined,
      employerRate: formData.get("employerRate") ? parseFloat(formData.get("employerRate") as string) : undefined,
      effectiveFrom: formData.get("effectiveFrom") ? new Date(formData.get("effectiveFrom") as string) : undefined,
      effectiveTo: formData.get("effectiveTo") ? new Date(formData.get("effectiveTo") as string) : undefined,
      isActive: formData.get("isActive") !== undefined ? formData.get("isActive") !== "false" : undefined,
    });
    await createAuditLog({ tableName: "StatutoryDeduction", recordId: id.toString(), action: "UPDATE", notes: `Statutory deduction updated: ${deduction.code}` });
    revalidatePath("/table-maintenance");
    return { success: true, deduction };
  } catch (error: any) {
    return { error: error.message || "Failed to update statutory deduction" };
  }
}

export async function deleteStatutoryDeductionAction(id: number) {
  try {
    await deleteStatutoryDeduction(id);
    await createAuditLog({ tableName: "StatutoryDeduction", recordId: id.toString(), action: "DELETE", notes: `Statutory deduction deactivated: ${id}` });
    revalidatePath("/table-maintenance");
    return { success: true };
  } catch {
    return { error: "Failed to deactivate statutory deduction" };
  }
}

// ── ISR Tax Brackets ──

export async function getIsrBracketsAction() {
  try {
    const brackets = await getIsrBrackets();
    return { success: true, brackets };
  } catch {
    return { error: "Failed to fetch ISR brackets" };
  }
}

export async function createIsrTaxBracketAction(formData: FormData) {
  try {
    const bracket = await createIsrTaxBracket({
      effectiveFrom: new Date(formData.get("effectiveFrom") as string),
      effectiveTo: formData.get("effectiveTo") ? new Date(formData.get("effectiveTo") as string) : undefined,
      bracketOrder: parseInt(formData.get("bracketOrder") as string),
      rangeMin: parseFloat(formData.get("rangeMin") as string),
      rangeMax: formData.get("rangeMax") ? parseFloat(formData.get("rangeMax") as string) : undefined,
      rate: parseFloat(formData.get("rate") as string),
      fixedAmount: formData.get("fixedAmount") ? parseFloat(formData.get("fixedAmount") as string) : 0,
    });
    await createAuditLog({ tableName: "IsrTaxBracket", recordId: bracket.id.toString(), action: "INSERT", notes: `ISR bracket ${bracket.bracketOrder} created` });
    revalidatePath("/table-maintenance");
    return { success: true, bracket };
  } catch (error: any) {
    return { error: error.message || "Failed to create ISR bracket" };
  }
}

export async function updateIsrTaxBracketAction(id: number, formData: FormData) {
  try {
    const bracket = await updateIsrTaxBracket(id, {
      effectiveFrom: formData.get("effectiveFrom") ? new Date(formData.get("effectiveFrom") as string) : undefined,
      effectiveTo: formData.get("effectiveTo") ? new Date(formData.get("effectiveTo") as string) : undefined,
      bracketOrder: formData.get("bracketOrder") ? parseInt(formData.get("bracketOrder") as string) : undefined,
      rangeMin: formData.get("rangeMin") ? parseFloat(formData.get("rangeMin") as string) : undefined,
      rangeMax: formData.get("rangeMax") ? parseFloat(formData.get("rangeMax") as string) : undefined,
      rate: formData.get("rate") ? parseFloat(formData.get("rate") as string) : undefined,
      fixedAmount: formData.get("fixedAmount") ? parseFloat(formData.get("fixedAmount") as string) : undefined,
    });
    await createAuditLog({ tableName: "IsrTaxBracket", recordId: id.toString(), action: "UPDATE", notes: `ISR bracket ${bracket.bracketOrder} updated` });
    revalidatePath("/table-maintenance");
    return { success: true, bracket };
  } catch (error: any) {
    return { error: error.message || "Failed to update ISR bracket" };
  }
}

export async function deleteIsrTaxBracketAction(id: number) {
  try {
    await deleteIsrTaxBracket(id);
    await createAuditLog({ tableName: "IsrTaxBracket", recordId: id.toString(), action: "DELETE", notes: `ISR bracket deactivated: ${id}` });
    revalidatePath("/table-maintenance");
    return { success: true };
  } catch {
    return { error: "Failed to deactivate ISR bracket" };
  }
}

// ── ISR Settings ──

export async function getIsrSettingsAction() {
  try {
    const settings = await getIsrSettings();
    return { success: true, settings };
  } catch {
    return { error: "Failed to fetch ISR settings" };
  }
}

export async function createIsrSettingAction(formData: FormData) {
  try {
    const setting = await createIsrSetting({
      effectiveFrom: new Date(formData.get("effectiveFrom") as string),
      effectiveTo: formData.get("effectiveTo") ? new Date(formData.get("effectiveTo") as string) : undefined,
      calculationMethod: (formData.get("calculationMethod") as string) || "annualized",
      roundingMethod: (formData.get("roundingMethod") as string) || "nearest",
      applyCssBeforeIsr: formData.get("applyCssBeforeIsr") !== "false",
      applySeguroEducativo: formData.get("applySeguroEducativo") !== "false",
      metadata: formData.get("metadata") as string || undefined,
    });
    await createAuditLog({ tableName: "IsrSetting", recordId: setting.id.toString(), action: "INSERT", notes: `ISR setting created: ${setting.id}` });
    revalidatePath("/table-maintenance");
    return { success: true, setting };
  } catch (error: any) {
    return { error: error.message || "Failed to create ISR setting" };
  }
}

export async function updateIsrSettingAction(id: number, formData: FormData) {
  try {
    const setting = await updateIsrSetting(id, {
      effectiveFrom: formData.get("effectiveFrom") ? new Date(formData.get("effectiveFrom") as string) : undefined,
      effectiveTo: formData.get("effectiveTo") ? new Date(formData.get("effectiveTo") as string) : undefined,
      calculationMethod: (formData.get("calculationMethod") as string) || undefined,
      roundingMethod: (formData.get("roundingMethod") as string) || undefined,
      applyCssBeforeIsr: formData.get("applyCssBeforeIsr") !== undefined ? formData.get("applyCssBeforeIsr") !== "false" : undefined,
      applySeguroEducativo: formData.get("applySeguroEducativo") !== undefined ? formData.get("applySeguroEducativo") !== "false" : undefined,
      metadata: formData.get("metadata") as string || undefined,
    });
    await createAuditLog({ tableName: "IsrSetting", recordId: id.toString(), action: "UPDATE", notes: `ISR setting updated: ${id}` });
    revalidatePath("/table-maintenance");
    return { success: true, setting };
  } catch (error: any) {
    return { error: error.message || "Failed to update ISR setting" };
  }
}

export async function deleteIsrSettingAction(id: number) {
  try {
    await deleteIsrSetting(id);
    await createAuditLog({ tableName: "IsrSetting", recordId: id.toString(), action: "DELETE", notes: `ISR setting deactivated: ${id}` });
    revalidatePath("/table-maintenance");
    return { success: true };
  } catch {
    return { error: "Failed to deactivate ISR setting" };
  }
}

// ── Overtime Rules ──

export async function getOvertimeRulesAction(includeInactive = false) {
  try {
    const rules = includeInactive ? await getAllOvertimeRules() : await getOvertimeRules();
    return { success: true, rules };
  } catch {
    return { error: "Failed to fetch overtime rules" };
  }
}

export async function createOvertimeRuleAction(formData: FormData) {
  try {
    const rule = await createOvertimeRule({
      customerId: formData.get("customerId") ? parseInt(formData.get("customerId") as string) : undefined,
      baseHourDivisor: formData.get("baseHourDivisor") ? parseInt(formData.get("baseHourDivisor") as string) : undefined,
      multiplierDiurna: formData.get("multiplierDiurna") ? parseFloat(formData.get("multiplierDiurna") as string) : undefined,
      multiplierNocturna: formData.get("multiplierNocturna") ? parseFloat(formData.get("multiplierNocturna") as string) : undefined,
      multiplierMixta: formData.get("multiplierMixta") ? parseFloat(formData.get("multiplierMixta") as string) : undefined,
      multiplierRestday: formData.get("multiplierRestday") ? parseFloat(formData.get("multiplierRestday") as string) : undefined,
      multiplierHoliday: formData.get("multiplierHoliday") ? parseFloat(formData.get("multiplierHoliday") as string) : undefined,
      stackMultipliers: formData.get("stackMultipliers") !== "false",
      maxHoursPerDay: formData.get("maxHoursPerDay") ? parseFloat(formData.get("maxHoursPerDay") as string) : undefined,
      maxHoursPerWeek: formData.get("maxHoursPerWeek") ? parseFloat(formData.get("maxHoursPerWeek") as string) : undefined,
      effectiveFrom: new Date(formData.get("effectiveFrom") as string),
      effectiveTo: formData.get("effectiveTo") ? new Date(formData.get("effectiveTo") as string) : undefined,
      isActive: formData.get("isActive") !== "false",
    });
    await createAuditLog({ tableName: "OvertimeRule", recordId: rule.id.toString(), action: "INSERT", notes: `Overtime rule created: ${rule.id}` });
    revalidatePath("/table-maintenance");
    return { success: true, rule };
  } catch (error: any) {
    return { error: error.message || "Failed to create overtime rule" };
  }
}

export async function updateOvertimeRuleAction(id: number, formData: FormData) {
  try {
    const rule = await updateOvertimeRule(id, {
      customerId: formData.get("customerId") ? parseInt(formData.get("customerId") as string) : undefined,
      baseHourDivisor: formData.get("baseHourDivisor") ? parseInt(formData.get("baseHourDivisor") as string) : undefined,
      multiplierDiurna: formData.get("multiplierDiurna") ? parseFloat(formData.get("multiplierDiurna") as string) : undefined,
      multiplierNocturna: formData.get("multiplierNocturna") ? parseFloat(formData.get("multiplierNocturna") as string) : undefined,
      multiplierMixta: formData.get("multiplierMixta") ? parseFloat(formData.get("multiplierMixta") as string) : undefined,
      multiplierRestday: formData.get("multiplierRestday") ? parseFloat(formData.get("multiplierRestday") as string) : undefined,
      multiplierHoliday: formData.get("multiplierHoliday") ? parseFloat(formData.get("multiplierHoliday") as string) : undefined,
      stackMultipliers: formData.get("stackMultipliers") !== undefined ? formData.get("stackMultipliers") !== "false" : undefined,
      maxHoursPerDay: formData.get("maxHoursPerDay") ? parseFloat(formData.get("maxHoursPerDay") as string) : undefined,
      maxHoursPerWeek: formData.get("maxHoursPerWeek") ? parseFloat(formData.get("maxHoursPerWeek") as string) : undefined,
      effectiveFrom: formData.get("effectiveFrom") ? new Date(formData.get("effectiveFrom") as string) : undefined,
      effectiveTo: formData.get("effectiveTo") ? new Date(formData.get("effectiveTo") as string) : undefined,
      isActive: formData.get("isActive") !== undefined ? formData.get("isActive") !== "false" : undefined,
    });
    await createAuditLog({ tableName: "OvertimeRule", recordId: id.toString(), action: "UPDATE", notes: `Overtime rule updated: ${id}` });
    revalidatePath("/table-maintenance");
    return { success: true, rule };
  } catch (error: any) {
    return { error: error.message || "Failed to update overtime rule" };
  }
}

export async function deleteOvertimeRuleAction(id: number) {
  try {
    await deleteOvertimeRule(id);
    await createAuditLog({ tableName: "OvertimeRule", recordId: id.toString(), action: "DELETE", notes: `Overtime rule deactivated: ${id}` });
    revalidatePath("/table-maintenance");
    return { success: true };
  } catch {
    return { error: "Failed to deactivate overtime rule" };
  }
}

// ── Holidays ──

export async function getHolidaysAction() {
  try {
    const holidays = await getHolidays();
    return { success: true, holidays };
  } catch {
    return { error: "Failed to fetch holidays" };
  }
}

export async function createHolidayAction(formData: FormData) {
  try {
    const holiday = await createHoliday({
      country: formData.get("country") as string,
      holidayDate: new Date(formData.get("holidayDate") as string),
      name: formData.get("name") as string,
      isNational: formData.get("isNational") !== "false",
    });
    await createAuditLog({ tableName: "Holiday", recordId: holiday.id.toString(), action: "INSERT", notes: `Holiday created: ${holiday.name}` });
    revalidatePath("/table-maintenance");
    return { success: true, holiday };
  } catch (error: any) {
    return { error: error.message || "Failed to create holiday" };
  }
}

export async function updateHolidayAction(id: number, formData: FormData) {
  try {
    const holiday = await updateHoliday(id, {
      country: formData.get("country") as string || undefined,
      holidayDate: formData.get("holidayDate") ? new Date(formData.get("holidayDate") as string) : undefined,
      name: formData.get("name") as string || undefined,
      isNational: formData.get("isNational") !== undefined ? formData.get("isNational") !== "false" : undefined,
    });
    await createAuditLog({ tableName: "Holiday", recordId: id.toString(), action: "UPDATE", notes: `Holiday updated: ${holiday.name}` });
    revalidatePath("/table-maintenance");
    return { success: true, holiday };
  } catch (error: any) {
    return { error: error.message || "Failed to update holiday" };
  }
}

export async function deleteHolidayAction(id: number) {
  try {
    await deleteHoliday(id);
    await createAuditLog({ tableName: "Holiday", recordId: id.toString(), action: "DELETE", notes: `Holiday deleted: ${id}` });
    revalidatePath("/table-maintenance");
    return { success: true };
  } catch {
    return { error: "Failed to delete holiday" };
  }
}

// ── 13th Month Parameters ──

export async function getThirteenthMonthParametersAction() {
  try {
    const params = await getThirteenthMonthParameters();
    return { success: true, params };
  } catch {
    return { error: "Failed to fetch 13th month parameters" };
  }
}

export async function createThirteenthMonthParameterAction(formData: FormData) {
  try {
    const param = await createThirteenthMonthParameter({
      effectiveFrom: new Date(formData.get("effectiveFrom") as string),
      effectiveTo: formData.get("effectiveTo") ? new Date(formData.get("effectiveTo") as string) : undefined,
      calculationMethod: (formData.get("calculationMethod") as string) || "accrual",
      accrualPercentage: formData.get("accrualPercentage") ? parseFloat(formData.get("accrualPercentage") as string) : 8.33,
      employerRate: formData.get("employerRate") ? parseFloat(formData.get("employerRate") as string) : undefined,
      paymentSchedule: (formData.get("paymentSchedule") as string) || "quarterly",
      isActive: formData.get("isActive") !== "false",
    });
    await createAuditLog({ tableName: "ThirteenthMonthParameter", recordId: param.id.toString(), action: "INSERT", notes: `13th month parameter created: ${param.id}` });
    revalidatePath("/table-maintenance");
    return { success: true, param };
  } catch (error: any) {
    return { error: error.message || "Failed to create 13th month parameter" };
  }
}

export async function updateThirteenthMonthParameterAction(id: number, formData: FormData) {
  try {
    const param = await updateThirteenthMonthParameter(id, {
      effectiveFrom: formData.get("effectiveFrom") ? new Date(formData.get("effectiveFrom") as string) : undefined,
      effectiveTo: formData.get("effectiveTo") ? new Date(formData.get("effectiveTo") as string) : undefined,
      calculationMethod: (formData.get("calculationMethod") as string) || undefined,
      accrualPercentage: formData.get("accrualPercentage") ? parseFloat(formData.get("accrualPercentage") as string) : undefined,
      employerRate: formData.get("employerRate") ? parseFloat(formData.get("employerRate") as string) : undefined,
      paymentSchedule: (formData.get("paymentSchedule") as string) || undefined,
      isActive: formData.get("isActive") !== undefined ? formData.get("isActive") !== "false" : undefined,
    });
    await createAuditLog({ tableName: "ThirteenthMonthParameter", recordId: id.toString(), action: "UPDATE", notes: `13th month parameter updated: ${id}` });
    revalidatePath("/table-maintenance");
    return { success: true, param };
  } catch (error: any) {
    return { error: error.message || "Failed to update 13th month parameter" };
  }
}

export async function deleteThirteenthMonthParameterAction(id: number) {
  try {
    await deleteThirteenthMonthParameter(id);
    await createAuditLog({ tableName: "ThirteenthMonthParameter", recordId: id.toString(), action: "DELETE", notes: `13th month parameter deactivated: ${id}` });
    revalidatePath("/table-maintenance");
    return { success: true };
  } catch {
    return { error: "Failed to deactivate 13th month parameter" };
  }
}

// ── Payroll Parameters ──

export async function getPayrollParametersAction(includeInactive = false) {
  try {
    const params = includeInactive ? await getAllPayrollParameters() : await getPayrollParameters();
    return { success: true, params };
  } catch {
    return { error: "Failed to fetch payroll parameters" };
  }
}

export async function createPayrollParameterAction(formData: FormData) {
  try {
    const param = await createPayrollParameter({
      code: formData.get("code") as string,
      description: formData.get("description") as string || undefined,
      value: formData.get("value") as string,
      dataType: (formData.get("dataType") as string) || "string",
      effectiveFrom: new Date(formData.get("effectiveFrom") as string),
      effectiveTo: formData.get("effectiveTo") ? new Date(formData.get("effectiveTo") as string) : undefined,
      isActive: formData.get("isActive") !== "false",
    });
    await createAuditLog({ tableName: "PayrollParameter", recordId: param.id.toString(), action: "INSERT", notes: `Payroll parameter created: ${param.code}` });
    revalidatePath("/table-maintenance");
    return { success: true, param };
  } catch (error: any) {
    return { error: error.message || "Failed to create payroll parameter" };
  }
}

export async function updatePayrollParameterAction(id: number, formData: FormData) {
  try {
    const param = await updatePayrollParameter(id, {
      code: formData.get("code") as string || undefined,
      description: formData.get("description") as string || undefined,
      value: formData.get("value") as string || undefined,
      dataType: (formData.get("dataType") as string) || undefined,
      effectiveFrom: formData.get("effectiveFrom") ? new Date(formData.get("effectiveFrom") as string) : undefined,
      effectiveTo: formData.get("effectiveTo") ? new Date(formData.get("effectiveTo") as string) : undefined,
      isActive: formData.get("isActive") !== undefined ? formData.get("isActive") !== "false" : undefined,
    });
    await createAuditLog({ tableName: "PayrollParameter", recordId: id.toString(), action: "UPDATE", notes: `Payroll parameter updated: ${param.code}` });
    revalidatePath("/table-maintenance");
    return { success: true, param };
  } catch (error: any) {
    return { error: error.message || "Failed to update payroll parameter" };
  }
}

export async function deletePayrollParameterAction(id: number) {
  try {
    await deletePayrollParameter(id);
    await createAuditLog({ tableName: "PayrollParameter", recordId: id.toString(), action: "DELETE", notes: `Payroll parameter deactivated: ${id}` });
    revalidatePath("/table-maintenance");
    return { success: true };
  } catch {
    return { error: "Failed to deactivate payroll parameter" };
  }
}

export async function updateUserPreferencesAction(userId: number, data: {
  languagePref?: string;
  dateFormat?: string;
  currencyDisplay?: string;
  fullName?: string;
  email?: string;
}) {
  try {
    const user = await updateUserPreferences(userId, data);
    await createAuditLog({
      tableName: "User",
      recordId: userId.toString(),
      action: "UPDATE",
      notes: `User preferences updated: ${userId}`,
    });
    return { success: true, user };
  } catch (error) {
    return { error: "Failed to update user preferences" };
  }
}

export async function changePasswordAction(userId: number, currentPassword: string, newPassword: string) {
  try {
    if (!newPassword || newPassword.length < 6) {
      return { error: "New password must be at least 6 characters" };
    }
    await updatePassword(userId, currentPassword, newPassword);
    await createAuditLog({
      tableName: "User",
      recordId: userId.toString(),
      action: "UPDATE",
      notes: `Password changed for user: ${userId}`,
    });
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to change password" };
  }
}

export async function checkSalaryVariationsAction(customerId: number, payrollRunId: number, currentInputs: any[]) {
  try {
    const { prisma } = await import("@/lib/prisma");
    
    const payrollRun = await prisma.payrollRun.findUnique({
      where: { id: payrollRunId },
      select: { payFrom: true }
    });

    if (!payrollRun) return { success: true, warnings: [] };

    const employees = await prisma.employee.findMany({
      where: { customerId }
    });

    const warnings: any[] = [];

    for (const emp of employees) {
      // Get historical payroll data for the last 4 weeks
      const historicalRuns = await prisma.payrollRun.findMany({
        where: {
          customerId,
          status: 'closed',
          payTo: {
            lt: payrollRun.payFrom
          }
        },
        orderBy: { payTo: 'desc' },
        take: 4,
        include: {
          earnings: {
            where: { employeeId: emp.id }
          }
        }
      });

      if (historicalRuns.length >= 4) {
        const historicalTotals = historicalRuns.map(run => 
          run.earnings.reduce((sum, e) => sum + e.totalAmount, 0)
        );
        const avgHistorical = historicalTotals.reduce((sum, total) => sum + total, 0) / historicalTotals.length;

        // Calculate current period total for this employee
        const empInputs = currentInputs.filter(i => i.employeeId === emp.id);
        let currentTotal = 0;
        empInputs.forEach(input => {
          if (input.inputType === 'amount') {
            currentTotal += (input.regularAmount || 0) + (input.overtimeAmount || 0) + 
                          (input.holidayAmount || 0) + (input.thirteenthAmount || 0) + 
                          (input.bonusAmount || 0) + (input.otherAmount || 0);
          } else {
            // For hours, calculate based on salary
            const hourlyRate = emp.baseSalary / 240;
            currentTotal += (input.regularHours || 0) * hourlyRate +
                          (input.overtimeHours || 0) * hourlyRate * 1.25 +
                          (input.holidayHours || 0) * hourlyRate * 2.5 +
                          (input.restDayHours || 0) * hourlyRate * 1.5;
          }
        });

        if (currentTotal > 0) {
          const variation = Math.abs(currentTotal - avgHistorical) / avgHistorical;
          if (variation > 0.05) { // 5% threshold
            warnings.push({ 
              employeeId: emp.id, 
              employeeCode: emp.employeeCode, 
              employeeName: `${emp.firstName} ${emp.lastName}`, 
              type: "SALARY_VARIATION", 
              message: `Salary variation of ${(variation * 100).toFixed(1)}% compared to 4-week average.`, 
              severity: "warning"
            });
          }
        }
      }
    }

    return { success: true, warnings };
  } catch (error) {
    console.error("Salary variation check error:", error);
    return { error: "Failed to check salary variations" };
  }
}

// ── Bank Accounts ──

export async function getBankAccountsAction(includeInactive = false) {
  try {
    const banks = includeInactive
      ? await getAllBanks()
      : await getBanks();
    return { success: true, banks };
  } catch {
    return { error: "Failed to fetch banks" };
  }
}

export async function createBankAccountAction(formData: FormData) {
  try {
    const bank = await createBank({
      bankName: formData.get("bankName") as string,
      routingNumber: formData.get("routingNumber") as string || undefined,
      address: formData.get("address") as string || undefined,
      contactName: formData.get("contactName") as string || undefined,
      phone: formData.get("phone") as string || undefined,
      email: formData.get("email") as string || undefined,
      currency: (formData.get("currency") as string) || "PAB",
    });
    await createAuditLog({ tableName: "Bank", recordId: bank.id.toString(), action: "INSERT", notes: `Bank created: ${bank.bankName}` });
    revalidatePath("/table-maintenance");
    return { success: true, bank };
  } catch (error: any) {
    return { error: error.message || "Failed to create bank" };
  }
}

export async function updateBankAccountAction(id: number, formData: FormData) {
  try {
    const bank = await updateBank(id, {
      bankName: formData.get("bankName") as string || undefined,
      routingNumber: formData.get("routingNumber") as string || undefined,
      address: formData.get("address") as string || undefined,
      contactName: formData.get("contactName") as string || undefined,
      phone: formData.get("phone") as string || undefined,
      email: formData.get("email") as string || undefined,
      currency: (formData.get("currency") as string) || undefined,
      isActive: formData.get("isActive") !== undefined ? formData.get("isActive") !== "false" : undefined,
    });
    await createAuditLog({ tableName: "Bank", recordId: id.toString(), action: "UPDATE", notes: `Bank updated: ${bank.bankName}` });
    revalidatePath("/table-maintenance");
    return { success: true, bank };
  } catch (error: any) {
    return { error: error.message || "Failed to update bank" };
  }
}

export async function deleteBankAccountAction(id: number) {
  try {
    await deleteBank(id);
    await createAuditLog({ tableName: "Bank", recordId: id.toString(), action: "DELETE", notes: `Bank deactivated: ${id}` });
    revalidatePath("/table-maintenance");
    return { success: true };
  } catch {
    return { error: "Failed to deactivate bank" };
  }
}
