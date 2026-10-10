import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { Library } from '../../api/types';
import { useUiStore } from '../../store/uiStore';

export const Profile: React.FC = () => {
  const [library, setLibrary] = useState<Library | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useUiStore();

  useEffect(() => {
    adminApi
      .getLibrary()
      .then((data) => setLibrary(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!library) return;
    setSaving(true);

    try {
      const updated = await adminApi.updateLibrary(library);
      setLibrary(updated);
      addToast({
        type: 'success',
        title: 'Profile Updated',
        message: 'Library details and amenity settings saved.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Could not update profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !library) {
    return <div className="text-center py-12 text-slate-400 text-xs">Loading profile...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-2xl shadow-primary/20 space-y-6 relative transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div className="space-y-1">
          <h3 className="font-serif font-bold text-2xl sm:text-3xl text-navy tracking-tight">
            Library Profile & Amenities
          </h3>
          <p className="text-xs text-slate-500 font-light">
            Configure your public discovery card and campus facilities
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider self-start sm:self-auto shrink-0 ${
            library.status === 'APPROVED'
              ? 'bg-emerald-100 text-emerald-800'
              : library.status === 'REJECTED'
              ? 'bg-rose-100 text-rose-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {library.status}
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Library Name
          </label>
          <input
            type="text"
            required
            value={library.name}
            onChange={(e) => setLibrary({ ...library, name: e.target.value })}
            className="w-full text-sm px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none font-bold text-slate-900 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Description
          </label>
          <textarea
            rows={4}
            value={library.description || ''}
            onChange={(e) => setLibrary({ ...library, description: e.target.value })}
            placeholder="Tell students about your study environment, natural lighting, quiet rules, and campus facilities."
            className="w-full text-sm px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none text-slate-800 leading-relaxed transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Street Address
            </label>
            <input
              type="text"
              required
              value={library.address}
              onChange={(e) => setLibrary({ ...library, address: e.target.value })}
              className="w-full text-sm px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none text-slate-800 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              City
            </label>
            <input
              type="text"
              required
              value={library.city}
              onChange={(e) => setLibrary({ ...library, city: e.target.value })}
              className="w-full text-sm px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none text-slate-800 transition-all"
            />
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
            Library Amenities & Verification:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs sm:text-sm font-semibold">
            <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-primary/40 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={library.amenities.ac}
                onChange={(e) =>
                  setLibrary({
                    ...library,
                    amenities: { ...library.amenities, ac: e.target.checked },
                  })
                }
                className="w-4 h-4 rounded text-primary focus:ring-primary/20 cursor-pointer"
              />
              <span className="text-slate-800">Air Conditioning</span>
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-primary/40 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={library.amenities.wifi}
                onChange={(e) =>
                  setLibrary({
                    ...library,
                    amenities: { ...library.amenities, wifi: e.target.checked },
                  })
                }
                className="w-4 h-4 rounded text-primary focus:ring-primary/20 cursor-pointer"
              />
              <span className="text-slate-800">Fast WiFi</span>
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-primary/40 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={library.amenities.powerOutlets}
                onChange={(e) =>
                  setLibrary({
                    ...library,
                    amenities: { ...library.amenities, powerOutlets: e.target.checked },
                  })
                }
                className="w-4 h-4 rounded text-primary focus:ring-primary/20 cursor-pointer"
              />
              <span className="text-slate-800">Power Sockets</span>
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-primary/40 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={library.amenities.cctv}
                onChange={(e) =>
                  setLibrary({
                    ...library,
                    amenities: { ...library.amenities, cctv: e.target.checked },
                  })
                }
                className="w-4 h-4 rounded text-primary focus:ring-primary/20 cursor-pointer"
              />
              <span className="text-slate-800">CCTV Monitoring</span>
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-primary/40 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={library.amenities.lockers}
                onChange={(e) =>
                  setLibrary({
                    ...library,
                    amenities: { ...library.amenities, lockers: e.target.checked },
                  })
                }
                className="w-4 h-4 rounded text-primary focus:ring-primary/20 cursor-pointer"
              />
              <span className="text-slate-800">Storage Lockers</span>
            </label>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider transition-all shadow-xl shadow-primary/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving Profile Changes...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
