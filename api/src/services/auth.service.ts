import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { ENV } from '../config/env';
import { AppError } from '../utils/app-error';
import { HttpStatus } from '../constants/http-status';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  createdAt?: Date;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}

/**
 * Registers a new recruiter, hashes password, and issues JWT token.
 */
export async function registerRecruiter(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('Email already exists.', HttpStatus.BAD_REQUEST);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: hashedPassword,
    },
  });

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    ENV.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
  };
}

/**
 * Validates recruiter credentials and issues JWT token.
 */
export async function loginRecruiter(
  email: string,
  password: string
): Promise<AuthResponse> {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (!existingUser) {
    throw new AppError('Invalid email or password.', HttpStatus.UNAUTHORIZED);
  }

  const comparePassword = await bcrypt.compare(password, existingUser.passwordHash);
  if (!comparePassword) {
    throw new AppError('Invalid credentials.', HttpStatus.UNAUTHORIZED);
  }

  const token = jwt.sign(
    { userId: existingUser.id, email: existingUser.email },
    ENV.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: { id: existingUser.id, name: existingUser.name, email: existingUser.email, createdAt: existingUser.createdAt },
  };
}

/**
 * Retrieves the recruiter profile by ID.
 */
export async function getRecruiterProfile(userId: string): Promise<UserResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError('User profile not found.', HttpStatus.NOT_FOUND);
  }

  return user;
}

