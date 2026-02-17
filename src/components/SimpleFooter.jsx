'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, LogIn, Mail } from 'lucide-react';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

function buildUrl(pathname, params) {
  const qs = new URLSearchParams(params).toString();
  return pathname + (qs ? `?${qs}` : '');
}

export default function SimpleFooter() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { currentUser, logout } = useAuth();

  const langMatch = pathname.match(/^\/(ar|de|es|fr|he|ru)(?:\/|$)/);
  const langPrefix = langMatch ? `/${langMatch[1]}` : '';

  const currentParams = () => {
    const p = {};
    searchParams.forEach((v, k) => { p[k] = v; });
    return p;
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <footer className="bg-gray-100 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700/50 mt-auto transition-colors">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-center items-center gap-4">
          {/* User info and Login/Logout */}
          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <Link
                  href={buildUrl(`${langPrefix}/dashboard`, currentParams())}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                  title={t('navbar.dashboard', 'Dashboard')}
                >
                  <Mail size={16} />
                  <span>{currentUser.email}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800"
                  title={t('navbar.logout', 'Logout')}
                >
                  <LogOut size={16} />
                  <span className="ml-1">{t('navbar.logout', 'Logout')}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Version */}
        <div className="mt-4 text-center">
          <span className="text-xs text-gray-500 dark:text-gray-400" title="App version">
            v{APP_VERSION}
          </span>
        </div>
      </div>
    </footer>
  );
}