import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { librariesApi } from '../../api/libraries';
import { bookingsApi } from '../../api/bookings';
import { waitlistApi } from '../../api/waitlist';
import {
  Library,
  TimeSlot,
  FloorGrid,
  Seat,
  SeatSuggestion,
  Booking,
} from '../../api/types';
import { SeatGrid } from '../../components/SeatGrid/SeatGrid';
import { ConflictModal } from '../../components/ConflictModal';
import { QRCard } from '../../components/QRCard';
import { useSeatUpdates } from '../../realtime/useSeatUpdates';
import { useUiStore } from '../../store/uiStore';
import { ApiError } from '../../api/client';
import {
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  CreditCard,
  Building,
  MapPin,
  Check,
} from 'lucide-react';
import { addDays, format } from 'date-fns';

export const Book: React.FC = () => {
  const { libraryId } = useParams<{ libraryId: string }>();
  const navigate = useNavigate();
  const { addToast } = useUiStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [library, setLibrary] = useState<Library | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [floors, setFloors] = useState<{ id: string; floorNumber: number; label: string }[]>([]);
  const [grids, setGrids] = useState<Record<string, FloorGrid>>({});
  const [activeFloorId, setActiveFloorId] = useState<string>('');

  // Selections
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [suggestions, setSuggestions] = useState<SeatSuggestion[]>([]);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);

  // Conflict modal states
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictAlternatives, setConflictAlternatives] = useState<SeatSuggestion[]>([]);
  const [conflictingBookingId, setConflictingBookingId] = useState<string | undefined>();

  // Confirmed booking state
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [loadingGrid, setLoadingGrid] = useState(false);

  // Available dates: Next 14 days per PRD
  const availableDates = Array.from({ length: 14 }).map((_, i) =>
    format(addDays(new Date(), i), 'yyyy-MM-dd')
  );

  // Load library metadata, slots, floors
  useEffect(() => {
    if (!libraryId) return;

    Promise.all([
      librariesApi.getLibrary(libraryId),
      librariesApi.getSlots(libraryId),
      librariesApi.getFloors(libraryId),
    ])
      .then(([lib, slotList, floorList]) => {
        setLibrary(lib);
        setSlots(slotList);
        if (slotList.length > 0) setSelectedSlot(slotList[0]);
        setFloors(floorList);
        if (floorList.length > 0) setActiveFloorId(floorList[0].id);
      })
      .catch((err) => console.error(err));
  }, [libraryId]);

  // Load user's existing bookings to prevent surprising overlap conflicts
  useEffect(() => {
    bookingsApi
      .getMyBookings({ upcoming: true })
      .then((res) => {
        setUserBookings(res.bookings || []);
      })
      .catch((err) => {
        console.warn('[Book] Could not load upcoming bookings:', err);
      });
  }, []);

  const getSlotReservation = (slotId: string) => {
    return userBookings.find(
      (b) =>
        b.slot.id === slotId &&
        b.date === selectedDate &&
        (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN')
    );
  };

  // Load grid and suggestions when date or slot changes (decoupled so suggestions never block grid)
  const loadFloorGridAndSuggestions = async () => {
    if (!libraryId || !activeFloorId || !selectedSlot) return;

    setLoadingGrid(true);
    try {
      const gridData = await librariesApi.getFloorGrid(
        libraryId,
        activeFloorId,
        selectedDate,
        selectedSlot.id
      );
      setGrids((prev) => ({ ...prev, [activeFloorId]: gridData }));
    } catch (err) {
      console.error('[Book] Error loading floor grid:', err);
    }

    try {
      const sugData = await librariesApi.suggestSeats(libraryId, {
        date: selectedDate,
        slotId: selectedSlot.id,
        preferences: {},
      });
      setSuggestions(sugData);
    } catch (err) {
      console.warn('[Book] Non-fatal suggestion error:', err);
      setSuggestions([]);
    } finally {
      setLoadingGrid(false);
    }
  };

  useEffect(() => {
    if (step >= 2) {
      loadFloorGridAndSuggestions();
    }
  }, [step, selectedDate, selectedSlot?.id, activeFloorId]);

  // Real-time seat updates
  useSeatUpdates(libraryId, (update) => {
    if (update.date === selectedDate && update.slotId === selectedSlot?.id) {
      setGrids((prev) => {
        const currentGrid = prev[activeFloorId];
        if (!currentGrid) return prev;
        const updatedCells = currentGrid.cells.map((cell) => {
          if (cell.type === 'SEAT' && cell.seat?.id === update.seatId) {
            return { ...cell, status: update.status };
          }
          return cell;
        });
        return {
          ...prev,
          [activeFloorId]: { ...currentGrid, cells: updatedCells },
        };
      });
    }
  });

  const handleSelectSeat = (seat: Seat) => {
    setSelectedSeat(seat);
  };

  const handleConfirmReservation = async () => {
    if (!libraryId || !selectedSeat || !selectedSlot) return;

    setSubmitting(true);
    try {
      const idempotencyKey = `bk-${selectedSeat.id}-${selectedDate}-${selectedSlot.id}-${Date.now()}`;
      const booking = await bookingsApi.createBooking(
        {
          libraryId,
          seatId: selectedSeat.id,
          slotId: selectedSlot.id,
          date: selectedDate,
        },
        idempotencyKey
      );

      setConfirmedBooking(booking);
      setUserBookings((prev) => [...prev, booking]);

      // Fetch QR token / code safely without blocking confirmation
      try {
        const qrInfo = await bookingsApi.getBookingQR(booking.id);
        setQrDataUrl(qrInfo.qrDataUrl);
      } catch (qrErr) {
        console.warn('[Book] Non-fatal QR preview error:', qrErr);
      }

      setStep(4); // Success step
      addToast({
        type: 'success',
        title: 'Booking Confirmed!',
        message: `Seat ${booking.seat.label} reserved for ${booking.slot.name} slot.`,
      });
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.code === 'SEAT_UNAVAILABLE') {
          setConflictAlternatives(err.details?.alternatives || []);
          setConflictingBookingId(undefined);
          setShowConflictModal(true);
        } else if (err.code === 'OVERLAPPING_BOOKING') {
          setConflictingBookingId(err.details?.conflictingBookingId);
          setConflictAlternatives([]);
          setShowConflictModal(true);
        } else {
          addToast({
            type: 'error',
            title: 'Reservation Failed',
            message: err.message,
          });
        }
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          message: 'An unexpected error occurred.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!selectedSeat || !selectedSlot) return;
    try {
      await waitlistApi.joinWaitlist({
        seatId: selectedSeat.id,
        slotId: selectedSlot.id,
        date: selectedDate,
      });
      addToast({
        type: 'success',
        title: 'Added to Waitlist',
        message: `You are in the queue for seat ${selectedSeat.label}. You'll be notified if freed.`,
      });
      setShowConflictModal(false);
      navigate('/app/waitlist');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Waitlist Error',
        message: err.message || 'Could not join waitlist.',
      });
    }
  };

  const currentGrid = grids[activeFloorId];

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      {library && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Step {step} of 4 • Reservation Stepper
            </span>
            <h1 className="text-2xl font-black text-slate-900">{library.name}</h1>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" /> {library.address}, {library.city}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                library.isFree ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
              }`}
            >
              {library.isFree ? 'Free Admission' : 'Paid Admission'}
            </span>
          </div>
        </div>
      )}

      {/* Step 1: Choose Date & Time Slot */}
      {step === 1 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xl space-y-8 animate-fade-in">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> 1. Select Study Date (Next 14 Days)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Select any upcoming calendar date within the active two-week scheduling window.
            </p>

            <div className="flex gap-2.5 overflow-x-auto py-3 mt-2">
              {availableDates.map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setSelectedDate(d);
                    setSelectedSeat(null);
                  }}
                  className={`p-3 rounded-2xl border text-center min-w-[5.5rem] transition-all flex flex-col items-center justify-center ${
                    selectedDate === d
                      ? 'border-primary bg-primary text-white shadow-md shadow-primary/25 font-bold scale-105'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider opacity-80">
                    {format(new Date(d), 'EEE')}
                  </span>
                  <span className="text-base font-extrabold my-0.5">
                    {format(new Date(d), 'd')}
                  </span>
                  <span className="text-[10px] uppercase opacity-80">
                    {format(new Date(d), 'MMM')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> 2. Choose Time Slot
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Select your preferred study session block.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              {slots.map((s) => {
                const isSelected = selectedSlot?.id === s.id;
                const existingRes = getSlotReservation(s.id);

                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedSlot(s);
                      setSelectedSeat(null);
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-3 relative ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-2 ring-primary shadow-sm font-semibold'
                        : existingRes
                        ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50 text-slate-700'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{s.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100">
                        {s.isFree ? 'Free' : `₹${(s.pricePaise / 100).toFixed(0)}`}
                      </span>
                    </div>
                    <div className="text-base font-black text-navy font-mono">
                      {s.startTime} – {s.endTime}
                    </div>
                    {existingRes && (
                      <div className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3 text-amber-600" /> Reserved ({existingRes.seat.label})
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedSlot && getSlotReservation(selectedSlot.id) && (
              <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    You already have desk{' '}
                    <strong>{getSlotReservation(selectedSlot.id)?.seat.label}</strong> reserved for the{' '}
                    {selectedSlot.name} slot on {selectedDate}.
                  </span>
                </div>
                <button
                  onClick={() => navigate('/app/bookings')}
                  className="text-xs font-bold text-amber-800 underline hover:text-amber-900 shrink-0"
                >
                  View My Bookings
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(2)}
              disabled={!selectedSlot || Boolean(getSlotReservation(selectedSlot?.id || ''))}
              className="px-8 py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-lg shadow-primary/25 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Continue to Seat Selection</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Suggested Seats + Interactive Floor Grid */}
      {step === 2 && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Recommendations Strip */}
          {suggestions.length > 0 && (
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-accent" /> Recommended Best Desks for You
                </span>
                <span className="text-[11px] text-slate-400">Ranked by algorithm</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {suggestions.map((sug) => {
                  const isPicked = selectedSeat?.id === sug.seat.id;
                  return (
                    <button
                      key={sug.seat.id}
                      onClick={() => handleSelectSeat(sug.seat)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                        isPicked
                          ? 'border-primary bg-primary text-white shadow-md scale-102'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm">{sug.seat.label}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isPicked ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {sug.score}% Score
                        </span>
                      </div>
                      <div className="text-[11px] opacity-80 leading-tight">
                        {sug.reasons.join(' • ')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Floor tabs */}
          {floors.length > 0 && (
            <div className="flex items-center gap-2">
              {floors.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFloorId(f.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeFloorId === f.id
                      ? 'bg-navy text-white shadow-md'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Interactive Seat Grid */}
          {loadingGrid ? (
            <div className="p-16 text-center text-slate-400 text-xs bg-white rounded-3xl border border-slate-100">
              Loading interactive seat layout...
            </div>
          ) : currentGrid ? (
            <SeatGrid
              grid={currentGrid}
              selectedSeatId={selectedSeat?.id}
              onSelectSeat={handleSelectSeat}
              interactive={true}
            />
          ) : null}

          {/* Stepper bottom navigation bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-md flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Change Date/Slot
            </button>

            <div className="flex items-center gap-4">
              {selectedSeat && (
                <span className="text-xs font-bold text-slate-900 hidden sm:inline">
                  Selected: <span className="text-primary">{selectedSeat.label}</span> ({selectedSeat.seatType})
                </span>
              )}
              <button
                disabled={!selectedSeat}
                onClick={() => setStep(3)}
                className="px-8 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>Proceed to Summary</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Reservation Summary & Mock Payment */}
      {step === 3 && selectedSeat && selectedSlot && (
        <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xl space-y-6 animate-fade-in">
          <div className="border-b pb-4">
            <h3 className="text-lg font-bold text-slate-900">Confirm Reservation</h3>
            <p className="text-xs text-slate-500">Please review your booking details before confirmation</p>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Library:</span>
              <span className="font-bold text-slate-900">{library?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Desk Label:</span>
              <span className="font-black text-primary text-sm">{selectedSeat.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Desk Category:</span>
              <span className="font-semibold text-slate-800">{selectedSeat.seatType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Date:</span>
              <span className="font-semibold text-slate-800">{selectedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Time Window:</span>
              <span className="font-semibold text-slate-800">
                {selectedSlot.name} ({selectedSlot.startTime} – {selectedSlot.endTime})
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t font-bold text-sm">
              <span className="text-slate-700">Total Due:</span>
              <span className="text-navy font-mono">
                {selectedSlot.isFree ? 'FREE' : `₹${(selectedSlot.pricePaise / 100).toFixed(0)}`}
              </span>
            </div>
          </div>

          {!selectedSlot.isFree && (
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 text-xs text-primary flex items-center gap-2">
              <CreditCard className="w-4 h-4 shrink-0" />
              <span>Mock payment gateway: reservation will be approved instantly with mock PAID status.</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep(2)}
              className="py-3 px-5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleConfirmReservation}
              disabled={submitting}
              className="flex-1 py-3 px-6 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? 'Confirming Reservation...' : 'Complete & Generate QR Pass'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Success Screen with QR Pass */}
      {step === 4 && confirmedBooking && (
        <div className="py-6 space-y-6 animate-scale-up">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Seat Reserved Successfully!</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Present your QR code pass at the library front desk to check in within the grace window.
            </p>
          </div>

          <QRCard booking={confirmedBooking} qrDataUrl={qrDataUrl} />

          <div className="text-center pt-4">
            <button
              onClick={() => navigate('/app/bookings')}
              className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              Go to My Bookings
            </button>
          </div>
        </div>
      )}

      {/* Conflict Modal with Alternatives */}
      <ConflictModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        alternatives={conflictAlternatives}
        onSelectAlternative={(seat) => {
          setSelectedSeat(seat);
          setShowConflictModal(false);
          setStep(3); // proceed to summary with the alternative
        }}
        onJoinWaitlist={handleJoinWaitlist}
        conflictingBookingId={conflictingBookingId}
        onViewBookings={() => navigate('/app/bookings')}
        onChangeSlot={() => {
          setShowConflictModal(false);
          setStep(1);
        }}
      />
    </div>
  );
};
