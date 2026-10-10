import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { TimeSlot, SlotName } from '../../api/types';
import { useUiStore } from '../../store/uiStore';
import { Clock, Plus, Trash2, Edit3, CheckCircle2, AlertTriangle, Save, X } from 'lucide-react';

export const Slots: React.FC = () => {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);

  // Form states
  const [slotName, setSlotName] = useState<SlotName>('MORNING');
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('12:00');
  const [isFree, setIsFree] = useState(false);
  const [priceRupees, setPriceRupees] = useState(50);

  const { addToast } = useUiStore();

  const loadSlots = async () => {
    try {
      const data = await adminApi.getSlots();
      setSlots(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, []);

  // Time conversion helper HH:mm to minutes
  const toMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Client-side overlap checker
  const checkOverlap = (start: string, end: string, excludeId?: string) => {
    const newStart = toMinutes(start);
    const newEnd = toMinutes(end);

    if (newStart >= newEnd) {
      return 'Start time must precede end time within the same day.';
    }

    for (const s of slots) {
      if (excludeId && s.id === excludeId) continue;
      const sStart = toMinutes(s.startTime);
      const sEnd = toMinutes(s.endTime);

      if (Math.max(newStart, sStart) < Math.min(newEnd, sEnd)) {
        return `Timeslot overlaps with existing ${s.name} slot (${s.startTime} - ${s.endTime}).`;
      }
    }
    return null;
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();

    const overlapError = checkOverlap(startTime, endTime, editingSlot?.id);
    if (overlapError) {
      addToast({
        type: 'warning',
        title: 'Slot Time Overlap',
        message: overlapError,
      });
      return;
    }

    try {
      if (editingSlot) {
        await adminApi.updateSlot(editingSlot.id, {
          name: slotName,
          startTime,
          endTime,
          isFree,
          pricePaise: isFree ? 0 : Math.round(priceRupees * 100),
        });
        addToast({ type: 'success', title: 'Slot Updated', message: `${slotName} time window updated.` });
      } else {
        await adminApi.createSlot({
          name: slotName,
          startTime,
          endTime,
          isFree,
          pricePaise: isFree ? 0 : Math.round(priceRupees * 100),
        });
        addToast({ type: 'success', title: 'Slot Created', message: `Added new ${slotName} slot.` });
      }
      setShowAddModal(false);
      setEditingSlot(null);
      loadSlots();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Action Failed',
        message: err.message || 'Could not save slot.',
      });
    }
  };

  const handleDelete = async (slotId: string) => {
    try {
      await adminApi.deleteSlot(slotId);
      addToast({ type: 'info', title: 'Slot Removed', message: 'Slot deleted successfully.' });
      loadSlots();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Delete Failed', message: err.message || 'Could not delete slot.' });
    }
  };

  const openEdit = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setSlotName(slot.name);
    setStartTime(slot.startTime);
    setEndTime(slot.endTime);
    setIsFree(slot.isFree);
    setPriceRupees(slot.pricePaise / 100);
    setShowAddModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Study Time Slots & Tariff
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure reservation windows and admission pricing per session.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingSlot(null);
            setSlotName('MORNING');
            setStartTime('06:00');
            setEndTime('12:00');
            setIsFree(false);
            setPriceRupees(50);
            setShowAddModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Time Slot
        </button>
      </div>

      {/* Slots List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {slots.map((s) => (
          <div
            key={s.id}
            className="bg-white p-5 rounded-3xl border border-slate-100 shadow-md flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  {s.name}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    s.isFree ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {s.isFree ? 'Free' : `₹${(s.pricePaise / 100).toFixed(0)}`}
                </span>
              </div>

              <div className="text-lg font-black text-navy font-mono">
                {s.startTime} – {s.endTime}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => openEdit(s)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-50 transition-colors"
                title="Edit"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add / Edit Slot */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-up space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingSlot ? 'Edit Time Slot' : 'Create Time Slot'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block mb-1">Slot Category:</span>
                <select
                  value={slotName}
                  onChange={(e) => setSlotName(e.target.value as SlotName)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold outline-none"
                >
                  <option value="MORNING">MORNING</option>
                  <option value="AFTERNOON">AFTERNOON</option>
                  <option value="EVENING">EVENING</option>
                  <option value="NIGHT">NIGHT</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block mb-1">Start Time (HH:mm):</span>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">End Time (HH:mm):</span>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={isFree}
                    onChange={(e) => setIsFree(e.target.checked)}
                    className="rounded text-primary"
                  />
                  <span className="font-semibold text-slate-800">Free Slot (No charge)</span>
                </label>

                {!isFree && (
                  <div>
                    <span className="text-slate-500 block mb-1">Tariff (in ₹ Rupees):</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={priceRupees}
                      onChange={(e) => setPriceRupees(parseFloat(e.target.value) || 0)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 outline-none font-mono font-bold"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-hover shadow-sm"
                >
                  Save Slot
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
