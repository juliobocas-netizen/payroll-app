import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  log: ['info'],
});

async function main() {
  console.log('Starting GPM Payroll Database Seed (Panama Labor Law)...');

  // ============================================
  // 1. CREATE ROLES (RBAC Levels 1-5)
  // ============================================
  console.log('Creating roles...');

  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'superadmin' },
      update: {},
      create: { name: 'superadmin', level: 5, description: 'Full system administration' },
    }),
    prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin', level: 4, description: 'Can approve/close payroll runs' },
    }),
    prisma.role.upsert({
      where: { name: 'clerk' },
      update: {},
      create: { name: 'clerk', level: 3, description: 'Can run payroll calculations' },
    }),
    prisma.role.upsert({
      where: { name: 'dataentry' },
      update: {},
      create: { name: 'dataentry', level: 2, description: 'Can enter/import time and inputs' },
    }),
    prisma.role.upsert({
      where: { name: 'employee' },
      update: {},
      create: { name: 'employee', level: 1, description: 'Self-service: view own payslips' },
    }),
  ]);

  // ============================================
  // 2. CREATE CUSTOMERS (Tenants)
  // ============================================
  console.log('Creating customers...');

  const customer1 = await prisma.customer.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Tech Corp Panama S.A.',
      ruc: '123456-123456789',
      address: 'Punta Pacifica, Edificio Oceania, Piso 15, Panama City',
      contactName: 'Maria Gonzalez',
      contactEmail: 'mgonzalez@techcorp.com',
      contactPhone: '+507 123-4567',
      servicioFee: 500.00,
      status: 'activo',
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Logistics International',
      ruc: '234567-234567890',
      address: 'Zona Libre de Colon, Avenida Roosevelt, Colon',
      contactName: 'Roberto Smith',
      contactEmail: 'rsmith@logistics-int.com',
      contactPhone: '+507 234-5678',
      servicioFee: 750.00,
      status: 'activo',
    },
  });

  const customer3 = await prisma.customer.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'Retail Partners LLC',
      ruc: '345678-345678901',
      address: 'Multiplaza Pacific Mall, Local 201, Panama City',
      contactName: 'Ana Lopez',
      contactEmail: 'alopez@retailpartners.com',
      contactPhone: '+507 345-6789',
      servicioFee: 350.00,
      status: 'activo',
    },
  });

  // ============================================
  // 3. CREATE USERS (with hashed passwords)
  // ============================================
  console.log('Creating users...');

  const hashedPassword = await bcrypt.hash('admin123', 10);
  const clerkPassword = await bcrypt.hash('clerk123', 10);

  const adminRole = roles.find(r => r.name === 'superadmin')!;
  const clerkRole = roles.find(r => r.name === 'clerk')!;

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      customerId: customer1.id,
      username: 'admin',
      passwordHash: hashedPassword,
      email: 'admin@gpm.com',
      fullName: 'Administrador GPM',
      roleId: adminRole.id,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { username: 'jcastillo' },
    update: {},
    create: {
      customerId: customer1.id,
      username: 'jcastillo',
      passwordHash: clerkPassword,
      email: 'jcastillo@techcorp.com',
      fullName: 'Juan Castillo',
      roleId: clerkRole.id,
      isActive: true,
    },
  });

  // ============================================
  // 4. CREATE DEPARTMENTS (All Customers)
  // ============================================
  console.log('Creating departments...');

  const departments = [
    await prisma.department.create({ data: { id: 1, name: 'Ingenieria', customerId: customer1.id } }),
    await prisma.department.create({ data: { id: 2, name: 'Recursos Humanos', customerId: customer1.id } }),
    await prisma.department.create({ data: { id: 3, name: 'Ventas y Mercadeo', customerId: customer1.id } }),
    await prisma.department.create({ data: { id: 4, name: 'Operaciones', customerId: customer1.id } }),
    await prisma.department.create({ data: { id: 5, name: 'Finanzas', customerId: customer1.id } }),
    await prisma.department.create({ data: { id: 6, name: 'Almacen', customerId: customer2.id } }),
    await prisma.department.create({ data: { id: 7, name: 'Logistica', customerId: customer2.id } }),
    await prisma.department.create({ data: { id: 8, name: 'Administracion', customerId: customer2.id } }),
    await prisma.department.create({ data: { id: 9, name: 'Ventas Tienda', customerId: customer3.id } }),
    await prisma.department.create({ data: { id: 10, name: 'Caja', customerId: customer3.id } }),
    await prisma.department.create({ data: { id: 11, name: 'Inventario', customerId: customer3.id } }),
  ];

  // ============================================
  // 5. CREATE POSITIONS (All Customers)
  // ============================================
  console.log('Creating positions...');

  const positions = [
    await prisma.position.create({ data: { id: 1, title: 'Ingeniero de Software', customerId: customer1.id } }),
    await prisma.position.create({ data: { id: 2, title: 'Gerente de Recursos Humanos', customerId: customer1.id } }),
    await prisma.position.create({ data: { id: 3, title: 'Representante de Ventas', customerId: customer1.id } }),
    await prisma.position.create({ data: { id: 4, title: 'Gerente de Operaciones', customerId: customer1.id } }),
    await prisma.position.create({ data: { id: 5, title: 'Contador', customerId: customer1.id } }),
    await prisma.position.create({ data: { id: 6, title: 'Auxiliar de Almacen', customerId: customer2.id } }),
    await prisma.position.create({ data: { id: 7, title: 'Coordinador de Logistica', customerId: customer2.id } }),
    await prisma.position.create({ data: { id: 8, title: 'Administrador', customerId: customer2.id } }),
    await prisma.position.create({ data: { id: 9, title: 'Vendedor', customerId: customer3.id } }),
    await prisma.position.create({ data: { id: 10, title: 'Cajero', customerId: customer3.id } }),
    await prisma.position.create({ data: { id: 11, title: 'Supervisor de Inventario', customerId: customer3.id } }),
  ];

  // ============================================
  // 6. CREATE BANK ACCOUNTS (All Customers)
  // ============================================
  console.log('Creating bank accounts...');

  const bankAccounts = [
    await prisma.bank.create({
      data: {
        id: 1,
        bankName: 'Banco General',
        currency: 'PAB',
        isActive: true,
        contactName: 'Contact Name',
        phone: '+507 000-0000',
      },
    }),
    await prisma.bank.create({
      data: {
        id: 2,
        bankName: 'Banco Nacional de Panama',
        currency: 'PAB',
        isActive: true,
        contactName: 'Contact Name',
        phone: '+507 000-0000',
      },
    }),
    await prisma.bank.create({
      data: {
        id: 3,
        bankName: 'Banistmo',
        currency: 'PAB',
        isActive: true,
        contactName: 'Contact Name',
        phone: '+507 000-0000',
      },
    }),
    await prisma.bank.create({
      data: {
        id: 4,
        bankName: 'Banco Global Bank',
        currency: 'PAB',
        isActive: true,
        contactName: 'Contact Name',
        phone: '+507 000-0000',
      },
    }),
  ];

  // ============================================
  // 7. CREATE SERVICE AGREEMENTS
  // ============================================
  console.log('Creating service agreements...');

  await prisma.serviceAgreement.create({
    data: {
      id: 1,
      customerId: customer1.id,
      startDate: new Date('2023-01-01'),
      endDate: new Date('2027-12-31'),
      terms: 'Contrato de servicios de nomina mensual. Incluye calculo de CSS, ISR, decimo tercer mes, vacaciones y horas extras segun Codigo de Trabajo de Panama.',
      status: 'active',
    },
  });
  await prisma.serviceAgreement.create({
    data: {
      id: 2,
      customerId: customer2.id,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2028-05-31'),
      terms: 'Servicio integral de nomina y gestion de planilla para empleados en Zona Libre de Colon.',
      status: 'active',
    },
  });
  await prisma.serviceAgreement.create({
    data: {
      id: 3,
      customerId: customer3.id,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2026-12-31'),
      terms: 'Procesamiento de nomina quincenal para personal de retail.',
      status: 'active',
    },
  });

  // ============================================
  // 8. CREATE EMPLOYEES (20 for Customer 1)
  // ============================================
  console.log('Creating employees...');

  const employees = await Promise.all([
    prisma.employee.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        customerId: customer1.id,
        employeeCode: 'TC-001',
        firstName: 'Carlos',
        lastName: 'Mendez',
        identificationNumber: '8-123-4567',
        idType: 'cedula',
        birthDate: new Date('1988-05-12'),
        sssNumber: '123456789',
        departmentId: departments[0].id,
        positionId: positions[0].id,
        baseSalary: 2500.00,
        salaryFrequency: 'monthly',
        paymentMethod: 'bank',
        bankId: 1,
        accountNumber: '0000000000',
        accountType: 'checking',
        isOvertimeEligible: true,
        restDay: 'domingo',
        hireDate: new Date('2023-01-15'),
        isActive: true,
      },
    }),
    prisma.employee.upsert({
      where: { id: 2 },
      update: {},
      create: {
        id: 2,
        customerId: customer1.id,
        employeeCode: 'TC-002',
        firstName: 'Ana',
        lastName: 'Gomez',
        identificationNumber: '8-234-5678',
        idType: 'cedula',
        birthDate: new Date('1985-11-03'),
        sssNumber: '234567890',
        departmentId: departments[1].id,
        positionId: positions[1].id,
        baseSalary: 3200.00,
        salaryFrequency: 'monthly',
        paymentMethod: 'bank',
        bankId: 1,
        accountNumber: '0000000000',
        accountType: 'checking',
        isOvertimeEligible: false,
        restDay: 'domingo',
        hireDate: new Date('2022-06-01'),
        isActive: true,
      },
    }),
    prisma.employee.upsert({
      where: { id: 3 },
      update: {},
      create: {
        id: 3,
        customerId: customer1.id,
        employeeCode: 'TC-003',
        firstName: 'Luis',
        lastName: 'Rodriguez',
        identificationNumber: '8-345-6789',
        idType: 'cedula',
        birthDate: new Date('1992-07-20'),
        sssNumber: '345678901',
        departmentId: departments[2].id,
        positionId: positions[2].id,
        baseSalary: 1800.00,
        salaryFrequency: 'monthly',
        paymentMethod: 'cash',
        isOvertimeEligible: true,
        restDay: 'sabado',
        hireDate: new Date('2024-03-01'),
        isActive: true,
      },
    }),
    prisma.employee.upsert({
      where: { id: 4 },
      update: {},
      create: {
        id: 4,
        customerId: customer1.id,
        employeeCode: 'TC-004',
        firstName: 'Maria',
        lastName: 'Castillo',
        identificationNumber: '8-456-7890',
        idType: 'cedula',
        birthDate: new Date('1995-02-28'),
        sssNumber: '456789012',
        departmentId: departments[2].id,
        positionId: positions[2].id,
        baseSalary: 1500.00,
        salaryFrequency: 'monthly',
        paymentMethod: 'cash',
        isOvertimeEligible: true,
        restDay: 'domingo',
        hireDate: new Date('2024-01-10'),
        isActive: true,
      },
    }),
    prisma.employee.upsert({
      where: { id: 5 },
      update: {},
      create: {
        id: 5,
        customerId: customer1.id,
        employeeCode: 'TC-005',
        firstName: 'Juan',
        lastName: 'Perez',
        identificationNumber: '8-567-8901',
        idType: 'cedula',
        birthDate: new Date('1990-09-15'),
        sssNumber: '567890123',
        departmentId: departments[0].id,
        positionId: positions[0].id,
        baseSalary: 2100.00,
        salaryFrequency: 'monthly',
        paymentMethod: 'bank',
        bankId: 2,
        accountNumber: '0000000000',
        accountType: 'checking',
        isOvertimeEligible: true,
        restDay: 'domingo',
        hireDate: new Date('2023-09-01'),
        isActive: true,
      },
    }),
    prisma.employee.upsert({
      where: { id: 6 },
      update: {},
      create: {
        id: 6,
        customerId: customer1.id,
        employeeCode: 'TC-006',
        firstName: 'Rosa',
        lastName: 'Vasquez',
        identificationNumber: '8-678-9012',
        idType: 'cedula',
        birthDate: new Date('1987-04-18'),
        sssNumber: '678901234',
        departmentId: departments[4].id,
        positionId: positions[4].id,
        baseSalary: 2800.00,
        salaryFrequency: 'monthly',
        paymentMethod: 'bank',
        bankId: 1,
        accountNumber: '0000000000',
        accountType: 'checking',
        isOvertimeEligible: false,
        restDay: 'domingo',
        hireDate: new Date('2022-11-15'),
        isActive: true,
      },
    }),
    prisma.employee.upsert({
      where: { id: 7 },
      update: {},
      create: {
        id: 7,
        customerId: customer1.id,
        employeeCode: 'TC-007',
        firstName: 'Miguel',
        lastName: 'Torres',
        identificationNumber: '3-456-7890',
        idType: 'cedula',
        birthDate: new Date('1991-12-05'),
        sssNumber: '789012345',
        departmentId: departments[3].id,
        positionId: positions[3].id,
        baseSalary: 2400.00,
        salaryFrequency: 'monthly',
        paymentMethod: 'bank',
        bankId: 1,
        accountNumber: '0000000000',
        accountType: 'checking',
        isOvertimeEligible: true,
        restDay: 'sabado',
        hireDate: new Date('2023-05-20'),
        isActive: true,
      },
    }),
    prisma.employee.upsert({
      where: { id: 8 },
      update: {},
      create: {
        id: 8,
        customerId: customer1.id,
        employeeCode: 'TC-008',
        firstName: 'Carmen',
        lastName: 'Herrera',
        identificationNumber: '8-789-0123',
        idType: 'cedula',
        birthDate: new Date('1989-08-22'),
        sssNumber: '890123456',
        departmentId: departments[1].id,
        positionId: positions[1].id,
        baseSalary: 2900.00,
        salaryFrequency: 'monthly',
        paymentMethod: 'cash',
        isOvertimeEligible: false,
        restDay: 'domingo',
        hireDate: new Date('2024-02-01'),
        isActive: true,
      },
    }),
    prisma.employee.upsert({
      where: { id: 9 },
      update: {},
      create: {
        id: 9,
        customerId: customer1.id,
        employeeCode: 'TC-009',
        firstName: 'Roberto',
        lastName: 'Silva',
        identificationNumber: '4-123-4567',
        idType: 'cedula',
        birthDate: new Date('1998-01-30'),
        sssNumber: '901234567',
        departmentId: departments[2].id,
        positionId: positions[2].id,
        baseSalary: 1600.00,
        salaryFrequency: 'monthly',
        paymentMethod: 'cash',
        isOvertimeEligible: true,
        restDay: 'domingo',
        hireDate: new Date('2025-01-15'),
        isActive: true,
      },
    }),
    prisma.employee.upsert({
      where: { id: 10 },
      update: {},
      create: {
        id: 10,
        customerId: customer1.id,
        employeeCode: 'TC-010',
        firstName: 'Patricia',
        lastName: 'Morales',
        identificationNumber: '8-890-1234',
        idType: 'cedula',
        birthDate: new Date('1986-06-14'),
        sssNumber: '012345678',
        departmentId: departments[0].id,
        positionId: positions[0].id,
        baseSalary: 2700.00,
        salaryFrequency: 'monthly',
        paymentMethod: 'bank',
        bankId: 2,
        accountNumber: '0000000000',
        accountType: 'checking',
        isOvertimeEligible: true,
        restDay: 'domingo',
        hireDate: new Date('2022-08-10'),
        isActive: true,
      },
    }),
    prisma.employee.upsert({
      where: { id: 11 },
      update: {},
      create: {
        id: 11,
        customerId: customer1.id,
        employeeCode: 'TC-011',
        firstName: 'Fernando',
        lastName: 'Ruiz',
        identificationNumber: '7-234-5678',
        idType: 'cedula',
        birthDate: new Date('1993-10-08'),
        sssNumber: '123450789',
        departmentId: departments[3].id,
        positionId: positions[3].id,
        baseSalary: 2200.00,
        salaryFrequency: 'monthly',
        paymentMethod: 'bank',
        bankId: 1,
        accountNumber: '0000000000',
        accountType: 'checking',
        isOvertimeEligible: true,
        restDay: 'sabado',
        hireDate: new Date('2023-12-01'),
        isActive: true,
      },
    }),
    prisma.employee.upsert({
      where: { id: 12 },
      update: {},
      create: {
        id: 12,
        customerId: customer1.id,
        employeeCode: 'TC-012',
        firstName: 'Gabriela',
        lastName: 'Navarro',
        identificationNumber: '8-901-2345',
        idType: 'cedula',
        birthDate: new Date('1994-03-25'),
        sssNumber: '234561890',
        departmentId: departments[4].id,
        positionId: positions[4].id,
        baseSalary: 2600.00,
        salaryFrequency: 'monthly',
        paymentMethod: 'bank',
        bankId: 1,
        accountNumber: '0000000000',
        accountType: 'checking',
        isOvertimeEligible: false,
        restDay: 'domingo',
        hireDate: new Date('2024-06-15'),
        isActive: true,
      },
    }),
    prisma.employee.upsert({
      where: { id: 13 },
      update: {},
      create: {
        id: 13,
        customerId: customer1.id,
        employeeCode: 'TC-013',
        firstName: 'Eduardo',
        lastName: 'Jimenez',
        identificationNumber: '1-345-6789',
        idType: 'cedula',
        birthDate: new Date('1999-11-19'),
        sssNumber: '345672901',
        departmentId: departments[2].id,
        positionId: positions[2].id,
        baseSalary: 1900.00,
        salaryFrequency: 'monthly',
        paymentMethod: 'cash',
        isOvertimeEligible: true,
        restDay: 'domingo',
        hireDate: new Date('2025-03-20'),
        isActive: true,
      },
    }),
    prisma.employee.upsert({
      where: { id: 14 },
      update: {},
      create: {
        id: 14,
        customerId: customer1.id,
        employeeCode: 'TC-014',
        firstName: 'Sofia',
        lastName: 'Reyes',
        identificationNumber: '8-012-3456',
        idType: 'cedula',
        birthDate: new Date('1982-07-07'),
        sssNumber: '456783012',
        departmentId: departments[0].id,
        positionId: positions[0].id,
        baseSalary: 3000.00,
        salaryFrequency: 'monthly',
        paymentMethod: 'bank',
        bankId: 1,
        accountNumber: '0000000000',
        accountType: 'checking',
        isOvertimeEligible: false,
        restDay: 'domingo',
        hireDate: new Date('2021-04-01'),
        isActive: true,
      },
    }),
    prisma.employee.upsert({
      where: { id: 15 },
      update: {},
      create: {
        id: 15,
        customerId: customer1.id,
        employeeCode: 'TC-015',
        firstName: 'Andres',
        lastName: 'Cruz',
        identificationNumber: '6-456-7890',
        idType: 'cedula',
        birthDate: new Date('1996-05-03'),
        sssNumber: '567894123',
        departmentId: departments[3].id,
        positionId: positions[3].id,
        baseSalary: 2000.00,
        salaryFrequency: 'monthly',
        paymentMethod: 'bank',
        bankId: 2,
        accountNumber: '0000000000',
        accountType: 'checking',
        isOvertimeEligible: true,
        restDay: 'domingo',
        hireDate: new Date('2024-09-10'),
        isActive: true,
      },
    }),
    prisma.employee.upsert({
      where: { id: 16 },
      update: {},
      create: {
        id: 16,
        customerId: customer1.id,
        employeeCode: 'TC-016',
        firstName: 'Valentina',
        lastName: 'Ortiz',
        identificationNumber: '8-112-3456',
        idType: 'cedula',
        birthDate: new Date('1991-09-11'),
        sssNumber: '678905234',
        departmentId: departments[1].id,
        positionId: positions[1].id,
        baseSalary: 2500.00,
        salaryFrequency: 'monthly',
        paymentMethod: 'cash',
        isOvertimeEligible: false,
        restDay: 'sabado',
        hireDate: new Date('2023-07-25'),
        isActive: true,
      },
    }),
    prisma.employee.upsert({
      where: { id: 17 },
      update: {},
      create: {
        id: 17,
        customerId: customer1.id,
        employeeCode: 'TC-017',
        firstName: 'Ricardo',
        lastName: 'Delgado',
        identificationNumber: '9-567-8901',
        idType: 'cedula',
        birthDate: new Date('2000-04-16'),
        sssNumber: '789016345',
        departmentId: departments[2].id,
        positionId: positions[2].id,
        baseSalary: 1700.00,
        salaryFrequency: 'monthly',
        paymentMethod: 'cash',
        isOvertimeEligible: true,
        restDay: 'domingo',
        hireDate: new Date('2025-02-14'),
        isActive: true,
      },
    }),
    prisma.employee.upsert({
      where: { id: 18 },
      update: {},
      create: {
        id: 18,
        customerId: customer1.id,
        employeeCode: 'TC-018',
        firstName: 'Daniela',
        lastName: 'Mendoza',
        identificationNumber: '8-212-3456',
        idType: 'cedula',
        birthDate: new Date('1984-12-21'),
        sssNumber: '890127456',
        departmentId: departments[4].id,
        positionId: positions[4].id,
        baseSalary: 3100.00,
        salaryFrequency: 'monthly',
        paymentMethod: 'bank',
        bankId: 1,
        accountNumber: '0000000000',
        accountType: 'checking',
        isOvertimeEligible: false,
        restDay: 'domingo',
        hireDate: new Date('2022-03-01'),
        isActive: true,
      },
    }),
    prisma.employee.upsert({
      where: { id: 19 },
      update: {},
      create: {
        id: 19,
        customerId: customer1.id,
        employeeCode: 'TC-019',
        firstName: 'Hector',
        lastName: 'Castro',
        identificationNumber: '5-678-9012',
        idType: 'cedula',
        birthDate: new Date('1988-02-14'),
        sssNumber: '901238567',
        departmentId: departments[0].id,
        positionId: positions[0].id,
        baseSalary: 2300.00,
        salaryFrequency: 'monthly',
        paymentMethod: 'bank',
        bankId: 2,
        accountNumber: '0000000000',
        accountType: 'checking',
        isOvertimeEligible: true,
        restDay: 'sabado',
        hireDate: new Date('2023-10-05'),
        isActive: true,
      },
    }),
    prisma.employee.upsert({
      where: { id: 20 },
      update: {},
      create: {
        id: 20,
        customerId: customer1.id,
        employeeCode: 'TC-020',
        firstName: 'Alejandra',
        lastName: 'Fuentes',
        identificationNumber: '8-312-3456',
        idType: 'cedula',
        birthDate: new Date('1997-08-09'),
        sssNumber: '012349678',
        departmentId: departments[3].id,
        positionId: positions[3].id,
        baseSalary: 2100.00,
        salaryFrequency: 'monthly',
        paymentMethod: 'bank',
        bankId: 1,
        accountNumber: '0000000000',
        accountType: 'checking',
        isOvertimeEligible: true,
        restDay: 'domingo',
        hireDate: new Date('2024-07-22'),
        isActive: true,
      },
    }),
  ]);

  // ============================================
  // 9. CREATE EMPLOYEE CONTRACTS (Panama - Indefinite Term per Art. 61 CT)
  // ============================================
  console.log('Creating employee contracts...');

  for (const emp of employees) {
    await prisma.employeeContract.upsert({
      where: { id: emp.id },
      update: {},
      create: {
        employeeId: emp.id,
        contractType: 'indefinite',
        startDate: emp.hireDate!,
        salaryAmount: emp.baseSalary,
      },
    });
  }

  // ============================================
  // 10. CREATE EMPLOYEE RECURRING ITEMS
  // ============================================
  console.log('Creating employee recurring items...');

  await Promise.all([
    prisma.employeeRecurringItem.create({
      data: { employeeId: 1, itemType: 'earning', code: 'BONO_TRANSPORTE', amount: 50.00, isActive: true, startDate: new Date('2023-01-15') },
    }),
    prisma.employeeRecurringItem.create({
      data: { employeeId: 3, itemType: 'earning', code: 'COMISION_VENTAS', amount: 200.00, isActive: true, startDate: new Date('2024-03-01') },
    }),
    prisma.employeeRecurringItem.create({
      data: { employeeId: 7, itemType: 'deduction', code: 'PRESTAMO_PERSONAL', amount: 150.00, isActive: true, startDate: new Date('2024-01-01') },
    }),
    prisma.employeeRecurringItem.create({
      data: { employeeId: 12, itemType: 'deduction', code: 'PRESTAMO_PERSONAL', amount: 100.00, isActive: true, startDate: new Date('2024-07-01') },
    }),
    prisma.employeeRecurringItem.create({
      data: { employeeId: 5, itemType: 'earning', code: 'BONO_ALIMENTACION', amount: 75.00, isActive: true, startDate: new Date('2023-09-01') },
    }),
  ]);

  // ============================================
  // 11. CREATE PAY CALENDARS (Full Year 2026 - All Customers)
  // ============================================
  console.log('Creating pay calendars...');

  const payCalendarData = [];
  let calId = 1;

  const quincenas = [
    { label: 'Quincena 1 - Enero 2026', from: '2026-01-01', to: '2026-01-15', pay: '2026-01-15' },
    { label: 'Quincena 2 - Enero 2026', from: '2026-01-16', to: '2026-01-31', pay: '2026-01-31' },
    { label: 'Quincena 3 - Febrero 2026', from: '2026-02-01', to: '2026-02-15', pay: '2026-02-15' },
    { label: 'Quincena 4 - Febrero 2026', from: '2026-02-16', to: '2026-02-28', pay: '2026-02-28' },
    { label: 'Quincena 5 - Marzo 2026', from: '2026-03-01', to: '2026-03-15', pay: '2026-03-15' },
    { label: 'Quincena 6 - Marzo 2026', from: '2026-03-16', to: '2026-03-31', pay: '2026-03-31' },
    { label: 'Quincena 7 - Abril 2026', from: '2026-04-01', to: '2026-04-15', pay: '2026-04-15' },
    { label: 'Quincena 8 - Abril 2026', from: '2026-04-16', to: '2026-04-30', pay: '2026-04-30' },
    { label: 'Quincena 9 - Mayo 2026', from: '2026-05-01', to: '2026-05-15', pay: '2026-05-15' },
    { label: 'Quincena 10 - Mayo 2026', from: '2026-05-16', to: '2026-05-31', pay: '2026-05-31' },
    { label: 'Quincena 11 - Junio 2026', from: '2026-06-01', to: '2026-06-15', pay: '2026-06-15' },
    { label: 'Quincena 12 - Junio 2026', from: '2026-06-16', to: '2026-06-30', pay: '2026-06-30' },
  ];

  for (const q of quincenas) {
    payCalendarData.push({ id: calId++, customerId: customer1.id, frequency: 'biweekly', payFrom: new Date(q.from), payTo: new Date(q.to), paymentDate: new Date(q.pay), periodLabel: q.label, isActive: true });
    payCalendarData.push({ id: calId++, customerId: customer2.id, frequency: 'biweekly', payFrom: new Date(q.from), payTo: new Date(q.to), paymentDate: new Date(q.pay), periodLabel: q.label, isActive: true });
    payCalendarData.push({ id: calId++, customerId: customer3.id, frequency: 'biweekly', payFrom: new Date(q.from), payTo: new Date(q.to), paymentDate: new Date(q.pay), periodLabel: q.label, isActive: true });
  }

  const mensuales = [
    { label: 'Enero 2026', from: '2026-01-01', to: '2026-01-31', pay: '2026-01-31' },
    { label: 'Febrero 2026', from: '2026-02-01', to: '2026-02-28', pay: '2026-02-28' },
    { label: 'Marzo 2026', from: '2026-03-01', to: '2026-03-31', pay: '2026-03-31' },
    { label: 'Abril 2026', from: '2026-04-01', to: '2026-04-30', pay: '2026-04-30' },
    { label: 'Mayo 2026', from: '2026-05-01', to: '2026-05-31', pay: '2026-05-31' },
    { label: 'Junio 2026', from: '2026-06-01', to: '2026-06-30', pay: '2026-06-30' },
  ];

  for (const m of mensuales) {
    payCalendarData.push({ id: calId++, customerId: customer1.id, frequency: 'monthly', payFrom: new Date(m.from), payTo: new Date(m.to), paymentDate: new Date(m.pay), periodLabel: m.label, isActive: true });
    payCalendarData.push({ id: calId++, customerId: customer2.id, frequency: 'monthly', payFrom: new Date(m.from), payTo: new Date(m.to), paymentDate: new Date(m.pay), periodLabel: m.label, isActive: true });
    payCalendarData.push({ id: calId++, customerId: customer3.id, frequency: 'monthly', payFrom: new Date(m.from), payTo: new Date(m.to), paymentDate: new Date(m.pay), periodLabel: m.label, isActive: true });
  }

  for (const cal of payCalendarData) {
    await prisma.payCalendar.upsert({
      where: { id: cal.id },
      update: {},
      create: cal,
    });
  }

  // ============================================
  // 12. CREATE ISR TAX BRACKETS (Panama 2026 - Art. 694 Codigo Fiscal)
  // ============================================
  console.log('Creating ISR tax brackets...');

  const isrBrackets = [
    { bracketOrder: 1, rangeMin: 0, rangeMax: 11000, rate: 0, fixedAmount: 0 },
    { bracketOrder: 2, rangeMin: 11000.01, rangeMax: 15000, rate: 0.10, fixedAmount: 0 },
    { bracketOrder: 3, rangeMin: 15000.01, rangeMax: 25000, rate: 0.15, fixedAmount: 400 },
    { bracketOrder: 4, rangeMin: 25000.01, rangeMax: 35000, rate: 0.20, fixedAmount: 1900 },
    { bracketOrder: 5, rangeMin: 35000.01, rangeMax: 45000, rate: 0.25, fixedAmount: 3900 },
    { bracketOrder: 6, rangeMin: 45000.01, rangeMax: 60000, rate: 0.30, fixedAmount: 6400 },
    { bracketOrder: 7, rangeMin: 60000.01, rangeMax: 120000, rate: 0.35, fixedAmount: 10900 },
    { bracketOrder: 8, rangeMin: 120000.01, rangeMax: null, rate: 0.40, fixedAmount: 31900 },
  ];

  for (const bracket of isrBrackets) {
    await prisma.isrTaxBracket.upsert({
      where: { id: bracket.bracketOrder },
      update: {},
      create: {
        effectiveFrom: new Date('2026-01-01'),
        effectiveTo: null,
        bracketOrder: bracket.bracketOrder,
        rangeMin: bracket.rangeMin,
        rangeMax: bracket.rangeMax,
        rate: bracket.rate,
        fixedAmount: bracket.fixedAmount,
      },
    });
  }

  // ============================================
  // 13. CREATE ISR SETTINGS (Panama 2026)
  // ============================================
  console.log('Creating ISR settings...');

  await prisma.isrSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      effectiveFrom: new Date('2026-01-01'),
      effectiveTo: null,
      calculationMethod: 'annualized',
      roundingMethod: 'nearest',
      applyCssBeforeIsr: true,
      applySeguroEducativo: true,
    },
  });

  // ============================================
  // 14. CREATE STATUTORY DEDUCTIONS (Panama Legislation 2026)
  // ============================================
  console.log('Creating statutory deductions...');

  const statutoryDeductions = [
    {
      code: 'CSS',
      description: 'Caja de Seguro Social - Aporte del Empleado (9.75%)',
      rate: 0.0975,
      capAmount: 4000,
      employeeRate: 0.0975,
      employerRate: 0.125,
    },
    {
      code: 'SEGURO_EDUCATIVO',
      description: 'Seguro Educativo - Aporte del Empleado (1.5%)',
      rate: 0.015,
      capAmount: null,
      employeeRate: 0.015,
      employerRate: 0.015,
    },
    {
      code: 'CSS_EMPLOYER',
      description: 'Caja de Seguro Social - Aporte Patronal (12.5%)',
      rate: 0.125,
      capAmount: 4000,
      employeeRate: 0,
      employerRate: 0.125,
    },
    {
      code: 'SEGURO_EDUCATIVO_EMPLOYER',
      description: 'Seguro Educativo - Aporte Patronal (1.5%)',
      rate: 0.015,
      capAmount: null,
      employeeRate: 0,
      employerRate: 0.015,
    },
    {
      code: 'RIESGO_PROFESIONAL',
      description: 'Riesgo Profesional - Aporte Patronal (varia por actividad, 1.49% base)',
      rate: 0.0149,
      capAmount: null,
      employeeRate: 0,
      employerRate: 0.0149,
    },
  ];

  for (const sd of statutoryDeductions) {
    await prisma.statutoryDeduction.upsert({
      where: { code: sd.code },
      update: {},
      create: {
        ...sd,
        effectiveFrom: new Date('2026-01-01'),
        effectiveTo: null,
        isActive: true,
      },
    });
  }

  // ============================================
  // 15. CREATE OVERTIME RULES (Panama Labor Code - Arts. 35-37 CT)
  // ============================================
  console.log('Creating overtime rules...');

  const overtimeRules = [
    { id: 1, customerId: null, label: 'Regla Global - Codigo de Trabajo' },
    { id: 2, customerId: customer1.id, label: 'Tech Corp Panama - Regla Estandar' },
    { id: 3, customerId: customer2.id, label: 'Logistics Intl - Regla Estandar' },
    { id: 4, customerId: customer3.id, label: 'Retail Partners - Regla Estandar' },
  ];

  for (const rule of overtimeRules) {
    await prisma.overtimeRule.upsert({
      where: { id: rule.id },
      update: {},
      create: {
        customerId: rule.customerId,
        baseHourDivisor: 240,
        multiplierDiurna: 1.25,
        multiplierNocturna: 1.50,
        multiplierMixta: 1.50,
        multiplierRestday: 1.50,
        multiplierHoliday: 2.00,
        stackMultipliers: false,
        maxHoursPerDay: 3,
        maxHoursPerWeek: 9,
        effectiveFrom: new Date('2026-01-01'),
        effectiveTo: null,
        isActive: true,
      },
    });
  }

  // ============================================
  // 16. CREATE HOLIDAYS (Panama 2026 - Ley 2003)
  // ============================================
  console.log('Creating holidays...');

  const holidays = [
    { holidayDate: '2026-01-01', name: 'Ano Nuevo', isNational: true },
    { holidayDate: '2026-01-09', name: 'Dia de los Martires', isNational: true },
    { holidayDate: '2026-02-16', name: 'Carnaval (Lunes)', isNational: true },
    { holidayDate: '2026-02-17', name: 'Carnaval (Martes)', isNational: true },
    { holidayDate: '2026-03-30', name: 'Viernes Santo', isNational: true },
    { holidayDate: '2026-05-01', name: 'Dia del Trabajador', isNational: true },
    { holidayDate: '2026-11-03', name: 'Separacion de Panama de Colombia', isNational: true },
    { holidayDate: '2026-11-04', name: 'Dia de los Simbolos Patrios', isNational: true },
    { holidayDate: '2026-11-05', name: 'Dia de Colon', isNational: true },
    { holidayDate: '2026-11-10', name: 'Primer Grito de Independencia', isNational: true },
    { holidayDate: '2026-11-28', name: 'Independencia de Panama de Espana', isNational: true },
    { holidayDate: '2026-12-08', name: 'Dia de la Madre', isNational: true },
    { holidayDate: '2026-12-25', name: 'Navidad', isNational: true },
  ];

  for (let i = 0; i < holidays.length; i++) {
    await prisma.holiday.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        holidayDate: new Date(holidays[i].holidayDate),
        name: holidays[i].name,
        isNational: holidays[i].isNational,
      },
    });
  }

  // ============================================
  // 17. CREATE VACATION ACCRUALS (Panama: 30 dias tras 11 meses - Art. 112 CT)
  // ============================================
  console.log('Creating vacation accruals...');

  for (const emp of employees) {
    const monthsWorked = Math.floor((Date.now() - new Date(emp.hireDate!).getTime()) / (30.44 * 24 * 60 * 60 * 1000));
    const earnedDays = monthsWorked >= 11 ? 30 : Math.floor(monthsWorked * (30 / 11));
    const usedDays = Math.min(earnedDays, Math.floor(Math.random() * 5));

    await prisma.vacationAccrual.upsert({
      where: { id: emp.id },
      update: {},
      create: {
        employeeId: emp.id,
        earnedDays: earnedDays,
        usedDays: usedDays,
        balanceDays: earnedDays - usedDays,
        lastUpdated: new Date(),
      },
    });
  }

  // ============================================
  // 18. CREATE 13TH MONTH ACCRUALS (Panama: 3 cuotas - Art. 156 CT modificado)
  // ============================================
  console.log('Creating 13th month accruals...');

  await Promise.all([
    prisma.payrollRun.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        customerId: customer1.id,
        payFrom: new Date('2026-01-01'),
        payTo: new Date('2026-01-31'),
        paymentDate: new Date('2026-02-15'),
        status: 'closed',
        notes: 'Primera cuota del Decimo Tercer Mes - 2025',
      },
    }),
    prisma.payrollRun.upsert({
      where: { id: 2 },
      update: {},
      create: {
        id: 2,
        customerId: customer1.id,
        payFrom: new Date('2026-02-01'),
        payTo: new Date('2026-02-28'),
        paymentDate: new Date('2026-08-15'),
        status: 'draft',
        notes: 'Segunda cuota del Decimo Tercer Mes - pendiente',
      },
    }),
    prisma.payrollRun.upsert({
      where: { id: 3 },
      update: {},
      create: {
        id: 3,
        customerId: customer1.id,
        payFrom: new Date('2026-03-01'),
        payTo: new Date('2026-03-31'),
        paymentDate: new Date('2026-12-15'),
        status: 'draft',
        notes: 'Tercera cuota del Decimo Tercer Mes - pendiente',
      },
    }),
  ]);

  for (const emp of employees) {
    const monthlyXiii = emp.baseSalary / 12;
    await Promise.all([
      prisma.accrual13thMonth.create({
        data: {
          employeeId: emp.id,
          payrollRunId: 1,
          amountAccrued: monthlyXiii,
          periodYear: 2026,
          periodQuarter: 1,
        },
      }),
      prisma.accrual13thMonth.create({
        data: {
          employeeId: emp.id,
          payrollRunId: 2,
          amountAccrued: monthlyXiii,
          periodYear: 2026,
          periodQuarter: 2,
        },
      }),
      prisma.accrual13thMonth.create({
        data: {
          employeeId: emp.id,
          payrollRunId: 3,
          amountAccrued: monthlyXiii,
          periodYear: 2026,
          periodQuarter: 3,
        },
      }),
    ]);
  }

  // ============================================
  // 19. CREATE PAYROLL SUMMARY (for closed run)
  // ============================================
  console.log('Creating payroll summary...');

  let totalGross = 0;
  for (const emp of employees) {
    totalGross += emp.baseSalary;
  }
  const totalCss = Math.min(totalGross, 4000 * employees.length) * 0.0975;
  const totalSeguroEducativo = totalGross * 0.015;
  const totalNet = totalGross - totalCss - totalSeguroEducativo;

  await prisma.payrollSummary.create({
    data: {
      payrollRunId: 1,
      totalGross: totalGross,
      totalDeductions: totalCss + totalSeguroEducativo,
      totalNet: totalNet,
      totalCssEmployer: Math.min(totalGross, 4000 * employees.length) * 0.125,
      totalCssEmployee: totalCss,
      totalIsr: 0,
      totalXiiiMonth: totalGross / 12,
      employeeCount: employees.length,
    },
  });

  // ============================================
  // SUMMARY
  // ============================================
  console.log('');
  console.log('Database seeded successfully!');
  console.log('');
  console.log('Summary:');
  console.log('   - Roles: 5 (superadmin, admin, clerk, dataentry, employee)');
  console.log('   - Customers: 3');
  console.log('   - Users: 2 (admin/admin123, jcastillo/clerk123)');
  console.log('   - Departments: 11 (across 3 customers)');
  console.log('   - Positions: 11 (across 3 customers)');
  console.log('   - Bank Accounts: 4 (across 3 customers)');
  console.log('   - Service Agreements: 3');
  console.log('   - Employees: 20 (Tech Corp Panama S.A.)');
  console.log('   - Employee Contracts: 20 (indefinite term)');
  console.log('   - Recurring Items: 5 (bonuses, commissions, loans)');
  console.log('   - Pay Calendars: 54 (quincenal + mensual x 3 customers)');
  console.log('   - ISR Brackets: 8 (Panama progressive tax, annual)');
  console.log('   - ISR Settings: 1 (annualized calculation)');
  console.log('   - Statutory Deductions: 5 (CSS, Seg. Educativo, CSS Patronal, Seg. Ed. Patronal, Riesgo Prof.)');
  console.log('   - Overtime Rules: 4 (global + 3 customer-specific)');
  console.log('   - Holidays: 13 (Panama 2026 official)');
  console.log('   - Vacation Accruals: 20 (30 days per Art. 112 CT)');
  console.log('   - 13th Month Accruals: 60 (3 cuotas per employee, Art. 156 CT)');
  console.log('   - Payroll Runs: 3 (incl. 1 closed 13th month payment)');
  console.log('   - Payroll Summary: 1');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
