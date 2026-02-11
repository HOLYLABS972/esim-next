'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Lock, Settings, Users, Share2, LogOut, MapPin, Package, CreditCard, Palette, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { supabase } from '../../src/lib/supabase';

export default function ConfigLayoutClient({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin' | 'customer' | null
  const [checkingAuth, setCheckingAuth] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawStore = searchParams.get('store') || process.env.NEXT_PUBLIC_STORE_ID || 'globalbanka';
  const storeParam = rawStore === 'roamjet' ? 'easycall' : rawStore;

  // Fetch user role from Supabase users table
  const fetchUserRole = async (userId) => {
    if (!supabase || !userId) return null;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      if (!error && data) return data.role || 'customer';
    } catch {}
    return 'customer';
  };

  useEffect(() => {
    if (!supabase) {
      setCheckingAuth(false);
      return;
    }
    let cancelled = false;
    let authSettled = false;
    let timeoutId = null;

    // Wait for INITIAL_SESSION so we don't redirect to login before Supabase has
    // restored the session from storage (fixes reload losing permission).
    const settleAuth = (session) => {
      if (authSettled || cancelled) return;
      authSettled = true;
      if (timeoutId) clearTimeout(timeoutId);
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchUserRole(u.id).then((role) => {
          if (!cancelled) setUserRole(role);
        });
      } else {
        setUserRole(null);
      }
      setCheckingAuth(false);
    };

    timeoutId = setTimeout(() => {
      if (cancelled) return;
      if (authSettled) return;
      authSettled = true;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return;
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          fetchUserRole(u.id).then((role) => {
            if (!cancelled) setUserRole(role);
          });
        } else {
          setUserRole(null);
        }
        setCheckingAuth(false);
      }).catch(() => {
        if (!cancelled) setCheckingAuth(false);
      });
    }, 2500);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'INITIAL_SESSION') {
        settleAuth(session);
        return;
      }
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchUserRole(u.id).then((role) => {
          if (!cancelled) setUserRole(role);
        });
      } else {
        setUserRole(null);
      }
    });

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, []);

  // Normalize URL: replace store=roamjet with store=easycall so the bar and links use easycall
  useEffect(() => {
    if (rawStore === 'roamjet') {
      router.replace(pathname + '?store=easycall', { scroll: false });
    }
  }, [rawStore, pathname, router]);

  useEffect(() => {
    if (user && pathname === '/config') {
      const store = searchParams.get('store');
      const qs = store ? `?store=${encodeURIComponent(store === 'roamjet' ? 'easycall' : store)}` : '';
      router.replace(`/config/affiliates${qs}`);
    }
  }, [user, pathname, router, searchParams]);

  const handleLogout = async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
      setUser(null);
      toast.success('Logged out successfully');
      router.push('/config');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!supabase) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4 transition-colors">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-8 text-center">
          <p className="text-red-600 dark:text-red-400">Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.</p>
        </div>
      </div>
    );
  }

  // Show loading while redirecting from /config to /config/affiliates
  if (user && pathname === '/config') {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated: redirect to main login page with return URL so user comes back to config after login
  if (!user) {
    const returnPath = pathname + (storeParam ? `?store=${encodeURIComponent(storeParam)}` : '');
    if (typeof window !== 'undefined') {
      window.location.replace(`/login?returnUrl=${encodeURIComponent(returnPath)}`);
    }
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Block non-admin users
  if (user && userRole !== null && userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4 transition-colors">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">You do not have admin privileges to access this panel.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Go to Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Still loading role after auth
  if (user && userRole === null) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Logged-in: nav tabs (Users, Coupons, Countries, Plans, Payment)
  // Include store param in nav links so Payment config stays scoped to that store
  const navBase = (path) => (storeParam ? `${path}?store=${encodeURIComponent(storeParam)}` : path);
  const navItems = [
    { href: navBase('/config/site'), icon: Palette, label: 'Site' },
    { href: navBase('/config/users'), icon: Users, label: 'Users' },
    { href: navBase('/config/orders'), icon: ShoppingBag, label: 'Orders' },
    { href: navBase('/config/affiliates'), icon: Share2, label: 'Affiliates' },
    { href: navBase('/config/countries'), icon: MapPin, label: 'Countries' },
    { href: navBase('/config/plans'), icon: Package, label: 'Plans' },
    { href: navBase('/config/payment'), icon: CreditCard, label: 'Payment' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>

        <nav className="border-b border-gray-200 dark:border-gray-700 mb-8">
          <div className="-mb-px flex flex-wrap gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const baseHref = item.href.split('?')[0];
              const isActive = pathname === baseHref || pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="config-content">
          {children}
        </div>
      </div>
    </div>
  );
}
