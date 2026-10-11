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
  WaitlistEntry,
  UnbookableInterval,
  UserPreferences,
} from '../../api/types';
import { studyApi } from '../../api/study';
import { SeatGrid } from '../../components/SeatGrid/SeatGrid';
import { ConflictModal } from '../../components/ConflictModal';
import { QRCard } from '../../components/QRCard';
import { SlotSlider, SelectedSlotRange } from '../../components/booking/SlotSlider';
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
  const [sliderRange, setSliderRange] = useState<SelectedSlotRange>({
    startTime: '12:30',
    endTime: '13:30',
    durationMins: 60,
    label: '12:30 PM - 1:30 PM',
    isClosed: false,
  });
  const [intervals, setIntervals] = useState<UnbookableInterval[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [suggestions, setSuggestions] = useState<SeatSuggestion[]>([]);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [userWaitlist, setUserWaitlist] = useState<WaitlistEntry[]>([]);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);

  // Conflict modal states
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictAlternatives, setConflictAlternatives] = useState<SeatSuggestion[]>([]);
  const [conflictingBookingId, setConflictingBookingId] = useState<string | undefined>();

  // Confirmed booking state
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [loadingGrid, setLoadingGrid] = useState(false);

  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);

  // Available dates: Next 14 days per PRD
  const availableDates = Array.from({ length: 14 }).map((_, i) =>
    format(addDays(new Date(), i), 'yyyy-MM-dd')
  );

  const isSlotPastToday = (slot: TimeSlot) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (selectedDate !== todayStr) return false;
    const now = new Date();
    const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return slot.endTime <= curTime;
  };

  const findPreferredSlot = (slotList: TimeSlot[], dateStr: string, prefs: UserPreferences | null): TimeSlot | null => {
    if (!prefs?.preferredSlot || slotList.length === 0) return null;
    const preferredName = prefs.preferredSlot.toUpperCase();
    const matched = slotList.find((s) => s.name.toUpperCase() === preferredName);
    if (!matched) return null;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (dateStr === todayStr) {
      const now = new Date();
      const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (matched.endTime > curTime) {
        return matched;
      }
      return null;
    }
    return matched;
  };

  // Load library metadata, slots, floors, and user preferences
  useEffect(() => {
    if (!libraryId) return;

    Promise.all([
      librariesApi.getLibrary(libraryId),
      librariesApi.getSlots(libraryId),
      librariesApi.getFloors(libraryId),
      librariesApi.getIntervals(libraryId),
      studyApi.getPreferences().catch(() => null),
    ])
      .then(([lib, slotList, floorList, intervalList, prefs]) => {
        setLibrary(lib);
        const finalSlots = slotList && slotList.length > 0 ? slotList : [];
        setSlots(finalSlots);
        setIntervals(intervalList || []);
        if (prefs) setUserPreferences(prefs);
        if (finalSlots.length > 0) {
          setSelectedSlot(finalSlots[0]);
        }

        setFloors(floorList);
        if (floorList.length > 0) setActiveFloorId(floorList[0].id);
      })
      .catch((err) => console.error(err));
  }, [libraryId]);

  // Synchronize slot auto-detection when userPreferences, slots, or date change
  useEffect(() => {
    if (slots.length > 0 && userPreferences?.preferredSlot) {
      const prefSlot = findPreferredSlot(slots, selectedDate, userPreferences);
      if (prefSlot && selectedSlot?.id !== prefSlot.id) {
        setSelectedSlot(prefSlot);
      }
    }
  }, [userPreferences, slots, selectedDate]);

  // Load user's existing bookings and waitlists to prevent conflicts and show active status
  const loadUserWaitlist = () => {
    waitlistApi
      .getMyWaitlist()
      .then((data) => setUserWaitlist(data))
      .catch((err) => console.warn('[Book] Could not load waitlist:', err));
  };

  useEffect(() => {
    bookingsApi
      .getMyBookings({ upcoming: true })
      .then((res) => {
        setUserBookings(res.bookings || []);
      })
      .catch((err) => {
        console.warn('[Book] Could not load upcoming bookings:', err);
      });

    loadUserWaitlist();
  }, []);

  const handleSelectDate = (d: string) => {
    setSelectedDate(d);
    setSelectedSeat(null);
    if (libraryId) {
      librariesApi.getIntervals(libraryId, d).then(setIntervals).catch(console.warn);
    }
  };

  const getSlotReservation = (slotId: string) => {
    return userBookings.find(
      (b) =>
        b.slot.id === slotId &&
        b.date === selectedDate &&
        (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN')
    );
  };

  const getSlotWaitlist = (slotId: string) => {
    return userWaitlist.find(
      (w) =>
        w.slot.id === slotId &&
        w.date === selectedDate &&
        (w.status === 'WAITING' || w.status === 'NOTIFIED')
    );
  };

  // Load grid and suggestions when date or slot changes
  const loadFloorGridAndSuggestions = async () => {
    if (!libraryId || !activeFloorId) return;

    setLoadingGrid(true);
    try {
      const gridData = await librariesApi.getFloorGrid(
        libraryId,
        activeFloorId,
        selectedDate,
        selectedSlot?.id,
        sliderRange.startTime,
        sliderRange.endTime
      );
      setGrids((prev) => ({ ...prev, [activeFloorId]: gridData }));
    } catch (err) {
      console.error('[Book] Error loading floor grid:', err);
    }

    try {
      const sugData = await librariesApi.suggestSeats(libraryId, {
        date: selectedDate,
        slotId: selectedSlot?.id || 'dynamic',
        preferences: userPreferences || {},
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
  }, [step, selectedDate, sliderRange.startTime, sliderRange.endTime, activeFloorId]);

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
    if (!libraryId || !selectedSeat) return;

    setSubmitting(true);
    try {
      const idempotencyKey = `bk-${selectedSeat.id.slice(-8)}-${selectedDate}-${sliderRange.startTime.replace(':', '')}-${sliderRange.endTime.replace(':', '')}-${Date.now()}`;
      const booking = await bookingsApi.createBooking(
        {
          libraryId,
          seatId: selectedSeat.id,
          slotId: selectedSlot?.id,
          startTime: sliderRange.startTime,
          endTime: sliderRange.endTime,
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
        message: `Seat ${booking.seat.label} reserved for ${sliderRange.label}.`,
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
        } else if (err.code === 'RATE_LIMITED') {
          addToast({
            type: 'error',
            title: 'Rate Limit Reached',
            message: err.message || 'Too many reservation attempts. Please wait a moment before trying again.',
          });
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
    setJoiningWaitlist(true);
    try {
      const entry = await waitlistApi.joinWaitlist({
        seatId: selectedSeat.id,
        slotId: selectedSlot.id,
        date: selectedDate,
      });
      setUserWaitlist((prev) => [...prev, entry]);
      addToast({
        type: 'success',
        title: 'Added to Waitlist',
        message: `You are #${entry.position} in queue for seat ${selectedSeat.label}. You'll be notified if freed.`,
      });
      setShowConflictModal(false);
      navigate('/app/waitlist');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Waitlist Notice',
        message: err.message || 'Could not join waitlist.',
      });
    } finally {
      setJoiningWaitlist(false);
    }
  };

  const currentGrid = grids[activeFloorId];
  const selectedCell = currentGrid?.cells.find((c) => c.seat?.id === selectedSeat?.id);
  const isSelectedSeatOccupied = selectedCell?.status === 'BOOKED';
  const existingWaitlistEntry = userWaitlist.find(
    (w) =>
      w.seat.id === selectedSeat?.id &&
      w.slot.id === selectedSlot?.id &&
      w.date === selectedDate &&
      (w.status === 'WAITING' || w.status === 'NOTIFIED')
  );

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

      {/* Step 1: Slider-Based Time & Duration Selection (Matches Reference Image) */}
      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          {/* Subtle Amenity / Karma Banner from Reference Image */}
          <div className="bg-[#eaf4fd] border border-sky-200/60 text-sky-900 rounded-2xl py-3 px-4 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold tracking-wide shadow-xs">
            <span className="text-sky-600">✧</span>
            <span>Earn 3 karma points on every booking</span>
            <span className="text-sky-600">✧</span>
          </div>

          {/* Interactive SlotSlider */}
          <SlotSlider
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            unbookableIntervals={intervals}
            onSlotChange={(range) => {
              setSliderRange(range);
              setSelectedSeat(null);
            }}
            initialStartTime={sliderRange.startTime}
            initialDurationMins={sliderRange.durationMins}
          />

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              disabled={sliderRange.isClosed}
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
          {/* Active Reservation Slot & Preference Context Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Calendar className="w-4 h-4 text-primary" />
                <span>{format(new Date(selectedDate), 'EEE, d MMM yyyy')}</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5 font-bold text-navy font-mono">
                <Clock className="w-4 h-4 text-primary" />
                <span>{selectedSlot?.name} ({selectedSlot?.startTime} – {selectedSlot?.endTime})</span>
              </div>
              {userPreferences?.preferredSlot?.toUpperCase() === selectedSlot?.name.toUpperCase() ? (
                <span className="bg-primary/10 text-primary border border-primary/20 font-bold px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary animate-pulse" /> Auto-detected from preferences
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full text-[10px]">
                  Custom Slot
                </span>
              )}
            </div>
            <button
              onClick={() => setStep(1)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-primary font-bold text-xs flex items-center gap-1 transition-all"
            >
              Change Date or Slot →
            </button>
          </div>

          {/* Top Recommendations Strip */}
          {suggestions.length > 0 && (
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-accent" /> Recommended Best Desks for You
                </span>
                <span className="text-[11px] text-slate-400">
                  {userPreferences?.seatType
                    ? `Tailored to your ${userPreferences.seatType.toLowerCase()} desk & environment preferences`
                    : 'Ranked by algorithm'}
                </span>
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
              allowOccupiedClick={true}
            />
          ) : null}

          {/* Waitlist Callout Banner if Selected Seat is Occupied */}
          {selectedSeat && isSelectedSeatOccupied && (
            <div
              className={`p-5 rounded-3xl border transition-all animate-fade-in shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                existingWaitlistEntry
                  ? 'bg-blue-50/90 border-blue-200 text-blue-950'
                  : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200/90 text-amber-950'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    existingWaitlistEntry
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-extrabold text-sm text-slate-900">
                      Seat {selectedSeat.label} is currently booked
                    </h4>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        existingWaitlistEntry
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {existingWaitlistEntry
                        ? `In Queue • Position #${existingWaitlistEntry.position}`
                        : 'Occupied / Taken'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                    {existingWaitlistEntry
                      ? `You are currently in queue at Position #${existingWaitlistEntry.position} for this seat and slot. You'll receive an exclusive 10-minute claim pass the moment it becomes available.`
                      : 'This desk is currently reserved. Join the FIFO queue — if the student cancels or misses check-in within the 30-minute grace window, you will receive an instant 10-minute pass to claim it!'}
                  </p>
                </div>
              </div>

              {existingWaitlistEntry ? (
                <button
                  onClick={() => navigate('/app/waitlist')}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 shrink-0"
                >
                  <span>View in Waitlist</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleJoinWaitlist}
                  disabled={joiningWaitlist}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/25 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                >
                  <Clock className="w-4 h-4" />
                  <span>
                    {joiningWaitlist ? 'Joining Queue...' : `Join Waitlist for Seat ${selectedSeat.label}`}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Stepper bottom navigation bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-md flex items-center justify-between gap-4">
            <button
              onClick={() => setStep(1)}
              className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" /> Change Date/Slot
            </button>

            <div className="flex items-center gap-3">
              {selectedSeat && (
                <span className="text-xs font-bold text-slate-900 hidden sm:inline">
                  Selected: <span className="text-primary">{selectedSeat.label}</span> ({selectedSeat.seatType})
                  {isSelectedSeatOccupied && (
                    <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800">
                      Taken
                    </span>
                  )}
                </span>
              )}

              {isSelectedSeatOccupied ? (
                existingWaitlistEntry ? (
                  <button
                    onClick={() => navigate('/app/waitlist')}
                    className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    <span>In Waitlist (#{existingWaitlistEntry.position}) → View</span>
                  </button>
                ) : (
                  <button
                    onClick={handleJoinWaitlist}
                    disabled={joiningWaitlist}
                    className="px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/25 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Clock className="w-4 h-4" />
                    <span>{joiningWaitlist ? 'Joining...' : `Join Seat ${selectedSeat?.label || ''} Waitlist`}</span>
                  </button>
                )
              ) : (
                <button
                  disabled={!selectedSeat}
                  onClick={() => setStep(3)}
                  className="px-8 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span>Proceed to Summary</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Reservation Summary & Mock Payment */}
      {step === 3 && selectedSeat && (
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
                {sliderRange.label} ({sliderRange.durationMins} Mins)
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t font-bold text-sm">
              <span className="text-slate-700">Total Due:</span>
              <span className="text-navy font-mono">
                {library?.isFree || (selectedSlot ? selectedSlot.isFree : true) ? 'FREE' : `₹${((selectedSlot?.pricePaise || 0) / 100).toFixed(0)}`}
              </span>
            </div>
          </div>

          {library && !library.isFree && selectedSlot && !selectedSlot.isFree && (
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
