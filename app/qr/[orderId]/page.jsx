'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Smartphone, QrCode, Loader2, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function PublicQRCodePage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrData, setQrData] = useState(null);

  useEffect(() => {
    const fetchQRCode = async () => {
      if (!orderId) {
        setError('Order ID not found');
        setLoading(false);
        return;
      }

      try {
        console.log('📡 Fetching QR code for orderId:', orderId);

        const response = await fetch('/api/public/qr-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ orderId }),
        });

        const data = await response.json();
        console.log('📡 QR Code API response:', data);

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to fetch QR code');
        }

        setQrData(data);
      } catch (err) {
        console.error('❌ Error fetching QR code:', err);
        setError(err.message || 'Failed to load QR code');
      } finally {
        setLoading(false);
      }
    };

    fetchQRCode();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-300 text-lg">Загрузка вашего eSIM...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3">Ошибка</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
          >
            Перейти в Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Установить eSIM</h1>
            <p className="text-gray-400 text-sm">Заказ #{orderId}</p>
          </div>

          {/* Country Info */}
          {qrData?.countryName && (
            <div className="bg-gray-700/30 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-400 mb-1">Страна</p>
              <p className="text-white font-medium">{qrData.countryName}</p>
            </div>
          )}

          {/* ICCID */}
          {qrData?.iccid && (
            <div className="bg-gray-700/30 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-400 mb-1">ICCID</p>
              <p className="text-white font-mono text-sm break-all">{qrData.iccid}</p>
            </div>
          )}

          {/* Installation Button */}
          {qrData?.directAppleInstallationUrl ? (
            <div className="mb-6">
              <a
                href={qrData.directAppleInstallationUrl}
                className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-3 text-lg shadow-lg transition-colors"
              >
                <Smartphone className="w-6 h-6" />
                Открыть установку eSIM
              </a>
              <p className="text-xs text-gray-400 text-center mt-3">
                Откроется в настройках сотовой связи
              </p>
            </div>
          ) : qrData?.lpa || qrData?.qrCode ? (
            <div className="mb-6">
              <div className="bg-white p-4 rounded-xl mb-4">
                <div className="flex items-center justify-center">
                  <QRCodeSVG
                    value={qrData.lpa || qrData.qrCode}
                    size={256}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center">
                Отсканируйте этот QR-код в настройках вашего устройства
              </p>
            </div>
          ) : (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-red-400 mx-auto mb-2" />
              <p className="text-red-300 text-sm text-center">
                QR код временно недоступен. Пожалуйста, попробуйте позже или свяжитесь с поддержкой.
              </p>
            </div>
          )}

          {/* LPA Code (for manual entry) */}
          {(qrData?.lpa || qrData?.qrCode) && (
            <div className="bg-gray-700/30 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-400 mb-2">Код активации (для ручного ввода)</p>
              <div className="bg-gray-900/50 rounded px-3 py-2 border border-gray-600">
                <p className="text-white text-xs font-mono break-all">
                  {qrData.lpa || qrData.qrCode}
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrData.lpa || qrData.qrCode);
                  alert('Код скопирован в буфер обмена');
                }}
                className="w-full mt-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors"
              >
                Скопировать код
              </button>
            </div>
          )}

          {/* Dashboard Link */}
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
          >
            Перейти в Dashboard
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-3">Как установить eSIM</h3>
          <ol className="space-y-2 text-gray-300 text-sm">
            <li className="flex gap-2">
              <span className="text-blue-400 font-bold">1.</span>
              <span>Откройте Настройки → Сотовая связь → Добавить eSIM</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400 font-bold">2.</span>
              <span>Нажмите кнопку "Открыть установку eSIM" выше или отсканируйте QR-код</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400 font-bold">3.</span>
              <span>Следуйте инструкциям на экране для завершения установки</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
