import React, { useState, useEffect } from 'react';
import { ownerApi, OwnerStats } from '../../api/owner';
import { Library, User } from '../../api/types';
import { useUiStore } from '../../store/uiStore';
import { useRealtimeBookings } from '../../realtime/useRealtimeBookings';
import {
  Building,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Users,
  BookOpen,
  Mail,
  Phone,
  MapPin,
  X,
  ExternalLink,
} from 'lucide-react';

export const OwnerDashboard: React.FC = () => {
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterAdmission, setFilterAdmission] = useState<'ALL' | 'FREE' | 'PAID'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLib, setSelectedLib] = useState<{ library: Library; admin: User } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const { addToast } = useUiStore();

  const loadData = async () => {
    try {
      setLoading(true);
      const isFreeParam =
        filterAdmission === 'FREE' ? true : filterAdmission === 'PAID' ? false : undefined;
      const [sData, lData] = await Promise.all([
        ownerApi.getStats(),
        ownerApi.getLibraries({
          status: filterStatus || undefined,
          isFree: isFreeParam,
          q: searchQuery || undefined,
        }),
      ]);
      setStats(sData);
      setLibraries(lData.libraries);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus, filterAdmission, searchQuery]);

  useRealtimeBookings(loadData);

  const handleSelectLibrary = async (lib: Library) => {
    try {
      const data = await ownerApi.getLibrary(lib.id);
      setSelectedLib(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await ownerApi.approveLibrary(id);
      addToast({
        type: 'success',
        title: 'Library Approved!',
        message: 'Listing activated. Confirmation email sent via SMTP to library admin.',
      });
      setSelectedLib(null);
      loadData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Approval Failed',
        message: err.message || 'Could not approve library.',
      });
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      addToast({
        type: 'warning',
        title: 'Reason Required',
        message: 'Please provide a clear rejection explanation for the library administrator.',
      });
      return;
    }

    try {
      await ownerApi.rejectLibrary(id, rejectReason);
      addToast({
        type: 'info',
        title: 'Library Listing Rejected',
        message: 'Rejection email with decision notes sent to library admin.',
      });
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedLib(null);
      loadData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Rejection Failed',
        message: err.message || 'Could not reject library.',
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Platform Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Listings</span>
            <p className="text-2xl font-black text-slate-900">{stats.totalLibraries}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-amber-200/80 bg-amber-50/20 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Pending Review</span>
            <p className="text-2xl font-black text-amber-700">{stats.pending}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-emerald-200/80 bg-emerald-50/20 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Approved</span>
            <p className="text-2xl font-black text-emerald-700">{stats.approved}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-rose-200/80 bg-rose-50/20 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Rejected</span>
            <p className="text-2xl font-black text-rose-700">{stats.rejected}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Active Students</span>
            <p className="text-2xl font-black text-primary">{stats.totalUsers}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-teal uppercase tracking-wider">Reservations</span>
            <p className="text-2xl font-black text-teal">{stats.totalBookings}</p>
          </div>
        </div>
      )}

      {/* Main Libraries Management Panel */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        {/* Search & Filter Header */}
        <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search library name or city..."
                className="text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none w-64"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setFilterStatus('')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    filterStatus === '' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'
                  }`}
                >
                  All Status
                </button>
                <button
                  onClick={() => setFilterStatus('PENDING')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    filterStatus === 'PENDING' ? 'bg-amber-500 text-white shadow font-bold' : 'text-slate-600'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setFilterStatus('APPROVED')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    filterStatus === 'APPROVED' ? 'bg-emerald-600 text-white shadow font-bold' : 'text-slate-600'
                  }`}
                >
                  Approved
                </button>
                <button
                  onClick={() => setFilterStatus('REJECTED')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    filterStatus === 'REJECTED' ? 'bg-rose-600 text-white shadow font-bold' : 'text-slate-600'
                  }`}
                >
                  Rejected
                </button>
              </div>

              {/* Admission Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setFilterAdmission('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    filterAdmission === 'ALL' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600'
                  }`}
                >
                  All Admissions
                </button>
                <button
                  onClick={() => setFilterAdmission('FREE')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    filterAdmission === 'FREE' ? 'bg-emerald-600 text-white shadow font-bold' : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  🟢 Free Only
                </button>
                <button
                  onClick={() => setFilterAdmission('PAID')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    filterAdmission === 'PAID' ? 'bg-primary text-white shadow font-bold' : 'text-slate-600 hover:text-primary'
                  }`}
                >
                  💳 Paid Only
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Libraries Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-4 px-6">Library Details</th>
                <th className="py-4 px-6">Location</th>
                <th className="py-4 px-6">Admission</th>
                <th className="py-4 px-6">Capacity</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {libraries.map((lib) => (
                <tr key={lib.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-bold text-sm text-slate-900">{lib.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{lib.contactEmail}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-slate-700">{lib.address}</div>
                    <div className="text-[11px] text-slate-400">{lib.city}</div>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        lib.isFree
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {lib.isFree ? '🟢 Free Admission' : '💳 Paid Slots'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-semibold text-slate-900">{lib.totalSeats} Desks</span>
                    <span className="text-slate-400 block text-[11px]">{lib.floorCount} Floor(s)</span>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        lib.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : lib.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {lib.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => handleSelectLibrary(lib)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                    >
                      Inspect & Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Drawer / Modal */}
      {selectedLib && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-scale-up space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Registration ID: {selectedLib.library.id}
                </span>
                <h3 className="text-xl font-bold text-slate-900">{selectedLib.library.name}</h3>
              </div>
              <button
                onClick={() => setSelectedLib(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p className="leading-relaxed text-slate-700">{selectedLib.library.description}</p>

              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block font-medium">Administrator:</span>
                  <span className="font-bold text-slate-900">{selectedLib.admin.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Admin Contact:</span>
                  <span className="font-mono text-slate-800">{selectedLib.admin.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Location:</span>
                  <span className="text-slate-800">{selectedLib.library.address}, {selectedLib.library.city}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Admission:</span>
                  <span
                    className={`inline-flex items-center gap-1 mt-0.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                      selectedLib.library.isFree
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {selectedLib.library.isFree ? '🟢 Free Admission' : '💳 Paid Slots'}
                  </span>
                </div>
              </div>
            </div>

            {/* Decision Controls */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              {selectedLib.library.status !== 'APPROVED' && (
                <button
                  onClick={() => handleApprove(selectedLib.library.id)}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve & Notify
                </button>
              )}

              {selectedLib.library.status !== 'REJECTED' && (
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" /> Reject Listing
                </button>
              )}

              <button
                onClick={() => setSelectedLib(null)}
                className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Dialog */}
      {showRejectModal && selectedLib && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-up space-y-4">
            <h4 className="font-bold text-slate-900 text-base">State Rejection Justification</h4>
            <p className="text-xs text-slate-500">
              This message will be communicated directly to the library owner via SMTP email.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Incomplete address verification or invalid documentation..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-rose-500 outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleReject(selectedLib.library.id)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                Confirm Rejection & Send Email
              </button>
              <button
                onClick={() => setShowRejectModal(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
