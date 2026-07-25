"use client";

import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  UserPlus, 
  Users, 
  AlertTriangle, 
  Calendar, 
  Filter, 
  Search,
  Building2,
  FileCheck2,
  Loader2,
  RefreshCw,
  Sparkles,
  Inbox,
  History,
  MessageSquare,
  X,
  Layers,
  Clock,
  Radio
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [adminTab, setAdminTab] = useState('pending'); // 'pending' | 'history'
  const [pendingRequests, setPendingRequests] = useState([]);
  const [historyRequests, setHistoryRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Denial Remarks Modal State
  const [denialModalReq, setDenialModalReq] = useState(null);
  const [denialRemarkInput, setDenialRemarkInput] = useState('');

  // Fetch requests on mount and subscribe to Supabase Realtime
  useEffect(() => {
    fetchAdminRequests(true);

    // Set up Supabase Realtime WebSocket listener for live admin updates
    const adminChannel = supabase
      .channel('admin_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leave_requests' },
        () => {
          fetchAdminRequests(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'class_schedules' },
        () => {
          fetchAdminRequests(false);
        }
      )
      .subscribe();

    // Clean up subscription on component unmount
    return () => {
      supabase.removeChannel(adminChannel);
    };
  }, []);

  const fetchAdminRequests = async (isInitial = true) => {
    if (isInitial) setLoading(true);
    setErrorMsg(null);
    try {
      // Advanced relational query pulling teacher profile and class_schedules with substitute profiles
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          profiles:teacher_id (
            full_name,
            department
          ),
          class_schedules (
            *,
            substitute:substitute_id (
              full_name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const all = data || [];
      const pending = all.filter(r => r.status === 'pending');
      const resolved = all.filter(r => r.status !== 'pending');

      setPendingRequests(pending);
      setHistoryRequests(resolved);

    } catch (err) {
      console.error("Error fetching admin leave requests:", err);
      if (isInitial) setErrorMsg("Failed to load approval records from database.");
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  // Handle Approve Action
  const handleApprove = async (requestId) => {
    setProcessingId(requestId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: 'approved' })
        .eq('id', requestId);

      if (error) throw error;

      setSuccessMsg("Leave request approved successfully!");
      await fetchAdminRequests(false);

    } catch (err) {
      console.error("Error approving request:", err);
      setErrorMsg(err.message || "Failed to approve request.");
    } finally {
      setProcessingId(null);
    }
  };

  // Open Denial Modal
  const openDenialModal = (req) => {
    setDenialModalReq(req);
    setDenialRemarkInput('');
  };

  // Submit Denial with Admin Remarks
  const handleSubmitDenial = async (e) => {
    e.preventDefault();
    if (!denialModalReq) return;

    setProcessingId(denialModalReq.id);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ 
          status: 'denied',
          admin_remarks: denialRemarkInput.trim() || 'No specific remarks provided.'
        })
        .eq('id', denialModalReq.id);

      if (error) throw error;

      setSuccessMsg("Request denied and administrative remarks recorded.");
      setDenialModalReq(null);
      setDenialRemarkInput('');
      await fetchAdminRequests(false);

    } catch (err) {
      console.error("Error denying request:", err);
      setErrorMsg(err.message || "Failed to record request denial.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Admin Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-purple-600 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Administrator Portal • Central HR Office</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Leave Approvals & History Workflow
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <span>Review pending leave submissions and issue administrative denial remarks.</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
              Realtime Active
            </span>
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchAdminRequests(true)}
            title="Refresh Approval Queue"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200/80 pb-0">
        <button
          onClick={() => setAdminTab('pending')}
          className={`flex items-center space-x-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            adminTab === 'pending'
              ? 'border-purple-600 text-purple-700 bg-white/60 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 rounded-t-xl'
          }`}
        >
          <FileCheck2 className="w-4 h-4 text-purple-600" />
          <span>Pending Approvals</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700">
            {pendingRequests.length}
          </span>
        </button>

        <button
          onClick={() => setAdminTab('history')}
          className={`flex items-center space-x-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            adminTab === 'history'
              ? 'border-indigo-600 text-indigo-700 bg-white/60 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 rounded-t-xl'
          }`}
        >
          <History className="w-4 h-4 text-indigo-600" />
          <span>Approval History & Logs</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {historyRequests.length}
          </span>
        </button>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Pending Queue</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{pendingRequests.length} Requests</h3>
            <span className="text-[10px] text-purple-600 font-medium">Oldest first order</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <FileCheck2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Approved & Logged</p>
            <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">
              {historyRequests.filter(r => r.status === 'approved').length} Approved
            </h3>
            <span className="text-[10px] text-emerald-600 font-medium">Active coverage matrix</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Denied Submissions</p>
            <h3 className="text-2xl font-extrabold text-rose-600 mt-1">
              {historyRequests.filter(r => r.status === 'denied').length} Denied
            </h3>
            <span className="text-[10px] text-rose-600 font-medium">Recorded with admin remarks</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* TAB 1: PENDING APPROVALS QUEUE */}
      {adminTab === 'pending' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Pending Review Queue</h3>
              <p className="text-xs text-slate-500">Approve or deny submitted leave requests</p>
            </div>
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
              {pendingRequests.length} Pending
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
              <p className="text-xs font-medium">Fetching pending requests from Supabase...</p>
            </div>
          ) : pendingRequests.length === 0 ? (
            
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">All caught up!</h4>
                <p className="text-xs text-slate-500 mt-1">No pending leave requests requiring approval right now.</p>
              </div>
              <button
                onClick={() => fetchAdminRequests(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Check For New Submissions</span>
              </button>
            </div>

          ) : (
            
            <div className="space-y-4">
              {pendingRequests.map((req) => {
                const isProcessing = processingId === req.id;
                const teacherName = req.profiles?.full_name || 'Faculty Member';
                const department = req.profiles?.department || 'General Faculty';

                return (
                  <div
                    key={req.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">{teacherName}</span>
                        <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100">
                          {department}
                        </span>
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-slate-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-purple-600" />
                          <span className="font-semibold text-slate-800">
                            {req.start_date} &rarr; {req.end_date}
                          </span>
                        </div>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500">
                          Submitted {new Date(req.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 italic bg-white p-2.5 rounded-xl border border-slate-100 max-w-2xl">
                        "{req.reason}"
                      </p>

                      {req.class_schedules && req.class_schedules.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {req.class_schedules.map(cs => (
                            <span key={cs.id} className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                              {cs.subject} ({cs.class_time})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-3 self-end md:self-center">
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={isProcessing}
                        className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={() => openDenialModal(req)}
                        disabled={isProcessing}
                        className="flex items-center space-x-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 disabled:bg-slate-100 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 transition-all cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Deny...</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          )}
        </div>
      )}

      {/* TAB 2: APPROVAL HISTORY & LOGS */}
      {adminTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Resolved Leave Requests History</h3>
              <p className="text-xs text-slate-500">View approved and denied leave requests with substitute assignment status</p>
            </div>
            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
              {historyRequests.length} Resolved
            </span>
          </div>

          {historyRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              No resolved request history found.
            </div>
          ) : (
            <div className="space-y-4">
              {historyRequests.map((req) => {
                const teacherName = req.profiles?.full_name || 'Faculty Member';

                return (
                  <div key={req.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-sm">{teacherName}</span>
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {req.profiles?.department || 'Faculty'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {req.start_date} &rarr; {req.end_date} • "{req.reason}"
                        </p>
                      </div>

                      <div>
                        {req.status === 'approved' ? (
                          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Approved</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Denied</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {req.status === 'denied' && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start space-x-2">
                        <MessageSquare className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Administrative Denial Remark: </span>
                          <span>"{req.admin_remarks || 'No specific remarks recorded.'}"</span>
                        </div>
                      </div>
                    )}

                    {req.status === 'approved' && req.class_schedules && req.class_schedules.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <span className="text-xs font-bold text-slate-700 block">Class Coverage Status:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {req.class_schedules.map(cs => {
                            const subName = cs.substitute?.full_name;

                            return (
                              <div key={cs.id} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-bold text-slate-900 block">{cs.subject}</span>
                                  <span className="text-[11px] text-slate-500">{cs.class_time}</span>
                                </div>

                                {subName ? (
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Claimed by: {subName}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    <span>Unclaimed</span>
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Denial Remarks Modal */}
      {denialModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold">Deny Leave Request</h3>
              </div>
              <button
                onClick={() => setDenialModalReq(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDenial} className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Provide administrative remarks explaining the reason for denying time off for{' '}
                <strong className="text-slate-900">{denialModalReq.profiles?.full_name}</strong>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Administrative Remarks <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={denialRemarkInput}
                  onChange={(e) => setDenialRemarkInput(e.target.value)}
                  placeholder="e.g. Insufficient coverage during district exams week, please re-submit for alternate dates..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDenialModalReq(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId === denialModalReq.id}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-400 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-rose-600/20 cursor-pointer disabled:cursor-not-allowed"
                >
                  {processingId === denialModalReq.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Denial</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
