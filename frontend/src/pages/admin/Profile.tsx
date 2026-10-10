import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { Library } from '../../api/types';
import { useUiStore } from '../../store/uiStore';
import { LocationPickerMap } from '../../components/Map/LocationPickerMap';
import { geocodeAddress } from '../../utils/geocoding';

export const Profile: React.FC = () => {
  const [library, setLibrary] = useState<Library | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const { addToast } = useUiStore();

  useEffect(() => {
    adminApi
      .getLibrary()
      .then((data) => setLibrary(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleGeocode = async () => {
    if (!library) return;
    const query = [library.address, library.city].filter(Boolean).join(', ');
    if (!query) {
      addToast({ type: 'warning', title: 'Address Needed', message: 'Please enter an address or city first.' });
      return;
    }

    setGeocoding(true);
    try {
      const res = await geocodeAddress(library.address, { city: library.city });
      if (res) {
        setLibrary({
          ...library,
          latitude: res.lat,
          longitude: res.lng,
        });
        addToast({
          type: 'success',
          title: 'Coordinates Found',
          message: `Detected (${res.lat.toFixed(4)}, ${res.lng.toFixed(4)}): ${res.displayName}`,
        });
      } else {
        addToast({
          type: 'error',
          title: 'Location Not Found',
          message: 'Could not pinpoint coordinates. You can click on the map to place the pin manually.',
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Geocoding Error',
        message: err.message || 'Failed to detect location.',
      });
    } finally {
      setGeocoding(false);
    }
  };

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

        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Address / Landmark</label>
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

          <div className="flex items-center justify-between">
            <div className="text-[11px] text-slate-500">
              Pins your library on student discovery maps accurately
            </div>
            <button
              type="button"
              disabled={geocoding}
              onClick={handleGeocode}
              className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5 transition-all"
            >
              {geocoding ? 'Detecting GPS...' : '✨ Detect GPS from Address'}
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Interactive Map Pin & Coordinates (Drag or click to adjust entrance)
            </label>
            <LocationPickerMap
              latitude={Number(library.latitude) || 12.9716}
              longitude={Number(library.longitude) || 77.5946}
              onChange={(lat, lng) => setLibrary({ ...library, latitude: lat, longitude: lng })}
              height="240px"
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
              <span>Storage Lockers</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? 'Saving Profile...' : 'Save Profile Changes'}
        </button>
      </form>
    </div>
  );
};
