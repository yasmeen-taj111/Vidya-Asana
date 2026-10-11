import React, { useState, useEffect } from 'react';
import { librariesApi } from '../../api/libraries';
import { Library, SeatType } from '../../api/types';
import { LibraryMap } from '../../components/Map/LibraryMap';
import { Link } from 'react-router-dom';
import {
  Compass,
  Search,
  Filter,
  MapPin,
  Sparkles,
  Wifi,
  Wind,
  Shield,
  Zap,
  ArrowRight,
  Sliders,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';

export const Discover: React.FC = () => {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [recommendations, setRecommendations] = useState<Library[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeatType, setSelectedSeatType] = useState<SeatType | ''>('');
  const [pricingFilter, setPricingFilter] = useState<'ALL' | 'FREE' | 'PAID'>('ALL');
  const [freeOnly, setFreeOnly] = useState(false);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  // Geolocation
  const [userLocation, setUserLocation] = useState<[number, number]>([12.9716, 77.5946]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {
          // fallback to Bengaluru defaults
        }
      );
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const isFreeParam =
        pricingFilter === 'FREE' ? true : pricingFilter === 'PAID' ? false : (freeOnly ? true : undefined);
      const [allData, recData] = await Promise.all([
        librariesApi.getLibraries({
          q: searchQuery || undefined,
          seatType: selectedSeatType || undefined,
          isFree: isFreeParam,
          lat: userLocation[0],
          lng: userLocation[1],
        }),
        librariesApi.getRecommendations({
          lat: userLocation[0],
          lng: userLocation[1],
          isFree: isFreeParam,
        }),
      ]);
      setLibraries(allData.libraries);
      setRecommendations(recData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, selectedSeatType, pricingFilter, freeOnly, userLocation]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Compass className="w-5 h-5 text-primary" /> Discover Libraries & Study Hubs
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Explore nearby air-conditioned facilities with verified amenities and live seat availability.
        </p>
      </div>

      {/* Recommended For You Ribbon */}
      {recommendations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Personalized Recommendations (Based on your preferences)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="bg-white p-5 rounded-3xl border border-primary/20 shadow-md hover:shadow-lg transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-slate-900 group-hover:text-primary transition-colors">
                      {rec.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {rec.isFree ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Free
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                          Paid
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                        {rec.matchScore}% Match
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2">{rec.description}</p>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>{rec.distanceKm ? `${rec.distanceKm} km away` : rec.city}</span>
                    <span>•</span>
                    <span className="font-semibold text-slate-700">{rec.totalSeats} Desks</span>
                    <span>•</span>
                    <span className={rec.isFree ? 'font-bold text-emerald-600' : 'font-bold text-blue-600'}>
                      {rec.isFree ? 'Free Admission' : 'Paid Passes'}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/app/libraries/${rec.id}/book`}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Select Desk & Book</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search library by name, area or city..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-primary outline-none"
            />
          </div>

          <select
            value={selectedSeatType}
            onChange={(e) => setSelectedSeatType(e.target.value as SeatType | '')}
            className="p-2 rounded-xl border border-slate-200 outline-none text-xs"
          >
            <option value="">All Seat Types</option>
            <option value="INDIVIDUAL">INDIVIDUAL</option>
            <option value="COMPUTER">COMPUTER</option>
            <option value="GROUP">GROUP</option>
            <option value="ACCESSIBLE">ACCESSIBLE</option>
          </select>

          {/* Admission Type Filter */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => {
                setPricingFilter('ALL');
                setFreeOnly(false);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                pricingFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Admissions
            </button>
            <button
              type="button"
              onClick={() => {
                setPricingFilter('FREE');
                setFreeOnly(true);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                pricingFilter === 'FREE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-emerald-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Free Admission
            </button>
            <button
              type="button"
              onClick={() => {
                setPricingFilter('PAID');
                setFreeOnly(false);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                pricingFilter === 'PAID'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-500 hover:text-primary'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Paid Passes
            </button>
          </div>
        </div>
      </div>

      {/* Map & List Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Leaflet Map */}
        <div className="lg:col-span-7 h-[480px]">
          <LibraryMap
            libraries={libraries}
            center={userLocation}
            selectedLibraryId={selectedLibraryId}
            onSelectLibrary={(lib) => setSelectedLibraryId(lib.id)}
          />
        </div>

        {/* Scrollable Library List */}
        <div className="lg:col-span-5 space-y-3 max-h-[480px] overflow-y-auto pr-1">
          {libraries.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No approved libraries found matching your criteria.
            </div>
          ) : (
            libraries.map((lib) => (
              <div
                key={lib.id}
                onClick={() => setSelectedLibraryId(lib.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedLibraryId === lib.id
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{lib.name}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{lib.address}</p>
                  </div>
                  {lib.isFree ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs shrink-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                      Free Admission
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5 shadow-2xs shrink-0">
                      <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                      Paid Passes
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100 flex-wrap">
                  <span className="font-semibold text-primary">
                    {lib.distanceKm ? `${lib.distanceKm} km away` : lib.city}
                  </span>
                  <span>•</span>
                  <span>{lib.totalSeats} Desks</span>
                  <span>•</span>
                  <span>{lib.floorCount} Floor(s)</span>
                  <span>•</span>
                  <span className={`font-bold ${lib.isFree ? 'text-emerald-700' : 'text-blue-700'}`}>
                    {lib.isFree ? '100% Free Admission' : 'Paid Slot Passes'}
                  </span>
                </div>

                <Link
                  to={`/app/libraries/${lib.id}/book`}
                  className="mt-3 block w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs text-center transition-colors"
                >
                  Inspect Floor Layout & Book →
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
