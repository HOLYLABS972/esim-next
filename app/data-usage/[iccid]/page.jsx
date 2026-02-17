'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

function countryFlag(cc) {
  if (!cc || cc.length !== 2) return '🌍';
  return String.fromCodePoint(...[...cc.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

function formatMb(mb) {
  if (!mb && mb !== 0) return '—';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} ГБ`;
  return `${Math.round(mb)} МБ`;
}

function UsageBar({ used, total }) {
  if (!total) return null;
  const pct = Math.min(100, Math.max(0, (used / total) * 100));
  const remaining = Math.max(0, total - used);
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">Использовано</span>
        <span className="text-white font-medium">{formatMb(used)} / {formatMb(total)}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-center">
        <span className="text-2xl font-bold text-white">{formatMb(remaining)}</span>
        <span className="text-gray-400 ml-1">осталось</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    active: { label: 'Активна', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
    completed: { label: 'Завершена', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    expired: { label: 'Истекла', cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
    pending: { label: 'Ожидает', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  };
  const s = map[status] || { label: status, cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
  return <span className={`px-3 py-1 rounded-full text-xs font-medium border ${s.cls}`}>{s.label}</span>;
}

export default function DataUsagePage() {
  const params = useParams();
  const iccid = params.iccid;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!iccid) return;
    
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/esim/details?iccid=${encodeURIComponent(iccid)}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'eSIM не найдена');
        }
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [iccid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1724] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">Загрузка данных eSIM...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f1724] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-5xl">❌</div>
          <h1 className="text-xl font-bold text-white">eSIM не найдена</h1>
          <p className="text-gray-400">{error}</p>
          <Link href="/" className="inline-block text-blue-400 hover:underline text-sm">← На главную</Link>
        </div>
      </div>
    );
  }

  const { order, usage } = data;
  
  // Calculate usage from Airalo response or DB
  let usedMb = order.dataUsageMb || 0;
  let totalMb = order.dataLimitMb || 0;
  
  if (usage) {
    // Airalo usage format: { total, remaining } in bytes or MB depending on version
    if (usage.total !== undefined && usage.remaining !== undefined) {
      totalMb = typeof usage.total === 'number' && usage.total > 10000 
        ? Math.round(usage.total / (1024 * 1024))  // bytes to MB
        : usage.total;
      const remainingMb = typeof usage.remaining === 'number' && usage.remaining > 10000
        ? Math.round(usage.remaining / (1024 * 1024))
        : usage.remaining;
      usedMb = totalMb - remainingMb;
    }
  }

  // Days remaining
  let daysLeft = null;
  if (order.expiryDate) {
    const diff = new Date(order.expiryDate) - new Date();
    daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="min-h-screen bg-[#0f1724] text-white px-4 py-6">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-5xl">{countryFlag(order.countryCode)}</div>
          <h1 className="text-2xl font-bold">{order.countryName || 'eSIM'}</h1>
          <p className="text-gray-400">{order.planName}</p>
          <StatusBadge status={order.status} />
        </div>

        {/* Data Usage */}
        {totalMb > 0 && (
          <div className="bg-[#1a2332] rounded-2xl p-5 border border-gray-700/50">
            <h2 className="text-sm font-medium text-gray-400 mb-3">📊 Расход трафика</h2>
            <UsageBar used={usedMb} total={totalMb} />
          </div>
        )}

        {/* Days & Info */}
        <div className="grid grid-cols-2 gap-3">
          {daysLeft !== null && (
            <div className="bg-[#1a2332] rounded-2xl p-4 border border-gray-700/50 text-center">
              <div className="text-3xl font-bold text-blue-400">{daysLeft}</div>
              <div className="text-xs text-gray-400 mt-1">дней осталось</div>
            </div>
          )}
          <div className="bg-[#1a2332] rounded-2xl p-4 border border-gray-700/50 text-center">
            <div className="text-3xl font-bold text-green-400">{order.priceRub}₽</div>
            <div className="text-xs text-gray-400 mt-1">оплачено</div>
          </div>
        </div>

        {/* ICCID */}
        <div className="bg-[#1a2332] rounded-2xl p-4 border border-gray-700/50">
          <div className="text-xs text-gray-400 mb-1">ICCID</div>
          <div className="font-mono text-sm text-gray-300 break-all">{order.iccid}</div>
        </div>

        {/* QR Code */}
        {order.qrCodeUrl && (
          <div className="bg-[#1a2332] rounded-2xl p-5 border border-gray-700/50 text-center space-y-3">
            <h2 className="text-sm font-medium text-gray-400">📲 QR-код для установки</h2>
            <div className="bg-white rounded-xl p-3 inline-block">
              <img 
                src={order.qrCodeUrl} 
                alt="QR Code" 
                className="w-48 h-48 object-contain"
              />
            </div>
          </div>
        )}

        {/* Install Button */}
        {order.installUrl && (
          <a
            href={order.installUrl}
            className="block w-full py-4 bg-blue-500 hover:bg-blue-600 text-white text-center font-semibold rounded-2xl transition-colors text-lg"
          >
            📲 Установить eSIM на iPhone
          </a>
        )}

        {/* Manual Install Instructions */}
        {order.qrCodeUrl && (
          <div className="bg-[#1a2332] rounded-2xl p-4 border border-gray-700/50 space-y-2">
            <h3 className="text-sm font-medium text-gray-400">Ручная установка:</h3>
            <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
              <li>Откройте Настройки → Сотовая связь</li>
              <li>Нажмите «Добавить eSIM»</li>
              <li>Отсканируйте QR-код выше</li>
            </ol>
          </div>
        )}

        {/* Top-up Button */}
        {order.status === 'active' && order.iccid && (
          <Link
            href={`/topup?iccid=${order.iccid}&country=${order.countryCode || ''}`}
            className="block w-full py-4 bg-green-600 hover:bg-green-700 text-white text-center font-semibold rounded-2xl transition-colors text-lg"
          >
            🔋 Пополнить трафик
          </Link>
        )}

        {/* Buy New */}
        <Link
          href="/"
          className="block w-full py-3 bg-gray-700 hover:bg-gray-600 text-white text-center font-medium rounded-2xl transition-colors"
        >
          🛒 Купить новую eSIM
        </Link>

        {/* App Install Banner */}
        <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl p-5 border border-blue-500/30 space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-4xl">📱</div>
            <div>
              <h3 className="text-white font-semibold">Приложение Globalbanka</h3>
              <p className="text-gray-400 text-sm">Пополнение, проверка расхода и управление eSIM</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href="https://apps.apple.com/us/app/globalbanka/id6754914283"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              App Store
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.theholylabs.bank"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5v-17c0-.83.52-1.28 1-1.5l10 10-10 10c-.48-.22-1-.67-1-1.5zm15.5-8.5l-2.8-1.5L13 13.2l2.7 2.7 2.8-1.5c.83-.44.83-1.56 0-2.4zm-13.7-9.3L15.5 8.5l-2.3 2.3L4.8 2.7zm0 17.6l8.4-8.1 2.3 2.3-10.7 5.8z"/></svg>
              Google Play
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
