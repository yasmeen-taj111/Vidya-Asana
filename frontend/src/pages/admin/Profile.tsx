import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { Library } from '../../api/types';
import { useUiStore } from '../../store/uiStore';
import { Building, Save, MapPin, Wifi, Wind, Shield, Zap, Lock } from 'lucide-react';

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
    <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 border border-slate-100 shadow-xl space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-lg text-slate-900">Library Profile & Amenities</h3>
          <p className="text-xs text-slate-500">Configure your public discovery card and campus facilities</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
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

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Library Name</label>
          <input
            type="text"
            required
            value={library.name}
            onChange={(e) => setLibrary({ ...library, name: e.target.value })}
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none font-bold"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
          <textarea
            rows={3}
            value={library.description || ''}
            onChange={(e) => setLibrary({ ...library, description: e.target.value })}
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
            <input
              type="text"
              required
              value={library.address}
              onChange={(e) => setLibrary({ ...library, address: e.target.value })}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
            <input
              type="text"
              required
              value={library.city}
              onChange={(e) => setLibrary({ ...library, city: e.target.value })}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none"
            />
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-700 block">Library Amenities:</span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={library.amenities.ac}
                onChange={(e) =>
                  setLibrary({
                    ...library,
                    amenities: { ...library.amenities, ac: e.target.checked },
                  })
                }
                className="rounded text-primary"
              />
              <Wind className="w-4 h-4 text-primary" />
              <span>Air Conditioning</span>
            </label>

            <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={library.amenities.wifi}
                onChange={(e) =>
                  setLibrary({
                    ...library,
                    amenities: { ...library.amenities, wifi: e.target.checked },
                  })
                }
                className="rounded text-primary"
              />
              <Wifi className="w-4 h-4 text-teal" />
              <span>Fast WiFi</span>
            </label>

            <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={library.amenities.powerOutlets}
                onChange={(e) =>
                  setLibrary({
                    ...library,
                    amenities: { ...library.amenities, powerOutlets: e.target.checked },
                  })
                }
                className="rounded text-primary"
              />
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Power Sockets</span>
            </label>

            <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={library.amenities.cctv}
                onChange={(e) =>
                  setLibrary({
                    ...library,
                    amenities: { ...library.amenities, cctv: e.target.checked },
                  })
                }
                className="rounded text-primary"
              />
              <Shield className="w-4 h-4 text-slate-600" />
              <span>CCTV Monitoring</span>
            </label>

            <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={library.amenities.lockers}
                onChange={(e) =>
                  setLibrary({
                    ...library,
                    amenities: { ...library.amenities, lockers: e.target.checked },
                  })
                }
                className="rounded text-primary"
              />
              <Lock className="w-4 h-4 text-slate-600" />
              <span>Storage Lockers</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving Profile...' : 'Save Profile Changes'}
        </button>
      </form>
    </div>
  );
};
