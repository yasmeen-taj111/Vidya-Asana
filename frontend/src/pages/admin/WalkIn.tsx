import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { FloorGrid, TimeSlot, Seat, Booking } from '../../api/types';
import { SeatGrid } from '../../components/SeatGrid/SeatGrid';
import { useUiStore } from '../../store/uiStore';
import { UserPlus, LogOut, CheckCircle2, Clock, User, Armchair, X } from 'lucide-react';

export const WalkIn: React.FC = () => {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [grids, setGrids] = useState<FloorGrid[]>([]);
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);

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
      if (sData.length > 0 && !selectedSlotId) {
        setSelectedSlotId(sData[0].id);
      }
      setBookings(bData.bookings);

      if (floors.length > 0) {
        const currentSlot = selectedSlotId || (sData[0] ? sData[0].id : '');
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
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm text-xs">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="p-1.5 rounded-lg border border-slate-200 outline-none"
          />
          <select
            value={selectedSlotId}
            onChange={(e) => setSelectedSlotId(e.target.value)}
            className="p-1.5 rounded-lg border border-slate-200 outline-none font-semibold text-primary"
          >
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.startTime} - {s.endTime})
              </option>
            ))}
          </select>
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

            <p className="text-xs text-slate-600">
              Allocating <span className="font-bold text-slate-900">{selectedSeat.label}</span> ({selectedSeat.seatType}) for the selected time window.
            </p>

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
