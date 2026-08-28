// filepath: src/app/api/employees/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/employees - List all employees
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');

    const where: any = {};
    
    if (customerId) {
      where.customerId = parseInt(customerId);
    }
    
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }
    
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { employeeCode: { contains: search } },
        { identificationNumber: { contains: search } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        department: true,
        position: true,
        bank: true,
      },
      orderBy: { lastName: 'asc' },
    });

    return NextResponse.json({ success: true, data: employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

// POST /api/employees - Create new employee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      customerId,
      employeeCode,
      firstName,
      lastName,
      identificationNumber,
      idType,
      birthDate,
      sssNumber,
      departmentId,
      positionId,
      baseSalary,
      salaryFrequency,
      salaryType,
      paymentMethod,
      bankId,
      accountNumber,
      accountType,
      isOvertimeEligible,
      restDay,
      hireDate,
    } = body;

    // Normalize employeeCode to uppercase
    const normalizedCode = (employeeCode || '').toUpperCase();

    // Validate required fields
    if (!customerId || !normalizedCode || !firstName || !lastName || !baseSalary) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if employee code already exists for this customer
    const existing = await prisma.employee.findFirst({
      where: { customerId: parseInt(customerId), employeeCode: normalizedCode },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Employee code already exists' },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.create({
      data: {
        customerId: parseInt(customerId),
        employeeCode: normalizedCode,
        firstName,
        lastName,
        identificationNumber,
        idType: idType || 'cedula',
        birthDate: birthDate ? new Date(birthDate) : null,
        sssNumber,
        departmentId: departmentId ? parseInt(departmentId) : null,
        positionId: positionId ? parseInt(positionId) : null,
        baseSalary: parseFloat(baseSalary),
        salaryFrequency: salaryFrequency || 'monthly',
        salaryType: salaryType || 'monthly',
        paymentMethod: paymentMethod || 'cash',
        bankId: bankId ? parseInt(bankId) : null,
        accountNumber: accountNumber || null,
        accountType: accountType || null,
        isOvertimeEligible: isOvertimeEligible !== false,
        restDay: restDay || 'domingo',
        hireDate: hireDate ? new Date(hireDate) : new Date(),
        isActive: true,
      },
      include: {
        department: true,
        position: true,
      },
    });

    // Create initial vacation accrual
    await prisma.vacationAccrual.create({
      data: {
        employeeId: employee.id,
        earnedDays: 0,
        usedDays: 0,
        balanceDays: 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: employee,
      message: 'Employee created successfully',
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}

// PUT /api/employees - Update employee
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Normalize employeeCode to uppercase
    if (updateData.employeeCode) updateData.employeeCode = updateData.employeeCode.toUpperCase();

    // Parse numeric fields
    const parsedData: any = { ...updateData };
    if (updateData.customerId) parsedData.customerId = parseInt(updateData.customerId);
    if (updateData.departmentId) parsedData.departmentId = parseInt(updateData.departmentId);
    if (updateData.positionId) parsedData.positionId = parseInt(updateData.positionId);
    if (updateData.baseSalary) parsedData.baseSalary = parseFloat(updateData.baseSalary);
    if (updateData.salaryType) parsedData.salaryType = updateData.salaryType;
    if (updateData.bankId) parsedData.bankId = parseInt(updateData.bankId);

    const employee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: parsedData,
      include: {
        department: true,
        position: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: employee,
      message: 'Employee updated successfully',
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    );
  }
}

// DELETE /api/employees - Delete (soft) employee
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Soft delete - set isActive to false
    const employee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      data: employee,
      message: 'Employee deactivated successfully',
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json(
      { error: 'Failed to delete employee' },
      { status: 500 }
    );
  }
}