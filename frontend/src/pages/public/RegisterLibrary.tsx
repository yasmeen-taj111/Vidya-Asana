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
import { TimeSlot } from '../../api/types';
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
  Clock,
} from 'lucide-react';

export const RegisterLibrary: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Admin details
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPhone, setAdminPhone] = useState('');

  // Step 2: Library details
  const [libName, setLibName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [latitude, setLatitude] = useState(12.9716);
  const [longitude, setLongitude] = useState(77.5946);

  // Step 3: Amenities & Pricing
  const [lockers, setLockers] = useState(true);
  const [cctv, setCctv] = useState(true);
  const [ac, setAc] = useState(true);
  const [wifi, setWifi] = useState(true);
  const [powerOutlets, setPowerOutlets] = useState(true);
  const [isFree, setIsFree] = useState(false);

  // Per-slot pricing (in INR ₹)
  const [morningPrice, setMorningPrice] = useState(50);
  const [afternoonPrice, setAfternoonPrice] = useState(60);
  const [eveningPrice, setEveningPrice] = useState(50);
  const [nightPrice, setNightPrice] = useState(40);

  const { user, isAuthenticated, setAuth } = useAuthStore();
  const { addToast } = useUiStore();
  const navigate = useNavigate();

  // If already authenticated as library admin, redirect directly to /admin
  useEffect(() => {
    if (isAuthenticated && user?.role === 'LIBRARY_ADMIN') {
      navigate('/admin', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleNext = () => {
    if (step === 1) {
      if (!adminName.trim() || !adminEmail.trim() || !adminPassword) {
        addToast({ type: 'warning', title: 'Missing fields', message: 'Please complete all admin account fields.' });
        return;
      }
      if (adminPassword.length < 8) {
        addToast({ type: 'warning', title: 'Weak Password', message: 'Password must be at least 8 characters.' });
        return;
      }
      setStep(2);
      return;
    } else if (step === 2) {
      if (!libName.trim() || !address.trim() || !city.trim()) {
        addToast({ type: 'warning', title: 'Missing fields', message: 'Please provide library name, address and city.' });
        return;
      }
      setStep(3);
      return;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const slotPricingPayload = {
        morningPrice: isFree ? 0 : morningPrice,
        afternoonPrice: isFree ? 0 : afternoonPrice,
        eveningPrice: isFree ? 0 : eveningPrice,
        nightPrice: isFree ? 0 : nightPrice,
      };

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
          address,
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
          slotPricing: slotPricingPayload,
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
          address,
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
        const initialSlots: TimeSlot[] = [
          {
            id: `slot-${libId}-morning`,
            libraryId: libId,
            name: 'MORNING',
            startTime: '06:00',
            endTime: '12:00',
            isFree: isFree || morningPrice === 0,
            pricePaise: isFree ? 0 : morningPrice * 100,
            isActive: true,
          },
          {
            id: `slot-${libId}-afternoon`,
            libraryId: libId,
            name: 'AFTERNOON',
            startTime: '12:00',
            endTime: '17:00',
            isFree: isFree || afternoonPrice === 0,
            pricePaise: isFree ? 0 : afternoonPrice * 100,
            isActive: true,
          },
          {
            id: `slot-${libId}-evening`,
            libraryId: libId,
            name: 'EVENING',
            startTime: '17:00',
            endTime: '21:00',
            isFree: isFree || eveningPrice === 0,
            pricePaise: isFree ? 0 : eveningPrice * 100,
            isActive: true,
          },
          {
            id: `slot-${libId}-night`,
            libraryId: libId,
            name: 'NIGHT',
            startTime: '21:00',
            endTime: '23:59',
            isFree: isFree || nightPrice === 0,
            pricePaise: isFree ? 0 : nightPrice * 100,
            isActive: true,
          },
        ];
        saveStoredSlotsForLibrary(libId, initialSlots);

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
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                step >= 1 ? 'bg-primary text-white shadow-sm ring-2 ring-primary/20' : 'bg-slate-100 text-slate-400'
              }`}
              title="Step 1: Administrator Account"
            >
              1
            </button>
            <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-primary' : 'bg-slate-200'}`} />
            <button
              type="button"
              onClick={() => {
                if (!adminName.trim() || !adminEmail.trim() || adminPassword.length < 8) {
                  addToast({ type: 'warning', title: 'Incomplete Step 1', message: 'Please complete admin account details first.' });
                  return;
                }
                setStep(2);
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                step >= 2 ? 'bg-primary text-white shadow-sm ring-2 ring-primary/20' : 'bg-slate-100 text-slate-400'
              }`}
              title="Step 2: Library Information"
            >
              2
            </button>
            <div className={`w-8 h-0.5 ${step >= 3 ? 'bg-primary' : 'bg-slate-200'}`} />
            <button
              type="button"
              onClick={() => {
                if (!adminName.trim() || !adminEmail.trim() || adminPassword.length < 8) {
                  addToast({ type: 'warning', title: 'Incomplete Step 1', message: 'Please complete admin account details first.' });
                  setStep(1);
                  return;
                }
                if (!libName.trim() || !address.trim() || !city.trim()) {
                  addToast({ type: 'warning', title: 'Incomplete Step 2', message: 'Please complete library location details first.' });
                  setStep(2);
                  return;
                }
                setStep(3);
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                step >= 3 ? 'bg-primary text-white shadow-sm ring-2 ring-primary/20' : 'bg-slate-100 text-slate-400'
              }`}
              title="Step 3: Amenities & Slot Pricing"
            >
              3
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step < 3) {
              handleNext();
            } else {
              handleSubmit(e);
            }
          }}
          className="space-y-4"
        >
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

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="42 MG Road, Ashok Nagar"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Bengaluru"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" /> Geographic Coordinates (Lat / Lng)
                </span>
                <p className="text-[11px] text-slate-500">
                  Used for GPS-based nearby library discovery on student maps.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-slate-500">Latitude:</span>
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(parseFloat(e.target.value) || 12.9716)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Longitude:</span>
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(parseFloat(e.target.value) || 77.5946)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="border-b pb-2 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900">
                  Step 3: Amenities & Admission Pricing
                </h3>
                <span className="text-[11px] font-medium text-slate-500">
                  Facilities & slot fees
                </span>
              </div>

              {/* Amenities */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 block">Available Amenities:</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ac}
                      onChange={(e) => setAc(e.target.checked)}
                      className="rounded text-primary"
                    />
                    <Wind className="w-4 h-4 text-primary" />
                    <span className="font-medium text-slate-800">Air Conditioned</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wifi}
                      onChange={(e) => setWifi(e.target.checked)}
                      className="rounded text-primary"
                    />
                    <Wifi className="w-4 h-4 text-teal" />
                    <span className="font-medium text-slate-800">High-Speed WiFi</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={powerOutlets}
                      onChange={(e) => setPowerOutlets(e.target.checked)}
                      className="rounded text-primary"
                    />
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="font-medium text-slate-800">Power Sockets</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cctv}
                      onChange={(e) => setCctv(e.target.checked)}
                      className="rounded text-primary"
                    />
                    <Shield className="w-4 h-4 text-slate-600" />
                    <span className="font-medium text-slate-800">24/7 CCTV Security</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lockers}
                      onChange={(e) => setLockers(e.target.checked)}
                      className="rounded text-primary"
                    />
                    <Lock className="w-4 h-4 text-slate-600" />
                    <span className="font-medium text-slate-800">Bag Lockers</span>
                  </label>
                </div>
              </div>

              {/* Admission Pricing Mode */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <span className="text-xs font-semibold text-slate-700 block">
                  Admission Pricing Structure:
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFree(true)}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                      isFree
                        ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${isFree ? 'text-emerald-800' : 'text-slate-800'}`}>
                        Free Admission
                      </span>
                      {isFree && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      100% complimentary access for all registered students (all 4 slots ₹0).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsFree(false)}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                      !isFree
                        ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${!isFree ? 'text-primary' : 'text-slate-800'}`}>
                        Paid / Slot Fees
                      </span>
                      {!isFree && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Configure individual admission fees for each operating study window.
                    </p>
                  </button>
                </div>

                {/* If Free: Informational Banner */}
                {isFree ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-900">
                        Complimentary Public Access
                      </p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Students can reserve seats during any morning, afternoon, evening, or late-night slot with zero charges (₹0).
                      </p>
                    </div>
                  </div>
                ) : (
                  /* If Paid: Slot Pricing Configurator */
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-primary" /> Operating Slot Rates (₹ per pass)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Set the fee charged for each scheduled study slot:
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-slate-400 font-medium">Presets:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setMorningPrice(50);
                            setAfternoonPrice(60);
                            setEveningPrice(50);
                            setNightPrice(40);
                          }}
                          className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-primary font-medium transition-colors"
                        >
                          Standard
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMorningPrice(30);
                            setAfternoonPrice(40);
                            setEveningPrice(30);
                            setNightPrice(20);
                          }}
                          className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-primary font-medium transition-colors"
                        >
                          Budget
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMorningPrice(80);
                            setAfternoonPrice(100);
                            setEveningPrice(80);
                            setNightPrice(60);
                          }}
                          className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-primary font-medium transition-colors"
                        >
                          Premium
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Morning Slot */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            🌅 Morning Slot
                          </span>
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/50">
                            06:00 – 12:00
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-600">₹</span>
                          <input
                            type="number"
                            min={0}
                            step={5}
                            value={morningPrice}
                            onChange={(e) => setMorningPrice(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full text-xs font-bold py-1.5 px-2.5 rounded-lg border border-slate-200 focus:border-primary outline-none"
                            placeholder="50"
                          />
                          <span className="text-[11px] text-slate-400 whitespace-nowrap">/ pass</span>
                        </div>
                      </div>

                      {/* Afternoon Slot */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            ☀️ Afternoon Slot
                          </span>
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/50">
                            12:00 – 17:00
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-600">₹</span>
                          <input
                            type="number"
                            min={0}
                            step={5}
                            value={afternoonPrice}
                            onChange={(e) => setAfternoonPrice(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full text-xs font-bold py-1.5 px-2.5 rounded-lg border border-slate-200 focus:border-primary outline-none"
                            placeholder="60"
                          />
                          <span className="text-[11px] text-slate-400 whitespace-nowrap">/ pass</span>
                        </div>
                      </div>

                      {/* Evening Slot */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            🌆 Evening Slot
                          </span>
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                            17:00 – 21:00
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-600">₹</span>
                          <input
                            type="number"
                            min={0}
                            step={5}
                            value={eveningPrice}
                            onChange={(e) => setEveningPrice(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full text-xs font-bold py-1.5 px-2.5 rounded-lg border border-slate-200 focus:border-primary outline-none"
                            placeholder="50"
                          />
                          <span className="text-[11px] text-slate-400 whitespace-nowrap">/ pass</span>
                        </div>
                      </div>

                      {/* Late Night Slot */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            🌙 Late Night Slot
                          </span>
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200/50">
                            21:00 – 23:59
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-600">₹</span>
                          <input
                            type="number"
                            min={0}
                            step={5}
                            value={nightPrice}
                            onChange={(e) => setNightPrice(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full text-xs font-bold py-1.5 px-2.5 rounded-lg border border-slate-200 focus:border-primary outline-none"
                            placeholder="40"
                          />
                          <span className="text-[11px] text-slate-400 whitespace-nowrap">/ pass</span>
                        </div>
                      </div>
                    </div>

                    {/* Summary pill */}
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Slot Fees Summary:</span>
                      <div className="flex items-center gap-2 font-mono font-bold text-slate-800 text-[11px]">
                        <span>🌅 ₹{morningPrice}</span>
                        <span className="text-slate-300">•</span>
                        <span>☀️ ₹{afternoonPrice}</span>
                        <span className="text-slate-300">•</span>
                        <span>🌆 ₹{eveningPrice}</span>
                        <span className="text-slate-300">•</span>
                        <span>🌙 ₹{nightPrice}</span>
                      </div>
                    </div>
                  </div>
                )}
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
