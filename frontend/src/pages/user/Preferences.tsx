import React, { useState, useEffect } from 'react';
import { studyApi } from '../../api/study';
import { UserPreferences, SeatType, SlotName } from '../../api/types';
import { useUiStore } from '../../store/uiStore';
import {
  Sliders,
  Save,
  Sun,
  Zap,
  VolumeX,
  User,
  Users,
  CheckCircle2,
} from 'lucide-react';

export const Preferences: React.FC = () => {
  const [prefs, setPrefs] = useState<UserPreferences>({
    seatType: 'INDIVIDUAL',
    window: true,
    powerOutlet: true,
    quietZone: true,
    studyMode: 'SOLO',
    preferredSlot: 'MORNING',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { addToast } = useUiStore();

  useEffect(() => {
    studyApi
      .getPreferences()
      .then((data) => setPrefs(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await studyApi.updatePreferences(prefs);
      setPrefs(updated);
      addToast({
        type: 'success',
        title: 'Preferences Saved!',
        message: 'Your seat matching algorithm weights have been updated.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Could not save preferences.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xl space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Study Environment Preferences
        </h2>
      </div>

      <form onSubmit={handleSave} className="space-y-5 text-xs">
        {/* Preferred Seat Type */}
        <div>
          <span className="font-semibold text-slate-700 block mb-2">Preferred Desk Type:</span>
          <div className="grid grid-cols-2 gap-2">
            {(['INDIVIDUAL', 'COMPUTER', 'GROUP', 'ACCESSIBLE'] as SeatType[]).map((st) => (
              <button
                type="button"
                key={st}
                onClick={() => setPrefs({ ...prefs, seatType: st })}
                className={`p-3 rounded-xl border text-left font-bold transition-all ${
                  prefs.seatType === st
                    ? 'border-primary bg-primary text-white shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Study Mode */}
        <div>
          <span className="font-semibold text-slate-700 block mb-2">Study Style:</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPrefs({ ...prefs, studyMode: 'SOLO' })}
              className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all ${
                prefs.studyMode === 'SOLO'
                  ? 'border-primary bg-primary text-white shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <User className="w-4 h-4" /> Solo Deep Work
            </button>
            <button
              type="button"
              onClick={() => setPrefs({ ...prefs, studyMode: 'GROUP' })}
              className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all ${
                prefs.studyMode === 'GROUP'
                  ? 'border-primary bg-primary text-white shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" /> Group Collaboration
            </button>
          </div>
        </div>

        {/* Preferred Slot */}
        <div>
          <span className="font-semibold text-slate-700 block mb-2">Preferred Study Window:</span>
          <select
            value={prefs.preferredSlot || 'MORNING'}
            onChange={(e) => setPrefs({ ...prefs, preferredSlot: e.target.value as SlotName })}
            className="w-full p-2.5 rounded-xl border border-slate-200 font-bold outline-none"
          >
            <option value="MORNING">MORNING (06:00 – 12:00)</option>
            <option value="AFTERNOON">AFTERNOON (12:00 – 17:00)</option>
            <option value="EVENING">EVENING (17:00 – 21:00)</option>
            <option value="NIGHT">NIGHT (21:00 – 23:59)</option>
          </select>
        </div>

        {/* Amenity Features Checklist */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <span className="font-semibold text-slate-700 block">Crucial Seat Attributes:</span>
          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.window}
              onChange={(e) => setPrefs({ ...prefs, window: e.target.checked })}
              className="rounded text-primary"
            />
            <span className="font-semibold text-slate-800">Direct Natural Light / Window Desk</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.powerOutlet}
              onChange={(e) => setPrefs({ ...prefs, powerOutlet: e.target.checked })}
              className="rounded text-primary"
            />
            <span className="font-semibold text-slate-800">Dedicated Laptop Power Socket</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.quietZone}
              onChange={(e) => setPrefs({ ...prefs, quietZone: e.target.checked })}
              className="rounded text-primary"
            />
            <span className="font-semibold text-slate-800">Strict Silent Pod / Silent Room</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Updating...' : 'Save Preferences'}
        </button>
      </form>
    </div>
  );
};
