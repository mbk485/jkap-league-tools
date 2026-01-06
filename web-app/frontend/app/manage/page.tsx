// Admin Panel - MetaCloner
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const API_URL = 'https://metacloner-production.up.railway.app';

interface User {
  id: string;
  email: string;
  credits: number;
  has_subscription: boolean;
  subscription_expires: string | null;
}

function AdminContent() {
  const [password, setPassword] = useState('');
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      setAdminToken(token);
    }
  }, []);

  useEffect(() => {
    if (adminToken) {
      loadUsers();
    }
  }, [adminToken]);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      
      if (!res.ok) throw new Error('Invalid password');
      
      const data = await res.json();
      setAdminToken(data.token);
      localStorage.setItem('admin_token', data.token);
    } catch {
      setError('Invalid admin password');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    if (!adminToken) return;
    setLoading(true);
    
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Admin ${adminToken}` },
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          setAdminToken(null);
          localStorage.removeItem('admin_token');
          return;
        }
        throw new Error('Failed to load users');
      }
      
      const data = await res.json();
      setUsers(data.users);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const addCredits = async (email: string, amount: number) => {
    if (!adminToken) return;
    setError('');
    setSuccess('');
    
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${encodeURIComponent(email)}/add-credits?amount=${amount}`, {
        method: 'POST',
        headers: { Authorization: `Admin ${adminToken}` },
      });
      
      if (!res.ok) throw new Error('Failed to add credits');
      
      const data = await res.json();
      setSuccess(data.message);
      loadUsers();
    } catch {
      setError('Failed to add credits');
    }
  };

  const updateCredits = async (email: string, credits: number) => {
    if (!adminToken) return;
    setError('');
    setSuccess('');
    
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${encodeURIComponent(email)}/credits`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Admin ${adminToken}`,
        },
        body: JSON.stringify({ credits }),
      });
      
      if (!res.ok) throw new Error('Failed to update credits');
      
      const data = await res.json();
      setSuccess(data.message);
      loadUsers();
    } catch {
      setError('Failed to update credits');
    }
  };

  const toggleSubscription = async (email: string, hasSubscription: boolean) => {
    if (!adminToken) return;
    setError('');
    setSuccess('');
    
    try {
      if (hasSubscription) {
        const res = await fetch(`${API_URL}/api/admin/users/${encodeURIComponent(email)}/subscription`, {
          method: 'DELETE',
          headers: { Authorization: `Admin ${adminToken}` },
        });
        if (!res.ok) throw new Error('Failed');
        setSuccess('Subscription removed');
      } else {
        const res = await fetch(`${API_URL}/api/admin/users/${encodeURIComponent(email)}/subscription?days=30`, {
          method: 'POST',
          headers: { Authorization: `Admin ${adminToken}` },
        });
        if (!res.ok) throw new Error('Failed');
        setSuccess('30-day subscription added');
      }
      loadUsers();
    } catch {
      setError('Failed to update subscription');
    }
  };

  const handleLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('admin_token');
    setUsers([]);
  };

  if (!adminToken) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black flex items-center justify-center">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <span className="text-4xl">🔐</span>
            <h1 className="text-2xl font-bold text-white mt-4">Admin Access</h1>
            <p className="text-gray-500 mt-2">Enter admin password to continue</p>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Admin password"
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 mb-4"
          />
          
          <button
            onClick={handleLogin}
            disabled={loading || !password}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-lg"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
          
          <Link href="/" className="block text-center text-gray-500 hover:text-white mt-4 text-sm">
            ← Back to site
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black">
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔐</span>
            <span className="text-white font-bold text-xl">Admin Dashboard</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={loadUsers} className="px-4 py-2 text-gray-400 hover:text-white transition text-sm">
              🔄 Refresh
            </button>
            <button onClick={handleLogout} className="px-4 py-2 text-gray-500 hover:text-white transition text-sm">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
            <div className="text-gray-500 text-sm">Total Users</div>
            <div className="text-3xl font-bold text-white mt-1">{users.length}</div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
            <div className="text-gray-500 text-sm">Active Subscribers</div>
            <div className="text-3xl font-bold text-emerald-400 mt-1">
              {users.filter(u => u.has_subscription).length}
            </div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
            <div className="text-gray-500 text-sm">Total Credits Held</div>
            <div className="text-3xl font-bold text-blue-400 mt-1">
              {users.reduce((sum, u) => sum + u.credits, 0)}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">{error}</div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">{success}</div>
        )}

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700/50">
            <h2 className="text-lg font-semibold text-white">All Users</h2>
          </div>
          
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No users yet</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Email</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Credits</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Subscription</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-700/20">
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{user.email}</div>
                      <div className="text-gray-500 text-xs">{user.id.slice(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => addCredits(user.email, -1)}
                          className="w-8 h-8 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-bold"
                        >
                          -
                        </button>
                        <span className="text-white font-bold text-lg w-12">{user.credits}</span>
                        <button
                          onClick={() => addCredits(user.email, 1)}
                          className="w-8 h-8 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg font-bold"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.has_subscription ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                          ∞ Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-400">
                          None
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            const credits = prompt('Set credits to:', String(user.credits));
                            if (credits !== null) updateCredits(user.email, parseInt(credits) || 0);
                          }}
                          className="px-3 py-1.5 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg"
                        >
                          Set Credits
                        </button>
                        <button
                          onClick={() => toggleSubscription(user.email, user.has_subscription)}
                          className={`px-3 py-1.5 text-xs rounded-lg ${
                            user.has_subscription
                              ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
                          }`}
                        >
                          {user.has_subscription ? 'Remove Sub' : 'Add 30d Sub'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}

export default dynamic(() => Promise.resolve(AdminContent), { ssr: false });
