'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, LogOut, User, ChevronDown, Shield, Wrench } from 'lucide-react';

interface NavLink {
  label: string;
  href: string;
  adminOnly?: boolean;
}

// Full navigation - some items hidden during soft launch for non-admins
const navLinks: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'The Ballyard', href: '/dashboard', adminOnly: true }, // Coming soon for non-admins
  { label: 'League Tools', href: '/tools' },
  { label: 'Free Agents', href: '/free-agents', adminOnly: true }, // Coming soon
  { label: 'Documents', href: '/documents', adminOnly: true }, // Coming soon
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    router.push('/');
  };

  // Filter nav links based on admin status
  const visibleLinks = navLinks.filter((link) => {
    if (!link.adminOnly) return true;
    return user?.isAdmin;
  });

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-jkap-red-500 to-jkap-red-600 flex items-center justify-center shadow-glow-red transition-transform group-hover:scale-105">
              <span className="font-display text-white text-lg">JK</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-display text-xl text-foreground tracking-wide">
                JKAP MEMORIAL
              </span>
              <span className="block text-[10px] text-muted-foreground uppercase tracking-widest -mt-1">
                League
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {visibleLinks.map((link) => {
              const isActive = pathname === link.href || 
                (link.href === '/dashboard' && pathname === '/ballyard') ||
                (link.href === '/tools' && pathname.startsWith('/tools'));
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    relative px-4 py-2 text-sm font-medium rounded-lg transition-colors
                    ${isActive 
                      ? 'text-foreground bg-muted' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }
                  `}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-jkap-red-500 rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side - Auth status */}
          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    user.isAdmin 
                      ? 'bg-gradient-to-br from-amber-500 to-amber-600' 
                      : 'bg-gradient-to-br from-jkap-red-500 to-jkap-red-600'
                  }`}>
                    {user.isAdmin ? (
                      <Shield className="w-4 h-4 text-white" />
                    ) : (
                      <span className="text-xs font-bold text-white">{user.teamAbbreviation}</span>
                    )}
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-medium text-foreground block leading-tight">
                      {user.displayName?.split(' ')[0] || user.username}
                    </span>
                    <span className="text-[10px] text-muted-foreground block leading-tight">
                      {user.isAdmin ? 'Commissioner' : user.teamAbbreviation}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl bg-card border border-border shadow-lg py-2 animate-slide-down">
                    <div className="px-4 py-3 border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          user.isAdmin 
                            ? 'bg-gradient-to-br from-amber-500 to-amber-600' 
                            : 'bg-gradient-to-br from-jkap-red-500 to-jkap-red-600'
                        }`}>
                          {user.isAdmin ? (
                            <Shield className="w-5 h-5 text-white" />
                          ) : (
                            <span className="text-sm font-bold text-white">{user.teamAbbreviation}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{user.displayName}</p>
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                        </div>
                      </div>
                      {!user.isAdmin && (
                        <div className="mt-2 px-2 py-1 rounded bg-muted text-xs text-muted-foreground">
                          {user.teamName}
                        </div>
                      )}
                      {user.isAdmin && (
                        <div className="mt-2 px-2 py-1 rounded bg-amber-500/10 text-xs text-amber-400 flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          League Commissioner
                        </div>
                      )}
                    </div>
                    <Link
                      href="/tools"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Wrench className="w-4 h-4" />
                      League Tools
                    </Link>
                    {user.isAdmin && (
                      <Link
                        href="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <User className="w-4 h-4" />
                        My Dashboard
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-jkap-red-500 hover:bg-muted transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button
                as="link"
                href="/login"
                variant="primary"
                size="sm"
                className="hidden sm:inline-flex"
                icon={<LogIn className="w-4 h-4" />}
              >
                Sign In
              </Button>
            )}

            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-slide-down">
            <div className="flex flex-col gap-1">
              {visibleLinks.map((link) => {
                const isActive = pathname === link.href || 
                  (link.href === '/tools' && pathname.startsWith('/tools'));
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      px-4 py-3 text-sm font-medium rounded-lg transition-colors
                      ${isActive 
                        ? 'text-foreground bg-muted' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }
                    `}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <div className="pt-4 px-4 space-y-2">
                {isAuthenticated && user ? (
                  <>
                    <div className="flex items-center gap-3 py-2 px-2 bg-muted/50 rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        user.isAdmin 
                          ? 'bg-gradient-to-br from-amber-500 to-amber-600' 
                          : 'bg-gradient-to-br from-jkap-red-500 to-jkap-red-600'
                      }`}>
                        {user.isAdmin ? (
                          <Shield className="w-4 h-4 text-white" />
                        ) : (
                          <span className="text-xs font-bold text-white">{user.teamAbbreviation}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{user.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.isAdmin ? 'Commissioner' : user.teamName}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      fullWidth
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      icon={<LogOut className="w-4 h-4" />}
                    >
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-jkap-red-500 text-white font-medium hover:bg-jkap-red-600 transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </header>
  );
}

export default Navbar;
