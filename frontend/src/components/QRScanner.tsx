import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { adminApi } from '../api/admin';
import { Booking } from '../api/types';
import { useUiStore } from '../store/uiStore';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  UserCheck,
  Clock,
  MapPin,
} from 'lucide-react';

export const QRScanner: React.FC = () => {
  const [scanResult, setScanResult] = useState<{
    booking: Booking;
    result: 'CHECKED_IN' | 'ALREADY_CHECKED_IN';
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { addToast } = useUiStore();

  const handleVerify = async (token: string) => {
    if (!token.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setScanResult(null);

    try {
      const data = await adminApi.scanQR(token.trim());
      setScanResult(data);
      if (data.result === 'CHECKED_IN') {
        addToast({
          type: 'success',
          title: 'Check-in Verified!',
          message: `${data.booking.guestName || 'Student'} checked into seat ${data.booking.seat.label}.`,
        });
      } else {
        addToast({
          type: 'warning',
          title: 'Already Checked In',
          message: `This student is already checked in to seat ${data.booking.seat.label}.`,
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired entry token.');
      addToast({
        type: 'error',
        title: 'Check-in Failed',
        message: err.message || 'Verification failed.',
      });
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          stopCamera();
          handleVerify(decodedText);
        },
        () => {
          // scanning frame callback
        }
      );
      setScanning(true);
    } catch (err) {
      console.warn('Camera could not be accessed, using manual input mode.', err);
      setErrorMsg('Camera access unavailable or denied. Please enter the booking code or token below.');
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error(err);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xl text-center">
        <h3 className="text-xl font-bold text-slate-900 mb-1">QR Entry Scanner</h3>
        <p className="text-xs text-slate-500 mb-6">
          Scan user entry QR codes with the camera or enter the reservation code.
        </p>

        {/* Camera Viewport Container */}
        <div className="relative mb-6 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 min-h-[260px] flex items-center justify-center">
          <div id="qr-reader" className="w-full h-full" />

          {!scanning && (
            <div className="p-6 text-center text-slate-400 space-y-3">
              <Camera className="w-12 h-12 mx-auto text-slate-500" />
              <p className="text-xs">Camera preview is currently inactive</p>
              <button
                type="button"
                onClick={startCamera}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-md transition-all inline-flex items-center gap-2"
              >
                <Camera className="w-4 h-4" /> Start Camera
              </button>
            </div>
          )}

          {scanning && (
            <button
              onClick={stopCamera}
              className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md z-20"
            >
              Stop Camera
            </button>
          )}
        </div>

        {/* Manual Input Fallback */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Or Manual Token / Code Search
          </span>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify(manualToken);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="e.g. VA-8F3K2 or qr-va-..."
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none font-mono uppercase font-bold"
            />
            <button
              type="submit"
              disabled={loading || !manualToken.trim()}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <Search className="w-4 h-4" /> Verify
            </button>
          </form>
        </div>
      </div>

      {/* Result Card: Success */}
      {scanResult && (
        <div className="bg-emerald-50 rounded-3xl p-6 border-2 border-emerald-200 shadow-xl text-center animate-scale-up">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-200 text-emerald-900 uppercase">
            {scanResult.result}
          </span>
          <h4 className="text-xl font-black text-emerald-950 mt-2">
            Seat {scanResult.booking.seat.label} Checked In!
          </h4>
          <p className="text-xs text-emerald-800 mt-1">
            {scanResult.booking.floorLabel} • Slot: {scanResult.booking.slot.name} ({scanResult.booking.slot.startTime} - {scanResult.booking.slot.endTime})
          </p>

          <div className="mt-4 p-4 bg-white/80 rounded-2xl border border-emerald-200 text-left text-xs grid grid-cols-2 gap-2 text-slate-700">
            <div>
              <span className="text-slate-400 block font-medium">Guest / Student:</span>
              <span className="font-bold text-slate-900">
                {scanResult.booking.guestName || 'Aarav Patel'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Booking Code:</span>
              <span className="font-mono font-bold text-slate-900">
                {scanResult.booking.code}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Result Card: Error */}
      {errorMsg && (
        <div className="bg-rose-50 rounded-3xl p-6 border-2 border-rose-200 shadow-xl text-center animate-scale-up">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-rose-950">Verification Unsuccessful</h4>
          <p className="text-xs text-rose-700 mt-1">{errorMsg}</p>
        </div>
      )}
    </div>
  );
};
