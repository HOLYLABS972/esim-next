'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, LogOut, LayoutDashboard, HelpCircle, Shield, FileText } from 'lucide-react';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);

  const handleLogout = () => {
    setDrawerOpen(false);
    logout();
    router.push('/');
  };

  // Close drawer on outside click
  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        setDrawerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [drawerOpen]);

  return (
    <>
      <nav className="bg-gray-900/90 backdrop-blur-md  sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <img src="/images/logo.png" alt="Глобалбанка" className="w-8 h-8 rounded-lg" onError={(e) => { e.target.style.display = 'none'; }} />
              <span className="text-white font-bold text-lg">Связь за границей</span>
            </Link>

            {/* Hamburger */}
            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              {drawerOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setDrawerOpen(false)} />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full w-72 bg-gray-900 border-l border-gray-700/50 z-50 transform transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-6 pt-16 space-y-2">
          {currentUser ? (
            <>
              <div className="px-3 py-2 mb-4 text-sm text-gray-400 truncate  pb-4">
                {currentUser.email}
              </div>
              <DrawerLink icon={<LayoutDashboard className="w-5 h-5" />} label="Мои eSIM" onClick={() => { setDrawerOpen(false); router.push('/dashboard'); }} />
              <DrawerLink icon={<HelpCircle className="w-5 h-5" />} label="FAQ" onClick={() => { setDrawerOpen(false); router.push('/faq'); }} />
              <DrawerLink icon={<Shield className="w-5 h-5" />} label="Условия" onClick={() => { setDrawerOpen(false); router.push('/terms-of-service'); }} />
              <DrawerLink icon={<FileText className="w-5 h-5" />} label="Конфиденциальность" onClick={() => { setDrawerOpen(false); router.push('/privacy-policy'); }} />
              <div className="pt-4 border-t border-gray-700/50 mt-4">
                <DrawerLink icon={<LogOut className="w-5 h-5 text-red-400" />} label="Выйти" onClick={handleLogout} className="text-red-400 hover:bg-red-900/20" />
              </div>
            </>
          ) : (
            <>
              <DrawerLink icon={<HelpCircle className="w-5 h-5" />} label="FAQ" onClick={() => { setDrawerOpen(false); router.push('/faq'); }} />
              <DrawerLink icon={<Shield className="w-5 h-5" />} label="Условия" onClick={() => { setDrawerOpen(false); router.push('/terms-of-service'); }} />
            </>
          )}
        </div>
      </div>
    </>
  );
};

function DrawerLink({ icon, label, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors ${className}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default Navbar;
