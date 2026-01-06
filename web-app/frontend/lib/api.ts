const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://metacloner-production.up.railway.app';

// Token management
export const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
};

export const setToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
};

export const removeToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
};

// API helpers
const authHeaders = (): Record<string, string> => {
  const token = getToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

// Auth API
export const register = async (email: string, password: string) => {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Registration failed');
  }
  
  const data = await res.json();
  setToken(data.access_token);
  return data;
};

export const login = async (email: string, password: string) => {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Login failed');
  }
  
  const data = await res.json();
  setToken(data.access_token);
  return data;
};

export const getCurrentUser = async () => {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: authHeaders(),
  });
  
  if (!res.ok) {
    throw new Error('Not authenticated');
  }
  
  return res.json();
};

export const logout = () => {
  removeToken();
};

// Credits API
export const getCredits = async () => {
  const res = await fetch(`${API_URL}/api/credits`, {
    headers: authHeaders(),
  });
  
  if (!res.ok) {
    throw new Error('Failed to get credits');
  }
  
  return res.json();
};

// Payment API
export const createCheckout = async (plan: string) => {
  const res = await fetch(`${API_URL}/api/payments/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ plan }),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to create checkout');
  }
  
  return res.json();
};

// For testing - add free credits
export const addTestCredits = async (credits: number = 10) => {
  const res = await fetch(`${API_URL}/api/payments/add-credits?credits=${credits}`, {
    method: 'POST',
    headers: authHeaders(),
  });
  
  if (!res.ok) {
    throw new Error('Failed to add credits');
  }
  
  return res.json();
};

// File Processing API (images and videos)
export const processFile = async (file: File): Promise<Blob> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch(`${API_URL}/api/process/file`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to process file');
  }
  
  return res.blob();
};

// Legacy - keep for backwards compatibility
export const processImage = processFile;
// force rebuild
