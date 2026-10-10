import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { useUiStore } from '../../store/uiStore';
import {
  findStoredUserByEmail,
  saveStoredUser,
  saveStoredLibrary,
  saveStoredFloorsForLibrary,
  saveStoredSlotsForLibrary,
  addStoredNotification,
} from '../../mocks/storage';
import {
  Building,
  User,
  Mail,
  Key,
  Phone,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Wifi,
  Wind,
  Shield,
  Zap,
  Lock,
  Search,
  Loader2,
  Navigation,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LocationPickerMap } from '../../components/Map/LocationPickerMap';
import { geocodeAddress } from '../../utils/geocoding';

export const RegisterLibrary: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Admin details
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPhone, setAdminPhone] = useState('');

  // Step 2: Library & Location details
  const [libName, setLibName] = useState('');
  const [description, setDescription] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [state, setState] = useState('Karnataka');
  const [postalCode, setPostalCode] = useState('560001');
  const [country, setCountry] = useState('India');
  const [latitude, setLatitude] = useState(12.9716);
  const [longitude, setLongitude] = useState(77.5946);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodedLabel, setGeocodedLabel] = useState<string | null>(null);
  const [showManualCoords, setShowManualCoords] = useState(false);

  // Step 3: Amenities & Pricing
  const [lockers, setLockers] = useState(true);
  const [cctv, setCctv] = useState(true);
  const [ac, setAc] = useState(true);
  const [wifi, setWifi] = useState(true);
  const [powerOutlets, setPowerOutlets] = useState(true);
  const [isFree, setIsFree] = useState(false);

  const { user, isAuthenticated, setAuth } = useAuthStore();
  const { addToast } = useUiStore();
  const navigate = useNavigate();

  // If already authenticated as library admin, redirect directly to /admin
  useEffect(() => {
    if (isAuthenticated && user?.role === 'LIBRARY_ADMIN') {
      navigate('/admin', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleAutoGeocode = async (silent = false) => {
    const fullQuery = [streetAddress, landmark, city, state, postalCode, country].filter(Boolean).join(', ');
    if (!fullQuery.trim()) {
      if (!silent) {
        addToast({ type: 'warning', title: 'Location Information Needed', message: 'Please enter street address or city first.' });
      }
      return;
    }

    setIsGeocoding(true);
    try {
      const res = await geocodeAddress(fullQuery, {
        city,
        state,
        postalCode,
        country,
      });

      if (res) {
        setLatitude(res.lat);
        setLongitude(res.lng);
        setGeocodedLabel(res.displayName);
        if (!silent) {
          addToast({
            type: 'success',
            title: 'Coordinates Extracted!',
            message: `Extracted GPS: ${res.lat.toFixed(5)}, ${res.lng.toFixed(5)}`,
          });
        }
      } else if (!silent) {
        addToast({
          type: 'warning',
          title: 'Location Notice',
          message: 'Could not pinpoint exact street. You can click or drag the marker directly on the map.',
        });
      }
    } catch (err) {
      console.warn('[RegisterLibrary] Geocoding error:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!adminName || !adminEmail || !adminPassword) {
        addToast({ type: 'warning', title: 'Missing fields', message: 'Please complete all admin account fields.' });
        return;
      }
      if (adminPassword.length < 8) {
        addToast({ type: 'warning', title: 'Weak Password', message: 'Password must be at least 8 characters.' });
        return;
      }

      // If user is already registered as a library admin, smoothly log them in
      const existing = findStoredUserByEmail(adminEmail);
      if (existing && existing.role === 'LIBRARY_ADMIN') {
        setAuth(existing, `mock-token-${existing.id}-${Date.now()}`);
        addToast({
          type: 'success',
          title: 'Welcome Back!',
          message: 'Found your registered library account. Redirecting to your dashboard...',
        });
        navigate('/admin');
        return;
      }
    } else if (step === 2) {
      if (!libName || !streetAddress || !city) {
        addToast({ type: 'warning', title: 'Missing fields', message: 'Please provide library name, street address and city.' });
        return;
      }
      // If coordinates are unchanged default, auto-geocode in background
      if (latitude === 12.9716 && longitude === 77.5946) {
        handleAutoGeocode(true);
      }
    }
    setStep((s) => s + 1);
  };

  const getFullFormattedAddress = () => {
    const locParts = [
      streetAddress,
      landmark,
      city,
      state,
      postalCode ? `${postalCode}` : '',
      country,
    ].filter(Boolean);
    return locParts.join(', ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const fullAddress = getFullFormattedAddress();

    try {
      const data = await authApi.registerLibrary({
        admin: {
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          phone: adminPhone || undefined,
        },
        library: {
          name: libName,
          description,
          address: fullAddress,
          city,
          latitude,
          longitude,
          contactEmail: adminEmail,
          contactPhone: adminPhone || undefined,
          amenities: {
            lockers,
            cctv,
            ac,
            wifi,
            powerOutlets,
          },
          isFree,
        },
      });

      setAuth(data.user, data.accessToken);
      addToast({
        type: 'success',
        title: 'Registration Submitted!',
        message: 'Your library registration is pending platform owner review.',
      });
      navigate('/admin');
    } catch (err: any) {
      // 1. If user is already registered as a library admin, smoothly log them in to their dashboard
      const existing = findStoredUserByEmail(adminEmail);
      if (existing && existing.role === 'LIBRARY_ADMIN') {
        setAuth(existing, `mock-token-${existing.id}-${Date.now()}`);
        addToast({
          type: 'success',
          title: 'Welcome Back!',
          message: 'Found your registered library account. Redirecting to your dashboard...',
        });
        navigate('/admin');
        return;
      }

      // 2. If email belongs to an existing student user
      if (existing && existing.role === 'USER') {
        addToast({
          type: 'warning',
          title: 'Account Already Exists',
          message: 'This email is already registered as a student account. Please sign in or use a different email for your library.',
        });
        setLoading(false);
        return;
      }

      const isNetworkError =
        err?.message === 'Network Error' ||
        err?.name === 'AxiosError' ||
        (typeof err?.message === 'string' && err.message.toLowerCase().includes('network'));

      // If network is unreachable while in mock mode, complete registration directly into storage
      if (isNetworkError && import.meta.env.VITE_USE_MOCKS === 'true') {

        const libId = `lib-${Date.now()}`;
        const newAdmin = {
          id: `usr-${Date.now()}`,
          name: adminName,
          email: adminEmail,
          role: 'LIBRARY_ADMIN' as const,
          phone: adminPhone || undefined,
          libraryId: libId,
          createdAt: new Date().toISOString(),
        };
        saveStoredUser(newAdmin);

        const newLib = {
          id: libId,
          name: libName,
          description: description || undefined,
          address: fullAddress,
          city,
          latitude,
          longitude,
          contactEmail: adminEmail,
          contactPhone: adminPhone || undefined,
          amenities: {
            lockers,
            cctv,
            ac,
            wifi,
            powerOutlets,
          },
          isFree,
          status: 'PENDING' as const,
          seatCounts: { INDIVIDUAL: 0, GROUP: 0, ACCESSIBLE: 0, COMPUTER: 0 },
          totalSeats: 0,
          floorCount: 0,
          createdAt: new Date().toISOString(),
        };
        saveStoredLibrary(newLib);
        saveStoredFloorsForLibrary(libId, {});
        saveStoredSlotsForLibrary(libId, []);

        addStoredNotification(newAdmin.id, {
          id: `notif-${Date.now()}`,
          title: 'Library Registration Submitted! 🏛️',
          body: `Your application for "${newLib.name}" is pending platform owner verification. Once approved, you can build your floor layouts and accept bookings.`,
          type: 'SYSTEM',
          isRead: false,
          createdAt: new Date().toISOString(),
        });

        setAuth(newAdmin, `mock-token-${newAdmin.id}-${Date.now()}`);
        addToast({
          type: 'success',
          title: 'Registration Submitted!',
          message: 'Your library registration is pending platform owner review.',
        });
        navigate('/admin');
        return;
      }

      addToast({
        type: 'error',
        title: 'Registration Error',
        message: isNetworkError
          ? 'Unable to reach the server. Please verify the backend is running on http://localhost:4000.'
          : err.message || 'Could not complete library registration.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-12 px-4 sm:px-0">
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-navy text-white flex items-center justify-center mx-auto shadow-md">
            <Building className="w-6 h-6 text-accent" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">List Your Library</h2>
          <p className="text-xs text-slate-500">
            Join the Vidya Asana network to automate reservations and prevent no-shows
          </p>

          {/* Stepper Indicator */}
          <div className="flex items-center justify-center gap-2 pt-4">
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= 1 ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-slate-400'
              }`}
            >
              1
            </span>
            <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-primary' : 'bg-slate-200'}`} />
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= 2 ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-slate-400'
              }`}
            >
              2
            </span>
            <div className={`w-8 h-0.5 ${step >= 3 ? 'bg-primary' : 'bg-slate-200'}`} />
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= 3 ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-slate-400'
              }`}
            >
              3
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-sm text-slate-900 border-b pb-2">
                Step 1: Library Administrator Account
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Rajesh Kumar"
                    className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@centrallibrary.org"
                    className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password (Min 8 characters)</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    placeholder="+91 80 2558 1234"
                    className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-sm text-slate-900 border-b pb-2">
                Step 2: Library Location & Information
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Library Name</label>
                <input
                  type="text"
                  required
                  value={libName}
                  onChange={(e) => setLibName(e.target.value)}
                  placeholder="Central Study Hub"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Short Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Premier air-conditioned library with high-speed fiber internet and quiet research desks."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none"
                />
              </div>

              {/* Detailed Location Fields */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Street Address / Building Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="e.g. 42 Mahatma Gandhi Road, Building 3"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Area / Landmark / Locality
                    </label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Ashok Nagar, Near Trinity Metro"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Bengaluru"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="Karnataka"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">PIN / Postal Code</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="560001"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="India"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Geocoding Action Header & Live Coordinates Status */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-bold text-slate-800">
                    GPS Coordinates:
                  </span>
                  <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                    {latitude.toFixed(5)}, {longitude.toFixed(5)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleAutoGeocode(false)}
                  disabled={isGeocoding}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isGeocoding ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Extracting Coordinates...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                      <span>Auto-Detect GPS from Address</span>
                    </>
                  )}
                </button>
              </div>

              {/* Geocoded Address Preview if Available */}
              {geocodedLabel && (
                <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{geocodedLabel}</span>
                </div>
              )}

              {/* Interactive Location Picker Map */}
              <LocationPickerMap
                latitude={latitude}
                longitude={longitude}
                onChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                  setGeocodedLabel(`Fine-tuned GPS Marker: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                }}
                libraryName={libName || 'Library Entrance'}
              />

              {/* Advanced Manual Coordinates Toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowManualCoords(!showManualCoords)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                >
                  {showManualCoords ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{showManualCoords ? 'Hide Manual Coordinate Override' : 'Manual Coordinates Override (Advanced)'}</span>
                </button>

                {showManualCoords && (
                  <div className="grid grid-cols-2 gap-2 mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 animate-fade-in">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Latitude:</span>
                      <input
                        type="number"
                        step="any"
                        value={latitude}
                        onChange={(e) => setLatitude(parseFloat(e.target.value) || 12.9716)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Longitude:</span>
                      <input
                        type="number"
                        step="any"
                        value={longitude}
                        onChange={(e) => setLongitude(parseFloat(e.target.value) || 77.5946)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-bold text-sm text-slate-900 border-b pb-2">
                Step 3: Amenities & Admission
              </h3>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 block">Available Amenities:</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ac}
                      onChange={(e) => setAc(e.target.checked)}
                      className="rounded text-primary"
                    />
                    <Wind className="w-4 h-4 text-primary" />
                    <span>Air Conditioned</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wifi}
                      onChange={(e) => setWifi(e.target.checked)}
                      className="rounded text-primary"
                    />
                    <Wifi className="w-4 h-4 text-teal" />
                    <span>High-Speed WiFi</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={powerOutlets}
                      onChange={(e) => setPowerOutlets(e.target.checked)}
                      className="rounded text-primary"
                    />
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Power Sockets</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cctv}
                      onChange={(e) => setCctv(e.target.checked)}
                      className="rounded text-primary"
                    />
                    <Shield className="w-4 h-4 text-slate-600" />
                    <span>24/7 CCTV Security</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lockers}
                      onChange={(e) => setLockers(e.target.checked)}
                      className="rounded text-primary"
                    />
                    <Lock className="w-4 h-4 text-slate-600" />
                    <span>Bag Lockers</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-700 block mb-2">Admission Pricing:</span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFree(true)}
                    className={`flex-1 p-3 rounded-xl border text-xs font-bold transition-all ${
                      isFree
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    Free Admission
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFree(false)}
                    className={`flex-1 p-3 rounded-xl border text-xs font-bold transition-all ${
                      !isFree
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    Paid / Slot Fees
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stepper Buttons */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="py-2.5 px-6 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="py-2.5 px-6 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-md shadow-accent/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Registration'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
