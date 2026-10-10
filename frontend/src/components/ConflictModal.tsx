import React from 'react';
import { SeatSuggestion, Seat } from '../api/types';
import { AlertCircle, ArrowRight, Clock, Users, Zap, Sun, VolumeX, Sparkles } from 'lucide-react';

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  alternatives?: SeatSuggestion[];
  onSelectAlternative: (seat: Seat) => void;
  onJoinWaitlist: () => void;
  conflictingBookingId?: string;
  onViewBookings?: () => void;
  onChangeSlot?: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  onClose,
  alternatives = [],
  onSelectAlternative,
  onJoinWaitlist,
  conflictingBookingId,
  onViewBookings,
  onChangeSlot,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-scale-up">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {conflictingBookingId ? 'Overlapping Reservation' : 'Seat Was Just Taken!'}
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {conflictingBookingId
                ? `You already have an active reservation for this time slot (Booking: ${conflictingBookingId}). You can view your current reservation or select a different time slot or date.`
                : 'Another student completed reservation for this seat just moments ago. Here are curated matching alternatives in the same slot:'}
            </p>
          </div>
        </div>

        {/* Alternatives Cards */}
        {alternatives.length > 0 && (
          <div className="space-y-2.5 my-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" /> Recommended Alternatives
            </p>
            {alternatives.map((alt) => (
              <div
                key={alt.seat.id}
                onClick={() => onSelectAlternative(alt.seat)}
                className="p-3.5 rounded-2xl border border-slate-200 hover:border-primary bg-slate-50 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-between group shadow-sm hover:shadow"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900 group-hover:text-primary">
                      {alt.seat.label}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 font-medium">
                      {alt.floorLabel}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      {alt.score}% match
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                    {alt.reasons.map((r, i) => (
                      <span key={i} className="flex items-center gap-1">
                        • {r}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 group-hover:bg-primary group-hover:text-white group-hover:border-primary flex items-center justify-center transition-all shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          {conflictingBookingId ? (
            <>
              {onViewBookings && (
                <button
                  onClick={onViewBookings}
                  className="flex-1 py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-xs transition-colors shadow-md shadow-primary/20"
                >
                  View My Reservation
                </button>
              )}
              <button
                onClick={onChangeSlot || onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                Change Slot or Date
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onJoinWaitlist}
                className="flex-1 py-3 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs border border-amber-200 transition-colors flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4 text-amber-600" />
                Join Waitlist for This Seat
              </button>

              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                Cancel & Return to Grid
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
