'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingBag, Loader2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ConfigUserOrdersPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState(null);

  const loadOrders = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const q = userId.includes('@') ? `email=${encodeURIComponent(userId)}` : `userId=${encodeURIComponent(userId)}`;
      const response = await fetch(`/api/users/orders?${q}`);
      const data = await response.json();
      if (data.success) {
        setOrders(data.orders || []);
        setUserEmail(data.orders?.[0]?.customerEmail || userId);
      } else {
        toast.error(data.error || 'Failed to load orders');
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/config/users"
          className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
          title="Back to Users"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <ShoppingBag size={24} />
            Orders for user {userId.includes('@') ? userId : `#${userId}`}
          </h2>
          {userEmail && userEmail !== userId && (
            <p className="text-sm text-gray-500">{userEmail}</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-500">
            <Loader2 className="animate-spin" size={24} />
            <span>Loading orders...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-gray-500">No orders found for this user.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => {
                  const id = order.orderId || order.id || order._id;
                  return (
                    <tr key={id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{String(id)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          order.status === 'completed' || order.status === 'paid' ? 'bg-green-100 text-green-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(order.createdAt || order.created_at)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {id && (
                          <Link
                            href={`/dashboard/qr-code/${id}`}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            View QR
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
