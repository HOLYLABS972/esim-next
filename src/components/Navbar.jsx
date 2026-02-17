'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { Mail, LogOut } from 'lucide-react';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTelegram = searchParams.get('source') === 'telegram';
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
    router.push('/login');
  };

  return (
    <nav className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-blue-400 rounded-lg flex items-center justify-center group-hover:bg-blue-500 transition-colors">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <span className="text-gray-900 dark:text-white font-bold text-xl">SIM</span>
          </Link>

          {/* Right side - User info and Logout */}
          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-3 relative">
                {/* Email */}
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-800/70 rounded-lg border border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-700/70 transition-colors cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-300 text-sm">{currentUser.email}</span>
                </button>
                
                {/* Logout button */}
                <button
                  onClick={handleLogout}
                  className="p-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 hover:border-red-600/50 rounded-lg transition-colors group"
                  title={locale === 'ru' ? 'Выйти' : 'Log out'}
                >
                  <LogOut className="w-5 h-5 text-red-400 group-hover:text-red-300" />
                </button>
              </div>
            ) : !isTelegram ? (
              <Link
                href="/login"
                className="flex items-center gap-2 px-6 py-2 bg-blue-400 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
              >
                <Mail className="w-4 h-4" />
                {locale === 'ru' ? 'Войти' : 'Log in'}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
