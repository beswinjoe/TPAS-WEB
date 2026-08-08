'use server';

import { cookies } from 'next/headers';

export async function setSessionCookie(memberId: string) {
  const cookieStore = await cookies();
  cookieStore.set('tpas_member_id', memberId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('tpas_member_id');
}
