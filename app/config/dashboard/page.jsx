'use client';

import Link from 'next/link';
import {
  Settings,
  Users,
  ShoppingBag,
  Share2,
  MapPin,
  Package,
  Lock,
  ArrowRight,
} from 'lucide-react';

const cards = [
  { href: '/config/settings', icon: Settings, label: 'Settings', desc: 'Authentication, API keys, payment & pricing' },
  { href: '/config/users', icon: Users, label: 'Users', desc: 'Manage users, roles and status' },
  { href: '/config/orders', icon: ShoppingBag, label: 'Orders', desc: 'View and manage orders' },
  { href: '/config/affiliates', icon: Share2, label: 'Affiliates', desc: 'Affiliate links and stats' },
  { href: '/config/countries', icon: MapPin, label: 'Countries', desc: 'Sync and manage countries' },
  { href: '/config/plans', icon: Package, label: 'Plans', desc: 'Sync and manage eSIM plans' },
  { href: '/config/admin', icon: Lock, label: 'Admin', desc: 'Change password and admin options' },
];

export default function ConfigDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">Choose an area to manage</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ href, icon: Icon, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="block p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                <Icon className="w-6 h-6" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="mt-4 font-semibold text-gray-900">{label}</h3>
            <p className="mt-1 text-sm text-gray-500">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
