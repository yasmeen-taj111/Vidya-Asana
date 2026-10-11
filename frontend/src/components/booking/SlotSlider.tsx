import React, { useState, useEffect, useRef, useMemo } from 'react';
import { format, addDays, parseISO, isSameDay } from 'date-fns';
import { Minus, Plus, Calendar, Clock, AlertTriangle, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';
import { UnbookableInterval, Booking } from '../../api/types';

export interface SelectedSlotRange {
  startTime: string; // 'HH:mm'
  endTime: string;   // 'HH:mm'
  durationMins: number;
  label: string;     // '12:30 PM - 1:30 PM'
  isClosed: boolean;
  closureReason?: string;
  isOverlapping?: boolean;
  overlappingBooking?: Booking;
}

interface SlotSliderProps {
  selectedDate: string; // 'YYYY-MM-DD'
  onSelectDate: (date: string) => void;
  unbookableIntervals?: UnbookableInterval[];
  userBookings?: Booking[];
  onSlotChange: (slot: SelectedSlotRange) => void;
  initialStartTime?: string;
  initialDurationMins?: number;
}

// Generate ticks every 30 minutes from 06:00 to 23:30
interface TimeTick {
  index: number;
  timeStr: string;   // 'HH:mm'
  minutes: number;   // minutes from midnight
  label: string;     // '12:30 PM'
}

function generateDayTicks(): TimeTick[] {
  const ticks: TimeTick[] = [];
  const startHour = 6;  // 06:00 AM
  const endHour = 23;   // 11:30 PM
  let idx = 0;

  for (let h = startHour; h <= endHour; h++) {
    for (const m of [0, 30]) {
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      const label = `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
      ticks.push({
        index: idx++,
        timeStr,
        minutes: h * 60 + m,
        label,
      });
    }
  }
  return ticks;
}

const ALL_TICKS = generateDayTicks();
const STEP_MINS = 30;
const MIN_DURATION = 60;   // 1 Hour min
const MAX_DURATION = 480;  // 8 Hours max

export const SlotSlider: React.FC<SlotSliderProps> = ({
  selectedDate,
  onSelectDate,
  unbookableIntervals = [],
  userBookings = [],
  onSlotChange,
  initialStartTime,
  initialDurationMins = 60,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Date strip for next 14 days
  const dateOptions = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }).map((_, i) => {
      const d = addDays(today, i);
      return {
        dateStr: format(d, 'yyyy-MM-dd'),
        dayName: format(d, 'EEE').toUpperCase(),
        dayNum: format(d, 'd'),
        monthName: format(d, 'MMM').toUpperCase(),
        monthYear: format(d, 'MMMM yyyy').toUpperCase(),
      };
    });
  }, []);

  const activeDateObj = useMemo(() => {
    return dateOptions.find((d) => d.dateStr === selectedDate) || dateOptions[0];
  }, [dateOptions, selectedDate]);

  // Negative booking check: determine which ticks have passed today
  const isToday = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return selectedDate === todayStr;
  }, [selectedDate]);

  const currentMinutesToday = useMemo(() => {
    if (!isToday) return -1;
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, [isToday]);

  const isTickPast = (tick: TimeTick): boolean => {
    if (!isToday) return false;
    // Disallow ticks whose start time is before or within current time
    return tick.minutes <= currentMinutesToday;
  };

  // Find first upcoming valid tick
  const firstAvailableTickIndex = useMemo(() => {
    if (!isToday) return 0;
    const found = ALL_TICKS.findIndex((t) => !isTickPast(t));
    return found === -1 ? ALL_TICKS.length - 1 : found;
  }, [isToday, currentMinutesToday]);

  // Duration in minutes (must be multiple of 30, min 60)
  const [duration, setDuration] = useState<number>(() => {
    return Math.max(MIN_DURATION, Math.floor(initialDurationMins / 30) * 30);
  });

  // Start tick index
  const [startIndex, setStartIndex] = useState<number>(() => {
    if (initialStartTime) {
      const found = ALL_TICKS.findIndex((t) => t.timeStr === initialStartTime);
      if (found !== -1) return found;
    }
    return firstAvailableTickIndex;
  });

  // Auto-correct startIndex if it falls into passed time on today
  useEffect(() => {
    if (isToday && startIndex < firstAvailableTickIndex) {
      setStartIndex(firstAvailableTickIndex);
    }
  }, [isToday, firstAvailableTickIndex]);

  // End tick calculation
  const stepsCount = Math.floor(duration / STEP_MINS);
  const maxStartIndex = Math.max(0, ALL_TICKS.length - stepsCount);
  const effectiveStartIndex = Math.min(startIndex, maxStartIndex);

  const startTick = ALL_TICKS[effectiveStartIndex] || ALL_TICKS[0];
  const endMinutes = startTick.minutes + duration;

  // Convert minutes to HH:mm string
  const formatMinutesToHHMM = (m: number): string => {
    const h = Math.floor(m / 60) % 24;
    const min = m % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };

  // Convert minutes to 12-hour formatted string
  const formatMinutesTo12 = (m: number): string => {
    const h = Math.floor(m / 60) % 24;
    const min = m % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
  };

  const endTimeStr = formatMinutesToHHMM(endMinutes);
  const endLabel = formatMinutesTo12(endMinutes);

  // Check if current selection overlaps with any unbookable interval for the selected date
  const overlappingClosure = useMemo(() => {
    const reqStart = startTick.timeStr;
    const reqEnd = endTimeStr;

    return unbookableIntervals.find((interval) => {
      // If interval has a date, it must match selectedDate. If null, it applies every day.
      if (interval.date && interval.date !== selectedDate) return false;
      // Overlap condition: interval.startTime < reqEnd && interval.endTime > reqStart
      return interval.startTime < reqEnd && interval.endTime > reqStart;
    });
  }, [unbookableIntervals, selectedDate, startTick.timeStr, endTimeStr]);

  // Filter active user bookings on the selected date
  const sameDayBookings = useMemo(() => {
    const normSelected = selectedDate.includes('T') ? selectedDate.split('T')[0] : selectedDate;
    return (userBookings || []).filter((b) => {
      const normDate = b.date?.includes('T') ? b.date.split('T')[0] : b.date;
      return (
        normDate === normSelected &&
        (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN') &&
        b.slot?.startTime &&
        b.slot?.endTime
      );
    });
  }, [userBookings, selectedDate]);

  // Check if current slot selection overlaps with any existing booking of the user
  const overlappingBooking = useMemo(() => {
    const reqStart = startTick.timeStr;
    const reqEnd = endTimeStr;

    return sameDayBookings.find((b) => {
      return b.slot.startTime < reqEnd && b.slot.endTime > reqStart;
    });
  }, [sameDayBookings, startTick.timeStr, endTimeStr]);

  // Notify parent of slot changes
  useEffect(() => {
    onSlotChange({
      startTime: startTick.timeStr,
      endTime: endTimeStr,
      durationMins: duration,
      label: `${startTick.label} - ${endLabel}`,
      isClosed: !!overlappingClosure,
      closureReason: overlappingClosure?.reason,
      isOverlapping: !!overlappingBooking,
      overlappingBooking,
    });
  }, [startTick.timeStr, endTimeStr, duration, overlappingClosure, overlappingBooking]);

  // Stepper handlers
  const handleDecrementDuration = () => {
    if (duration <= MIN_DURATION) return;
    setDuration((prev) => prev - STEP_MINS);
  };

  const handleIncrementDuration = () => {
    if (duration >= MAX_DURATION) return;
    // Don't extend beyond the last tick of the day
    if (effectiveStartIndex + Math.floor((duration + STEP_MINS) / STEP_MINS) > ALL_TICKS.length) {
      return;
    }
    setDuration((prev) => prev + STEP_MINS);
  };

  // Select a tick by clicking on the ruler
  const handleSelectTick = (index: number) => {
    const tick = ALL_TICKS[index];
    if (isTickPast(tick)) return; // Negative booking prevention
    const clamped = Math.min(index, maxStartIndex);
    setStartIndex(clamped);
  };

  // Auto-scroll ruler into view when startIndex changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const tickWidth = 84; // roughly 84px per 30m tick
      const scrollPos = effectiveStartIndex * tickWidth - container.clientWidth / 2 + tickWidth;
      container.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
    }
  }, [effectiveStartIndex]);

  // Ruler width per tick in px
  const TICK_WIDTH_PX = 80;
  const totalRulerWidth = ALL_TICKS.length * TICK_WIDTH_PX;
  const activeLeftPx = effectiveStartIndex * TICK_WIDTH_PX + TICK_WIDTH_PX / 2;
  const activeWidthPx = (duration / STEP_MINS) * TICK_WIDTH_PX;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-6">
      {/* 1. Header & Date Strip */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-800" />
            <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-wide">
              {activeDateObj.monthYear}
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">14 Days Schedule</span>
        </div>

        {/* Horizontal Date Selector (Scrollable) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
          {dateOptions.map((d) => {
            const isSelected = d.dateStr === selectedDate;
            return (
              <button
                key={d.dateStr}
                onClick={() => onSelectDate(d.dateStr)}
                className={`snap-start min-w-[58px] sm:min-w-[64px] py-3 px-2 rounded-2xl flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-md font-bold scale-[1.02]'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100'
                }`}
              >
                <span className={`text-[11px] font-semibold tracking-wider ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                  {d.dayName}
                </span>
                <span className="text-lg font-black my-0.5 leading-none">
                  {d.dayNum}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Selected Time & Duration Card (Exact Match with Overlap Dynamic State) */}
      <div className={`border rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${
        overlappingBooking
          ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20'
          : overlappingClosure
          ? 'bg-rose-50/70 border-rose-300'
          : 'bg-slate-50/70 border-slate-200/90'
      }`}>
        {/* Left Side: Time Pill with Dynamic Overlap Notification Indicator */}
        <div className={`w-full sm:w-auto rounded-xl px-4 py-3 flex flex-col items-start min-w-[200px] border transition-colors ${
          overlappingBooking
            ? 'bg-amber-100/80 border-amber-300 text-amber-950'
            : overlappingClosure
            ? 'bg-rose-100/80 border-rose-300 text-rose-950'
            : 'bg-[#eaf4fd] border-sky-100/80 text-sky-950'
        }`}>
          <div className="flex items-center justify-between w-full gap-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              overlappingBooking
                ? 'text-amber-800'
                : overlappingClosure
                ? 'text-rose-800'
                : 'text-sky-900/80'
            }`}>
              Time
            </span>
            {overlappingBooking && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300 animate-pulse">
                Conflict
              </span>
            )}
            {overlappingClosure && !overlappingBooking && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 border border-rose-300">
                Closed
              </span>
            )}
          </div>
          <span className="text-base sm:text-lg font-black mt-0.5">
            {startTick.label} – {endLabel}
          </span>
        </div>

        {/* Right Side: Stepper Controller [-]  60 Mins  [+] */}
        <div className="flex items-center gap-4 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={handleDecrementDuration}
            disabled={duration <= MIN_DURATION}
            aria-label="Decrease slot duration"
            className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <Minus className="w-4 h-4 stroke-[2.5]" />
          </button>

          <div className="flex flex-col items-center min-w-[70px]">
            <span className="text-sm sm:text-base font-black text-slate-900 leading-tight">
              {duration} Mins
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              {duration >= 60 ? `(${(duration / 60).toFixed(1).replace('.0', '')} hr${duration > 60 ? 's' : ''})` : ''}
            </span>
          </div>

          <button
            type="button"
            onClick={handleIncrementDuration}
            disabled={
              duration >= MAX_DURATION ||
              effectiveStartIndex + Math.floor((duration + STEP_MINS) / STEP_MINS) > ALL_TICKS.length
            }
            aria-label="Increase slot duration"
            className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Dynamic Overlap Warning Banner */}
      {overlappingBooking && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3.5 animate-fade-in shadow-xs">
          <div className="p-2 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                Overlapping Session Detected
              </h4>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-200/90 text-amber-950 border border-amber-300">
                Existing Booking
              </span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              You already have an active reservation on this date from{' '}
              <strong className="underline decoration-amber-500 font-black">
                {overlappingBooking.slot.startTime} to {overlappingBooking.slot.endTime}
              </strong>{' '}
              at <strong>{overlappingBooking.libraryName}</strong>
              {overlappingBooking.seat?.label ? ` (Seat ${overlappingBooking.seat.label})` : ''}.
            </p>
            <p className="text-[11px] text-amber-700 font-medium">
              Please drag the slider or adjust the duration to pick an open time slot that does not clash with this session.
            </p>
          </div>
        </div>
      )}

      {/* 3. Negative Booking / Past Times Alert if all today's slots ended */}
      {isToday && firstAvailableTickIndex >= ALL_TICKS.length - (duration / STEP_MINS) && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Operating hours have ended for today. Please select tomorrow or an upcoming date above.
          </span>
        </div>
      )}

      {/* 4. Horizontal Ruler / Timeline Slider (Exact Match to Screenshot) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Drag or click on the ruler to set start time
          </span>
          <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
            ● 30-min precision
          </span>
        </div>

        {/* Scrollable Timeline Box */}
        <div
          ref={scrollContainerRef}
          className="relative overflow-x-auto pb-4 pt-2 scrollbar-thin select-none"
        >
          <div
            className="relative h-[92px]"
            style={{ width: `${totalRulerWidth}px` }}
          >
            {/* Ticks and Labels */}
            <div className="flex">
              {ALL_TICKS.map((tick) => {
                const isPast = isTickPast(tick);
                const isSelectedStart = tick.index === effectiveStartIndex;
                const isWithinRange =
                  tick.minutes >= startTick.minutes && tick.minutes < endMinutes;

                // Check if this tick falls into an unbookable closure
                const closureForTick = unbookableIntervals.find((interval) => {
                  if (interval.date && interval.date !== selectedDate) return false;
                  return interval.startTime <= tick.timeStr && interval.endTime > tick.timeStr;
                });

                return (
                  <div
                    key={tick.timeStr}
                    onClick={() => !isPast && !closureForTick && handleSelectTick(tick.index)}
                    style={{ width: `${TICK_WIDTH_PX}px` }}
                    className={`shrink-0 flex flex-col items-center cursor-pointer transition-colors relative ${
                      isPast
                        ? 'opacity-30 cursor-not-allowed'
                        : closureForTick
                        ? 'cursor-not-allowed'
                        : 'hover:text-primary'
                    }`}
                  >
                    {/* Time Label (e.g. 12:00 PM, 12:30 PM) */}
                    <span
                      className={`text-[11px] font-bold tracking-tight whitespace-nowrap mb-1 ${
                        isPast
                          ? 'text-slate-400 line-through'
                          : closureForTick
                          ? 'text-rose-500 font-black'
                          : isSelectedStart
                          ? 'text-emerald-700 font-black scale-105'
                          : isWithinRange
                          ? 'text-slate-800'
                          : 'text-slate-500'
                      }`}
                    >
                      {tick.label}
                    </span>

                    {/* Tick Mark Line */}
                    <div
                      className={`w-[1.5px] h-3 transition-colors ${
                        isPast
                          ? 'bg-slate-300'
                          : closureForTick
                          ? 'bg-rose-400'
                          : isWithinRange
                          ? 'bg-emerald-600'
                          : 'bg-slate-400'
                      }`}
                    />

                    {/* Closure badge if closure starts here */}
                    {closureForTick && closureForTick.startTime === tick.timeStr && (
                      <span className="absolute -top-3 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-bold border border-rose-200 z-10 whitespace-nowrap">
                        Closed
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Continuous Track Line (Green) */}
            <div className="absolute top-[28px] left-0 right-0 h-[3px] bg-emerald-500 rounded-full" />

            {/* Unbookable Intervals Blackout Overlays */}
            {unbookableIntervals.map((interval) => {
              if (interval.date && interval.date !== selectedDate) return null;
              const [sh, sm] = interval.startTime.split(':').map(Number);
              const [eh, em] = interval.endTime.split(':').map(Number);
              const sMins = sh * 60 + sm;
              const eMins = eh * 60 + em;

              // Find pixel bounds relative to 06:00
              const baseMins = ALL_TICKS[0].minutes;
              const leftPx = ((sMins - baseMins) / 30) * TICK_WIDTH_PX + TICK_WIDTH_PX / 2;
              const widthPx = ((eMins - sMins) / 30) * TICK_WIDTH_PX;

              if (widthPx <= 0) return null;

              return (
                <div
                  key={interval.id}
                  style={{
                    left: `${Math.max(0, leftPx)}px`,
                    width: `${widthPx}px`,
                  }}
                  title={`Closed: ${interval.reason}`}
                  className="absolute top-[20px] h-[36px] bg-rose-500/15 border-x border-rose-400/60 rounded flex items-center justify-center pointer-events-auto"
                >
                  <span className="text-[10px] font-bold text-rose-800 bg-white/90 px-1.5 py-0.5 rounded shadow-xs truncate max-w-[90%]">
                    {interval.reason}
                  </span>
                </div>
              );
            })}

            {/* Existing User Bookings Overlays on Ruler Track */}
            {sameDayBookings.map((b) => {
              const [sh, sm] = b.slot.startTime.split(':').map(Number);
              const [eh, em] = b.slot.endTime.split(':').map(Number);
              const sMins = sh * 60 + sm;
              const eMins = eh * 60 + em;

              const baseMins = ALL_TICKS[0].minutes;
              const leftPx = ((sMins - baseMins) / 30) * TICK_WIDTH_PX + TICK_WIDTH_PX / 2;
              const widthPx = ((eMins - sMins) / 30) * TICK_WIDTH_PX;

              if (widthPx <= 0) return null;
              const isCurrentOverlap = overlappingBooking?.id === b.id;

              return (
                <div
                  key={b.id}
                  style={{
                    left: `${Math.max(0, leftPx)}px`,
                    width: `${widthPx}px`,
                  }}
                  title={`Your Reservation: ${b.slot.startTime} - ${b.slot.endTime} (${b.libraryName})`}
                  className={`absolute top-[20px] h-[36px] rounded border-x-2 flex items-center justify-center pointer-events-auto transition-all ${
                    isCurrentOverlap
                      ? 'bg-amber-500/25 border-amber-500 ring-2 ring-amber-400/50 shadow-sm z-20'
                      : 'bg-indigo-500/15 border-indigo-400/80 z-10'
                  }`}
                >
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded shadow-xs truncate max-w-[95%] ${
                      isCurrentOverlap
                        ? 'bg-amber-100 text-amber-950 border border-amber-300'
                        : 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                    }`}
                  >
                    {isCurrentOverlap ? '⚠️ Conflict: Your Booking' : `My Booking: ${b.slot.startTime}–${b.slot.endTime}`}
                  </span>
                </div>
              );
            })}

            {/* Passed Time Strip (Negative Booking Visual Block) */}
            {isToday && firstAvailableTickIndex > 0 && (
              <div
                style={{
                  left: 0,
                  width: `${firstAvailableTickIndex * TICK_WIDTH_PX + TICK_WIDTH_PX / 2}px`,
                }}
                className="absolute top-[24px] h-[28px] bg-slate-200/50 backdrop-blur-[1px] border-r-2 border-slate-400/80 flex items-center pl-2 pointer-events-none"
              >
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-80">
                  Time Passed
                </span>
              </div>
            )}

            {/* Active Range Connector Bar and Pointers ▲───────▲ (Matches Screenshot) */}
            <div
              style={{
                left: `${activeLeftPx}px`,
                width: `${activeWidthPx}px`,
              }}
              className="absolute top-[32px] pointer-events-none transition-all duration-150"
            >
              {/* Start Pointer ▲ */}
              <div className="absolute left-0 -translate-x-1/2 -top-[1px] flex flex-col items-center">
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-slate-900" />
              </div>

              {/* Connecting Bar */}
              <div className="h-[2px] bg-slate-900 w-full" />

              {/* End Pointer ▲ */}
              <div className="absolute right-0 translate-x-1/2 -top-[1px] flex flex-col items-center">
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-slate-900" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Warning Notification if Closed Interval Overlaps */}
      {overlappingClosure && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 animate-fade-in shadow-xs">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
              Library Closed During This Time
            </h4>
            <p className="text-xs text-rose-700">
              The library is unavailable between <strong>{formatMinutesTo12(ALL_TICKS.find((t) => t.timeStr === overlappingClosure.startTime)?.minutes || 0)}</strong> and <strong>{formatMinutesTo12(ALL_TICKS.find((t) => t.timeStr === overlappingClosure.endTime)?.minutes || 0)}</strong> due to: <strong>{overlappingClosure.reason}</strong>. Please adjust your slider to an open time.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
