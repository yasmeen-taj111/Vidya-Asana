import React from 'react';
import { Booking } from '../api/types';
import { QrCode, Calendar, Clock, MapPin, Download, CheckCircle2 } from 'lucide-react';

interface QRCardProps {
  booking: Booking;
  qrDataUrl?: string;
}

export const QRCard: React.FC<QRCardProps> = ({ booking, qrDataUrl }) => {
  const downloadIcs = () => {
    const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Vidya Asana//Seat Booking//EN
BEGIN:VEVENT
SUMMARY:Library Seat ${booking.seat.label} - ${booking.libraryName}
DESCRIPTION:Reservation Code: ${booking.code}\\nFloor: ${booking.floorLabel}\\nSlot: ${booking.slot.name} (${booking.slot.startTime} - ${booking.slot.endTime})
LOCATION:${booking.libraryName}
DTSTART:${booking.date.replace(/-/g, '')}T${booking.slot.startTime.replace(/:/g, '')}00Z
DTEND:${booking.date.replace(/-/g, '')}T${booking.slot.endTime.replace(/:/g, '')}00Z
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `vidya-asana-${booking.code}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xl max-w-md w-full mx-auto text-center relative overflow-hidden">
      {/* Decorative top header accent */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary via-accent to-teal" />

      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <div className="text-left">
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Booking Pass
          </span>
          <h3 className="font-extrabold text-slate-900 text-lg leading-tight">
            {booking.libraryName}
          </h3>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            booking.status === 'CHECKED_IN'
              ? 'bg-blue-100 text-blue-800'
              : booking.status === 'CONFIRMED'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {booking.status}
        </span>
      </div>

      {/* QR Code Container */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block mb-4 shadow-inner">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="Entry QR Code"
            className="w-48 h-48 mx-auto object-contain rounded-lg"
          />
        ) : (
          <div className="w-48 h-48 flex items-center justify-center text-slate-400">
            <QrCode className="w-24 h-24" />
          </div>
        )}
      </div>

      {/* Human readable booking code */}
      <div className="mb-6">
        <p className="text-xs text-slate-400 font-medium">Reservation Code</p>
        <p className="text-2xl font-mono font-black text-navy tracking-widest mt-0.5">
          {booking.code}
        </p>
      </div>

      {/* Seat & Slot Grid Details */}
      <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-100 text-left text-xs mb-6">
        <div>
          <span className="text-slate-400 block font-medium">Allocated Seat:</span>
          <span className="font-extrabold text-slate-900 text-sm">
            {booking.seat.label} ({booking.seat.seatType})
          </span>
        </div>
        <div>
          <span className="text-slate-400 block font-medium">Floor Level:</span>
          <span className="font-semibold text-slate-800">{booking.floorLabel}</span>
        </div>
        <div>
          <span className="text-slate-400 block font-medium">Date:</span>
          <span className="font-semibold text-slate-800">{booking.date}</span>
        </div>
        <div>
          <span className="text-slate-400 block font-medium">Slot Window:</span>
          <span className="font-semibold text-slate-800">
            {booking.slot.startTime} – {booking.slot.endTime}
          </span>
        </div>
      </div>

      {/* Calendar Export CTA */}
      <button
        onClick={downloadIcs}
        className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
      >
        <Download className="w-4 h-4" />
        Add to Calendar (.ics)
      </button>
    </div>
  );
};
