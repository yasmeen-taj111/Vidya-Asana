import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { adminApi } from '../../api/admin';
import { FloorGrid, TimeSlot, Seat, Booking } from '../../api/types';
import { SeatGrid } from '../../components/SeatGrid/SeatGrid';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useSeatUpdates } from '../../realtime/useSeatUpdates';
import { UserPlus, LogOut, CheckCircle2, Clock, Calendar, User, Armchair, X, Sparkles } from 'lucide-react';

const getCurrentSlot = (slotList: TimeSlot[]) => {
  const now = new Date();
  const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  // 1. Current active ongoing slot
  const active = slotList.find((s) => s.startTime <= curTime && s.endTime > curTime);
  if (active) return active;
  // 2. Next upcoming slot
  const upcoming = slotList.find((s) => s.startTime > curTime);
  if (upcoming) return upcoming;
  // 3. Fallback to first slot
  return slotList[0];
};

export const WalkIn: React.FC = () => {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [grids, setGrids] = useState<FloorGrid[]>([]);
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const { user } = useAuthStore();

  // Action states
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [guestName, setGuestName] = useState('');
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [selectedBookingForRelease, setSelectedBookingForRelease] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);

  const { addToast } = useUiStore();

  const loadData = async () => {
    try {
      const [sData, floors, bData] = await Promise.all([
        adminApi.getSlots(),
        adminApi.getFloors(),
        adminApi.getBookings({ date }),
      ]);
      setSlots(sData);

      const bestSlot = getCurrentSlot(sData);
      const activeSlotId = selectedSlotId || (bestSlot ? bestSlot.id : '');
      if (sData.length > 0 && !selectedSlotId && bestSlot) {
        setSelectedSlotId(bestSlot.id);
      }
      setBookings(bData.bookings);

      if (floors.length > 0) {
        const currentSlot = activeSlotId;
        const loadedGrids = await Promise.all(
          floors.map((f) => adminApi.getFloorGrid(f.id))
        );

        // Update status for each cell based on bookings
        loadedGrids.forEach((g) => {
          g.cells.forEach((cell) => {
            if (cell.type === 'SEAT' && cell.seat) {
              const matched = bData.bookings.find(
                (b) =>
                  b.seat.id === cell.seat?.id &&
                  b.slot.id === currentSlot &&
                  (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN')
              );
              if (matched) {
                cell.status = 'BOOKED';
              } else {
                cell.status = 'AVAILABLE';
              }
            }
          });
        });

        setGrids(loadedGrids);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [date, selectedSlotId]);

  useSeatUpdates(user?.libraryId, () => {
    loadData();
  });

  const handleSeatClick = (seat: Seat) => {
    // Check if booked
    const booked = bookings.find(
      (b) =>
        b.seat.id === seat.id &&
        b.slot.id === selectedSlotId &&
        (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN')
    );

    if (booked) {
      setSelectedBookingForRelease(booked);
      setShowReleaseModal(true);
    } else {
      setSelectedSeat(seat);
      setShowWalkInModal(true);
    }
  };

  const handleConfirmWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat || !selectedSlotId) return;

    setLoading(true);
    try {
      const idempotencyKey = `walkin-${selectedSeat.id}-${Date.now()}`;
      const bk = await adminApi.walkIn(
        {
          seatId: selectedSeat.id,
          slotId: selectedSlotId,
          date,
          guestName: guestName.trim() || undefined,
        },
        idempotencyKey
      );

      addToast({
        type: 'success',
        title: 'Walk-In Created',
        message: `Assigned seat ${bk.seat.label} to ${bk.guestName || 'Walk-in guest'}. Status: CHECKED_IN`,
      });
      setShowWalkInModal(false);
      setGuestName('');
      setSelectedSeat(null);
      loadData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Walk-in Failed',
        message: err.message || 'Could not complete walk-in reservation.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseSeat = async () => {
    if (!selectedBookingForRelease) return;
    setLoading(true);
    try {
      await adminApi.releaseSeat(selectedBookingForRelease.id);
      addToast({
        type: 'info',
        title: 'Seat Released Early',
        message: `Seat ${selectedBookingForRelease.seat.label} has been freed. Waitlisted users notified.`,
      });
      setShowReleaseModal(false);
      setSelectedBookingForRelease(null);
      loadData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Release Failed',
        message: err.message || 'Could not release seat.',
      });
    } finally {
      setLoading(false);
    }
  };

  const currentGrid = grids[activeFloorIndex] || grids[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-teal" /> Walk-In Ticketing & Early Walk-Outs
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Click an available green desk to assign an instant walk-in pass, or click an occupied desk to release it.
          </p>
        </div>

        {/* Date and Slot selection ribbon */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200/70 text-slate-600 font-medium">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200/70 text-slate-600 font-medium">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <select
              value={selectedSlotId}
              onChange={(e) => setSelectedSlotId(e.target.value)}
              className="bg-transparent outline-none font-bold text-primary cursor-pointer"
            >
              {slots.map((s) => {
                const now = new Date();
                const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                const isLive =
                  s.startTime <= curTime &&
                  s.endTime > curTime &&
                  date === format(now, 'yyyy-MM-dd');
                return (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.startTime} - {s.endTime})
                    {isLive ? ' • LIVE NOW' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              const today = format(new Date(), 'yyyy-MM-dd');
              setDate(today);
              const best = getCurrentSlot(slots);
              if (best) setSelectedSlotId(best.id);
              addToast({
                type: 'info',
                title: 'Set to Current Time',
                message: `Updated to current date (${today}) and live session slot.`,
              });
            }}
            className="p-1.5 px-3 rounded-xl bg-teal-light text-teal-dark hover:bg-teal/20 font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
            title="Reset to current local date and live time slot"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Live Now</span>
          </button>
        </div>
      </div>

      {/* Floor switcher */}
      {grids.length > 0 && (
        <div className="flex items-center gap-2">
          {grids.map((g, idx) => (
            <button
              key={g.floorId}
              onClick={() => setActiveFloorIndex(idx)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeFloorIndex === idx
                  ? 'bg-navy text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}

      {/* Interactive Grid */}
      {currentGrid && (
        <SeatGrid
          grid={currentGrid}
          onSelectSeat={handleSeatClick}
          interactive={true}
          allowOccupiedClick={true}
        />
      )}

      {/* Walk-In Assign Dialog */}
      {showWalkInModal && selectedSeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-up space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-900 text-sm">Walk-In Desk Allocation</h3>
              <button onClick={() => setShowWalkInModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Desk:</span>
                <span className="font-bold text-slate-900">{selectedSeat.label} ({selectedSeat.seatType})</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Date:</span>
                <span className="font-semibold text-slate-800">{date}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Session Slot:</span>
                <span className="font-semibold text-primary">
                  {slots.find((s) => s.id === selectedSlotId)?.name}{' '}
                  ({slots.find((s) => s.id === selectedSlotId)?.startTime} – {slots.find((s) => s.id === selectedSlotId)?.endTime})
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmWalkIn} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Guest / Visitor Name (Optional):</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Walk-in student name"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-teal text-white font-bold text-xs hover:bg-teal-dark shadow-sm transition-all"
                >
                  {loading ? 'Confirming...' : 'Confirm Walk-In & Check In'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Early Release / Walk-Out Dialog */}
      {showReleaseModal && selectedBookingForRelease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-up space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <LogOut className="w-5 h-5 text-accent" /> Release Seat Early (Walk-Out)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Student has left desk <span className="font-bold text-slate-900">{selectedBookingForRelease.seat.label}</span> before the scheduled slot conclusion.
              Releasing this seat will instantly flag it as AVAILABLE and notify any learners waiting in queue.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleReleaseSeat}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-xs shadow-md transition-all"
              >
                {loading ? 'Releasing...' : 'Release & Notify Waitlist'}
              </button>
              <button
                onClick={() => setShowReleaseModal(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Keep Reserved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
