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
            ) : (
              <Link
                href={buildUrl(`${langPrefix}/login`, currentParams())}
                className="flex items-center justify-center text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800"
                title={t('navbar.login', 'Login')}
              >
                <LogIn size={16} />
                <span className="ml-1">{t('navbar.login', 'Login')}</span>
              </Link>
            )}
          </div>
        </div>

        {/* Social Links */}
        <div className="mt-4 flex justify-center items-center gap-4">
          <a href="https://www.facebook.com/profile.php?id=61587473507744" target="_blank" rel="noopener noreferrer" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Facebook">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          </a>
          <a href="https://x.com/roamjet" target="_blank" rel="noopener noreferrer" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" title="X">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="https://www.instagram.com/esim.roamjet/" target="_blank" rel="noopener noreferrer" className="text-gray-500 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors" title="Instagram">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
          </a>
          <a href="https://www.trustpilot.com/review/roamjet.net" target="_blank" rel="noopener noreferrer" className="text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors" title="Trustpilot">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
          </a>
        </div>

        {/* Version */}
        <div className="mt-3 text-center">
          <span className="text-xs text-gray-500 dark:text-gray-400" title="App version">
            v{APP_VERSION}
          </span>
        </div>
      </div>
    </footer>
  );
}