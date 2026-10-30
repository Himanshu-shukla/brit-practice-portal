import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { User } from '@/lib/models';
import { wrap, fail } from '@/lib/http';
import { newToken, cookieName, normalizeRole } from '@/lib/auth';

export const runtime = 'nodejs';

const loginSchema = z.object({
  email: z.string().optional(),
  username: z.string().optional(),
  identifier: z.string().optional(),
  password: z.string().min(1, 'Password is required')
});

export const POST = wrap(async (req: NextRequest) => {
  const body = loginSchema.parse(await req.json());
  const rawId = (body.identifier || body.email || body.username || '').trim();
  if (!rawId) {
    return fail('Please enter your email or username', 400);
  }

  await db();
  const lower = rawId.toLowerCase();
  const escaped = rawId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Find user by either email or username (case-insensitive)
  const user = await User.findOne({
    $or: [
      { email: lower },
      { email: { $regex: new RegExp(`^${escaped}$`, 'i') } },
      { username: { $regex: new RegExp(`^${escaped}$`, 'i') } }
    ]
  });

  if (!user) {
    return fail('Invalid email/username or password', 401);
  }

  if (user.isActive === false) {
    return fail('Account is deactivated. Please contact your instructor or administrator.', 403);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return fail('Account temporarily locked due to multiple failed login attempts. Please try again later.', 429);
  }

  const storedHash = user.password || user.passwordHash;
  if (!storedHash) {
    return fail('Invalid email/username or password', 401);
  }

  const valid = await bcrypt.compare(body.password, storedHash);
  if (!valid) {
    user.failedLogins = (user.failedLogins || 0) + 1;
    if (user.failedLogins >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      user.failedLogins = 0;
    }
    await user.save();
    return fail('Invalid email/username or password', 401);
  }

  user.failedLogins = 0;
  user.lockedUntil = undefined;
  await user.save();

  const role = normalizeRole(user.role);
  const token = await newToken(String(user._id));
  const res = NextResponse.json({
    name: user.name || user.username || 'Learner',
    role,
    email: user.email || user.username || ''
  });

  res.cookies.set(cookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60
  });

  return res;
});
