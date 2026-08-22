'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const HARDCODED_EMAIL = 'genzydev@gmail.com';
const HARDCODED_PASSWORD = 'Welcome@01';
const SESSION_TOKEN = 'gs_session_token';
const VALID_TOKEN = 'genzy_studio_auth_34635bc';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (email === HARDCODED_EMAIL && password === HARDCODED_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_TOKEN, VALID_TOKEN, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    redirect('/');
  }

  return { error: 'Invalid email or password' };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_TOKEN);
  redirect('/login');
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_TOKEN);
  return token?.value === VALID_TOKEN;
}
