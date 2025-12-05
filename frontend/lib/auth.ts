export async function login(username: string, password: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) throw new Error('Login failed');

  const data = await res.json();
  document.cookie = `auth_token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;
  return data;
}

export function logout() {
  document.cookie = 'auth_token=; path=/; max-age=0';
  window.location.href = '/login';
}

export function getToken() {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(c => c.trim().startsWith('auth_token='));
  return tokenCookie ? tokenCookie.split('=')[1] : null;
}
