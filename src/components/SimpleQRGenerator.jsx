'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { Download, Copy, Share2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const SimpleQRGenerator = ({ 
  data, 
  title = "QR Code", 
  size = 200, 
  showActions = true,
  className = "" 
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  // Generate QR code from data
  const generateQRCode = useCallback(async (qrData) => {
    if (!qrData) return;
    
    setLoading(true);
    try {
      const url = await QRCode.toDataURL(qrData, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H'
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  }, [size]);

  // Generate QR code when data changes
  useEffect(() => {
    if (data) {
      generateQRCode(data);
    }
  }, [data, size, generateQRCode]);

  // Download QR code as PNG
  const handleDownload = () => {
    if (!qrCodeUrl) return;
    
    try {
      const link = document.createElement('a');
      link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-qr-code.png`;
      link.href = qrCodeUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('QR code downloaded successfully!');
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast.error('Failed to download QR code');
    }
  };

  // Copy QR code data to clipboard
  const handleCopy = () => {
    if (!data) return;
    
    navigator.clipboard.writeText(data).then(() => {
      toast.success('QR code data copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy QR code data');
    });
  };

  // Share QR code
  const handleShare = async () => {
    if (!qrCodeUrl) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: 'Scan this QR code',
          url: qrCodeUrl
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      handleCopy();
    }
  };

  // Regenerate QR code
  const handleRegenerate = () => {
    if (data) {
      generateQRCode(data);
    }
  };

  if (!data) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <p className="text-gray-500">No data provided for QR code generation</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>

      {/* QR Code Display */}
      <div className="flex justify-center mb-4">
        {loading ? (
          <div className={`w-${size/4} h-${size/4} bg-gray-100 border-2 border-gray-300 rounded-lg flex items-center justify-center`}>
            <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : qrCodeUrl ? (
          <Image 
            src={qrCodeUrl} 
            alt={title}
            width={size}
            height={size}
            className="border-2 border-gray-300 rounded-lg"
          />
        ) : (
          <div className={`w-${size/4} h-${size/4} bg-gray-100 border-2 border-gray-300 rounded-lg flex items-center justify-center`}>
            <span className="text-gray-500 text-sm">Failed to generate</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex gap-2 justify-center">
          <button
            onClick={handleDownload}
            disabled={!qrCodeUrl || loading}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
            title="Download QR Code"
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </button>
          
          <button
            onClick={handleCopy}
            disabled={!data}
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
            title="Copy Data"
          >
            <Copy className="w-4 h-4 mr-1" />
            Copy
          </button>
          
          <button
            onClick={handleShare}
            disabled={!qrCodeUrl || loading}
            className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
            title="Share QR Code"
          >
            <Share2 className="w-4 h-4 mr-1" />
            Share
          </button>
          
          <button
            onClick={handleRegenerate}
            disabled={loading}
            className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
            title="Regenerate QR Code"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      )}

      {/* Data Preview */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600 mb-1">QR Code Data:</p>
        <p className="text-sm font-mono text-gray-800 break-all">
          {typeof data === 'string' ? data : JSON.stringify(data)}
        </p>
      </div>
    </div>
  );
};

export default SimpleQRGenerator;
