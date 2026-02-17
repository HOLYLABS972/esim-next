'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function countryFlag(cc) {
  if (!cc || cc.length !== 2) return '🌍';
  return String.fromCodePoint(...[...cc.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

function formatData(planName) {
  if (!planName) return '';
  const match = planName.match(/(\d+)\s*(GB|ГБ|MB|МБ)/i);
  if (match) return `${match[1]} ${match[2].toUpperCase()}`;
  return planName;
}

function StatusDot({ status }) {
  const colors = {
    active: 'bg-green-500',
    completed: 'bg-blue-500',
    expired: 'bg-gray-500',
  };
  return <span className={`w-2 h-2 rounded-full inline-block ${colors[status] || 'bg-gray-500'}`} />;
}

export default function MyEsimsPage() {
  const searchParams = useSearchParams();
  const chatId = searchParams.get('chat_id');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!chatId) {
      setError('Параметр chat_id не указан');
      setLoading(false);
      return;
    }

    fetch(`/api/esim/my-orders?chat_id=${encodeURIComponent(chatId)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOrders(data.orders);
        } else {
          setError(data.error || 'Ошибка загрузки');
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [chatId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1724] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f1724] flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <div className="text-4xl">❌</div>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="min-h-screen bg-[#0f1724] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="text-5xl">📭</div>
          <h1 className="text-xl font-bold text-white">Нет активных eSIM</h1>
          <p className="text-gray-400">Купите eSIM через бот, чтобы увидеть её здесь</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1724] text-white px-4 py-6">
      <div className="max-w-md mx-auto space-y-4">
        
        <h1 className="text-xl font-bold text-center">📱 Мои eSIM</h1>

        {orders.map(order => {
          const daysLeft = order.expiryDate
            ? Math.max(0, Math.ceil((new Date(order.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)))
            : null;

          return (
            <a
              key={order.id}
              href={order.iccid ? `/data-usage/${order.iccid}?theme=dark` : '#'}
              className="block bg-[#1a2332] rounded-2xl p-4 border border-gray-700/50 hover:border-blue-500/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{countryFlag(order.countryCode)}</div>
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      {order.countryName || 'eSIM'}
                      <StatusDot status={order.status} />
                    </div>
                    <div className="text-sm text-gray-400">{formatData(order.planName)}</div>
                  </div>
                </div>
                <div className="text-right">
                  {daysLeft !== null && (
                    <div className="text-sm">
                      <span className="text-blue-400 font-bold">{daysLeft}</span>
                      <span className="text-gray-500 ml-1">дн.</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {order.iccid ? '📊 Подробнее →' : '⏳ Ожидание'}
                  </div>
                </div>
              </div>

              {/* Mini usage bar */}
              {order.dataLimitMb > 0 && (
                <div className="mt-3">
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${Math.min(100, ((order.dataUsageMb || 0) / order.dataLimitMb) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </a>
          );
        })}

        {/* App Banner */}
        <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl p-5 border border-blue-500/30 space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-4xl">📱</div>
            <div>
              <h3 className="text-white font-semibold">Приложение Globalbanka</h3>
              <p className="text-gray-400 text-sm">Пополнение и управление eSIM</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href="https://apps.apple.com/us/app/globalbanka/id6754914283"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              App Store
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.theholylabs.bank"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Google Play
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
