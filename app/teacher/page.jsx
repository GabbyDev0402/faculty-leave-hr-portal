"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserCheck,
  PlusCircle,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Upload,
  TrendingUp,
  BookOpen,
  X,
  Loader2,
  RefreshCw,
  XCircle,
  HelpCircle,
  Paperclip,
  Trash2,
  Layers,
  Plus,
  Briefcase,
  ExternalLink,
  Users,
  MessageSquare,
  Radio
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function TeacherDashboard() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  // Tab State: 'my-leaves' | 'coverage-board'
  const [activeTab, setActiveTab] = useState('my-leaves');

  // User & Profile State
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [peerCoverageJobs, setPeerCoverageJobs] = useState([]);

  // Page UX state
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [generatingUrlId, setGeneratingUrlId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [classes, setClasses] = useState([{ subject: '', class_time: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFilePath, setUploadedFilePath] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState(null);

  // Dynamic Class Schedule Handlers
  const handleAddClass = () => {
    setClasses(prev => [...prev, { subject: '', class_time: '' }]);
  };

  const handleRemoveClass = (index) => {
    if (classes.length > 1) {
      setClasses(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleClassChange = (index, field, value) => {
    setClasses(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Fetch initial data on mount & subscribe to Realtime
  useEffect(() => {
    fetchTeacherData(true);

    // Set up Supabase Realtime WebSocket listener for live teacher updates
    const teacherChannel = supabase
      .channel('teacher_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leave_requests' },
        () => {
          fetchTeacherData(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'class_schedules' },
        () => {
          fetchTeacherData(false);
        }
      )
      .subscribe();

    // Clean up channel subscription on unmount
    return () => {
      supabase.removeChannel(teacherChannel);
    };
  }, []);

  const fetchTeacherData = async (isInitial = true) => {
    if (isInitial) setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Get authenticated user
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        console.warn("No active Supabase auth user found.");
        setUser(null);
        if (isInitial) setLoading(false);
        return;
      }

      const currentUser = authData.user;
      setUser(currentUser);

      // 2. Fetch user's profile
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profileErr) console.error("Error fetching profile:", profileErr.message);
      setProfile(profileData || {
        full_name: currentUser.email?.split('@')[0] || 'Faculty Member',
        leave_balance: 10,
        department: 'Mathematics'
      });

      // 3. Fetch leave requests with nested class_schedules and substitute profile info
      const { data: requestsData, error: requestsErr } = await supabase
        .from('leave_requests')
        .select(`
          *,
          class_schedules (
            *,
            substitute:substitute_id (
              full_name
            )
          )
        `)
        .eq('teacher_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (requestsErr) throw requestsErr;
      setLeaveRequests(requestsData || []);

      // 4. Fetch available peer coverage jobs
      const { data: peerJobsData, error: peerErr } = await supabase
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
        .eq('status', 'approved')
        .neq('teacher_id', currentUser.id)
        .order('start_date', { ascending: true });

      if (!peerErr) {
        const availablePeerJobs = (peerJobsData || []).filter(req =>
          req.class_schedules &&
          req.class_schedules.some(cs => cs.substitute_id === null)
        );
        setPeerCoverageJobs(availablePeerJobs);
      }

    } catch (err) {
      console.error("Error loading teacher dashboard:", err);
      if (isInitial) setErrorMsg("Unable to load records. Please check your database connection.");
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  // Generate 60-Second Signed URL for Lesson Plan Files
  const handleViewLessonPlan = async (filePath, targetId) => {
    if (!filePath) {
      setErrorMsg("No lesson plan attached to this request.");
      return;
    }

    setGeneratingUrlId(targetId);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.storage
        .from('lesson_plans')
        .createSignedUrl(filePath, 60);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error("Unable to generate signed download link.");
      }

    } catch (err) {
      console.error("Error generating signed URL:", err);
      setErrorMsg(err.message || "Could not retrieve the requested lesson plan file.");
    } finally {
      setGeneratingUrlId(null);
    }
  };

  // Handle Teacher Claiming a Peer's Class Schedule
  const handleClaimClass = async (scheduleId) => {
    if (!user) {
      setErrorMsg("You must be logged in to claim class coverage.");
      return;
    }

    setClaimingId(scheduleId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase
        .from('class_schedules')
        .update({ substitute_id: user.id })
        .eq('id', scheduleId);

      if (error) throw error;

      setSuccessMsg("Peer class coverage claimed successfully! Thank you for assisting your colleague.");
      await fetchTeacherData(false);

    } catch (err) {
      console.error("Error claiming peer class schedule:", err);
      setErrorMsg(err.message || "Failed to claim class coverage slot.");
    } finally {
      setClaimingId(null);
    }
  };

  // Handle File Upload to Supabase Storage Bucket ('lesson_plans')
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("File size exceeds maximum limit of 10MB.");
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const userId = user?.id || 'public';
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${userId}/${Date.now()}-${cleanFileName}`;

      const { data, error } = await supabase.storage
        .from('lesson_plans')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      setUploadedFilePath(data.path);
      setUploadedFileName(file.name);
      setSuccessMsg(`Lesson plan "${file.name}" uploaded successfully!`);

    } catch (err) {
      console.error("Storage upload error:", err);
      setErrorMsg(err.message || "Failed to upload file to lesson_plans bucket.");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Remove Uploaded File
  const handleRemoveFile = async () => {
    if (uploadedFilePath) {
      try {
        await supabase.storage.from('lesson_plans').remove([uploadedFilePath]);
      } catch (err) {
        console.warn("Notice: could not delete file from storage:", err);
      }
    }
    setUploadedFilePath(null);
    setUploadedFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Submit New Leave Request & Relational Class Schedules
  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg("You must be logged in to submit a leave request.");
      return;
    }

    if (!startDate || !endDate || !reason.trim()) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    const validClasses = classes.filter(c => c.subject.trim() && c.class_time.trim());
    const needsSub = validClasses.length > 0;

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Insert leave request parent record
      const payload = {
        teacher_id: user.id,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
        needs_sub: needsSub,
        status: 'pending',
        lesson_plan_path: needsSub ? uploadedFilePath : null
      };

      const { data: leaveData, error: leaveErr } = await supabase
        .from('leave_requests')
        .insert([payload])
        .select();

      if (leaveErr) throw leaveErr;

      const newRequestId = leaveData?.[0]?.id;

      // 2. Insert child class_schedules rows if classes were specified
      if (newRequestId && validClasses.length > 0) {
        const schedulesPayload = validClasses.map(c => ({
          leave_request_id: newRequestId,
          subject: c.subject.trim(),
          class_time: c.class_time.trim()
        }));

        const { error: schedulesErr } = await supabase
          .from('class_schedules')
          .insert(schedulesPayload);

        if (schedulesErr) {
          console.warn("Notice creating class schedules:", schedulesErr.message);
        }
      }

      setSuccessMsg("Leave request and class coverage schedules submitted successfully!");

      // Reset form & upload state
      setStartDate('');
      setEndDate('');
      setReason('');
      setClasses([{ subject: '', class_time: '' }]);
      setUploadedFilePath(null);
      setUploadedFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowModal(false);

      // Refresh list
      await fetchTeacherData(false);

    } catch (err) {
      console.error("Error submitting leave request:", err);
      setErrorMsg(err.message || "Failed to submit leave request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Badge Helper Component
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Approved</span>
          </span>
        );
      case 'denied':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>Denied</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
            <span>Pending Review</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Hidden File Input Element */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
      />

      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-600 mb-1">
            <UserCheck className="w-4 h-4" />
            <span>Faculty Portal • {profile?.department || 'Faculty Member'}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {profile?.full_name || 'Teacher'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <span>Manage your leave requests or assist colleagues on the coverage board.</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
              Realtime Active
            </span>
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchTeacherData(true)}
            title="Refresh Data"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          <button
            onClick={() => {
              setErrorMsg(null);
              setShowModal(true);
            }}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Request Time Off</span>
          </button>
        </div>
      </div>

      {/* Sleek Hybrid Navigation Tab Menu */}
      <div className="flex items-center space-x-2 border-b border-slate-200/80 pb-0">
        <button
          onClick={() => setActiveTab('my-leaves')}
          className={`flex items-center space-x-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${activeTab === 'my-leaves'
              ? 'border-indigo-600 text-indigo-600 bg-white/60 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 rounded-t-xl'
            }`}
        >
          <Calendar className="w-4 h-4 text-indigo-500" />
          <span>My Leaves & Requests</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
            {leaveRequests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('coverage-board')}
          className={`flex items-center space-x-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${activeTab === 'coverage-board'
              ? 'border-emerald-600 text-emerald-600 bg-white/60 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 rounded-t-xl'
            }`}
        >
          <Users className="w-4 h-4 text-emerald-500" />
          <span>Peer Coverage Board</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
            {peerCoverageJobs.length} Open
          </span>
        </button>
      </div>

      {/* Global Alert Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
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

      {/* TAB 1: MY LEAVES VIEW */}
      {activeTab === 'my-leaves' && (
        <div className="space-y-8 animate-in fade-in duration-200">

          {/* Leave Balances Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Available Leave Balance</span>
                <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                  DAYS
                </span>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-slate-900">
                  {profile?.leave_balance ?? 10} <span className="text-xs font-medium text-slate-400">Days</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(((profile?.leave_balance ?? 10) / 15) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Synced from Supabase `profiles` table</span>
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Submitted Requests</span>
                <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
                  REQ
                </span>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-slate-900">{leaveRequests.length}</div>
                <p className="text-[11px] text-slate-400 mt-2">
                  {leaveRequests.filter(r => r.status === 'pending').length} pending approval
                </p>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-purple-500" />
                <span>Real-time status updates</span>
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Class Schedules Coverage</span>
                <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                  CLASSES
                </span>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-slate-900">
                  {leaveRequests.reduce((acc, req) => acc + (req.class_schedules?.length || 0), 0)}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Class slots requesting substitute coverage
                </p>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span>Relational `class_schedules`</span>
              </p>
            </div>

          </div>

          {/* Main Recent Requests Table & Lesson Plans */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">My Leave Requests History</h3>
                  <p className="text-xs text-slate-500">Fetched live with relational `class_schedules` and substitute coverage names</p>
                </div>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                  {leaveRequests.length} Total Records
                </span>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-400 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
                  <p className="text-xs font-medium">Fetching your leave records from database...</p>
                </div>
              ) : leaveRequests.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                  <div>
                    <p className="text-xs font-bold text-slate-700">No Leave Requests Found</p>
                    <p className="text-[11px] text-slate-400 mt-1">You haven't submitted any absence requests yet.</p>
                  </div>
                  <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Submit Your First Request</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-y border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Dates & Reason</th>
                        <th className="py-3 px-4">Class Coverage & Substitutes</th>
                        <th className="py-3 px-4">Lesson Plan</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {leaveRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">
                              {req.start_date} &rarr; {req.end_date}
                            </div>
                            <div className="text-[11px] text-slate-500 italic max-w-xs truncate" title={req.reason}>
                              "{req.reason}"
                            </div>

                            {req.status === 'denied' && (
                              <div className="mt-1.5 p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-[11px] flex items-start space-x-1.5">
                                <MessageSquare className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold">Admin Remark: </span>
                                  <span>"{req.admin_remarks || 'No specific remarks provided.'}"</span>
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {req.class_schedules && req.class_schedules.length > 0 ? (
                              <div className="flex flex-col gap-1.5 max-w-xs">
                                {req.class_schedules.map((cs) => {
                                  const subName = cs.substitute?.full_name;

                                  return (
                                    <div
                                      key={cs.id}
                                      className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-0.5"
                                    >
                                      <div className="font-bold text-slate-900">{cs.subject} ({cs.class_time})</div>
                                      {subName ? (
                                        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                          <span>Covered by: {subName}</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                          <Clock className="w-3 h-3 text-amber-500" />
                                          <span>Unclaimed slot</span>
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">No sub required</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {req.lesson_plan_path ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                <FileText className="w-3 h-3 text-emerald-600" />
                                Attached
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">None</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {renderStatusBadge(req.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Sub Lesson Plans Storage Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center space-x-2 text-slate-900">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold">Sub Lesson Instructions</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Attach syllabi, seating charts, or lesson plans stored securely in the Supabase <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-[11px]">lesson_plans</code> bucket.
              </p>

              {isUploading ? (
                <div className="border-2 border-dashed border-indigo-200 rounded-xl p-6 text-center bg-indigo-50/40 space-y-2">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-indigo-900">Uploading to Supabase Storage...</p>
                  <p className="text-[10px] text-indigo-500">Connecting to `lesson_plans` bucket</p>
                </div>
              ) : uploadedFilePath ? (
                <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 truncate">
                      <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-xs font-semibold text-emerald-900 truncate">
                        {uploadedFileName || 'Uploaded Lesson Plan'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-full">
                      Ready
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="w-full flex items-center justify-center space-x-1.5 py-1.5 text-xs text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove File</span>
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors bg-slate-50/50 cursor-pointer group"
                >
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 mx-auto mb-2 transition-colors" />
                  <p className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">
                    Upload Substitute Material
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">PDF, DOCX up to 10MB</p>
                </div>
              )}



            </div>
          </div>
        </div>
      )}

          {/* TAB 2: PEER COVERAGE BOARD VIEW */}
          {activeTab === 'coverage-board' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Peer Faculty Coverage Board</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assist fellow colleagues by claiming open class slots when they are absent
                  </p>
                </div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                  {peerCoverageJobs.length} Open Requests
                </span>
              </div>

              {loading ? (
                <div className="py-16 text-center text-slate-400 space-y-3 bg-white rounded-2xl border border-slate-200">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
                  <p className="text-xs font-medium">Loading open peer coverage slots...</p>
                </div>
              ) : peerCoverageJobs.length === 0 ? (

                <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3 bg-white">
                  <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">No open peer class slots</h3>
                    <p className="text-xs text-slate-500 mt-1">All approved faculty leave slots from other teachers are currently covered!</p>
                  </div>
                </div>

              ) : (

                <div className="space-y-5">
                  {peerCoverageJobs.map((job) => {
                    const isGeneratingUrl = generatingUrlId === job.id;
                    const teacherName = job.profiles?.full_name || 'Faculty Colleague';
                    const department = job.profiles?.department || 'Faculty Department';

                    const unclaimedSchedules = (job.class_schedules || []).filter(
                      cs => cs.substitute_id === null
                    );

                    return (
                      <div
                        key={job.id}
                        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-4"
                      >
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900 text-base">{teacherName}</span>
                              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-100">
                                {department}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">Faculty Peer Leave Request</p>
                          </div>

                          <div className="flex items-center space-x-2 text-xs text-slate-600">
                            <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span className="font-semibold text-slate-800">
                              {job.start_date} &rarr; {job.end_date}
                            </span>
                          </div>
                        </div>

                        {/* Absence Reason & Lesson Plan Link */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                          <div className="flex items-center space-x-2">
                            <BookOpen className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                            <span>Reason: <strong className="text-slate-800">"{job.reason}"</strong></span>
                          </div>

                          {job.lesson_plan_path ? (
                            <button
                              onClick={() => handleViewLessonPlan(job.lesson_plan_path, job.id)}
                              disabled={isGeneratingUrl}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 font-semibold text-[11px] rounded-lg border border-indigo-200 transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-auto"
                            >
                              {isGeneratingUrl ? (
                                <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                              ) : (
                                <FileText className="w-3 h-3 text-indigo-600" />
                              )}
                              <span>{isGeneratingUrl ? 'Generating Link...' : 'View Lesson Plan'}</span>
                              {!isGeneratingUrl && <ExternalLink className="w-2.5 h-2.5 text-indigo-400" />}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No plan attached</span>
                          )}
                        </div>

                        {/* Class Schedules List & Individual Claim Class Buttons */}
                        <div className="space-y-2.5 pt-1">
                          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Open Classes Needing Coverage ({unclaimedSchedules.length})</span>
                          </h4>

                          <div className="space-y-2">
                            {unclaimedSchedules.map((cs) => {
                              const isClaimingThis = claimingId === cs.id;

                              return (
                                <div
                                  key={cs.id}
                                  className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white transition-colors"
                                >
                                  <div className="space-y-0.5">
                                    <span className="font-bold text-slate-900 text-xs block">
                                      {cs.subject}
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      {cs.class_time}
                                    </span>
                                  </div>

                                  <button
                                    onClick={() => handleClaimClass(cs.id)}
                                    disabled={isClaimingThis}
                                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed self-end sm:self-center"
                                  >
                                    {isClaimingThis ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    )}
                                    <span>{isClaimingThis ? 'Claiming Class...' : 'Claim Class'}</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

              )}
            </div>
          )}

          {/* Request Time Off Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">

                {/* Modal Header */}
                <div className="bg-slate-900 text-white p-6 flex items-center justify-between sticky top-0 z-10">
                  <div className="flex items-center space-x-2">
                    <PlusCircle className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-base font-bold">New Leave Request</h3>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Form */}
                <form onSubmit={handleSubmitRequest} className="p-6 space-y-5">

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Start Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        End Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reason for Absence <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Medical appointment, family leave, STEM conference attendance..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  {/* Dynamic One-to-Many Class Schedules Builder */}
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Class Coverage Schedules (One-to-Many)</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleAddClass}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border border-indigo-100"
                      >
                        <Plus className="w-3 h-3 text-indigo-600" />
                        <span>Add Another Class</span>
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {classes.map((cls, idx) => (
                        <div key={idx} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center gap-2">
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={cls.subject}
                              onChange={(e) => handleClassChange(idx, 'subject', e.target.value)}
                              placeholder="Subject (e.g. Grade 10 English)"
                              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <input
                              type="text"
                              value={cls.class_time}
                              onChange={(e) => handleClassChange(idx, 'class_time', e.target.value)}
                              placeholder="Time (e.g. 08:00 AM - 09:30 AM)"
                              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>

                          {classes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveClass(idx)}
                              title="Remove Class"
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Lesson Plan Upload inside Modal */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Sub Lesson Plan Attachment (Optional)
                    </label>

                    {isUploading ? (
                      <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center space-x-2 text-xs text-indigo-700">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                        <span>Uploading to Supabase Storage...</span>
                      </div>
                    ) : uploadedFilePath ? (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2 truncate">
                          <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span className="font-semibold text-emerald-900 truncate">
                            {uploadedFileName}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-200 px-2 py-0.5 rounded-full">
                            Ready
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 border-dashed rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                      >
                        <Upload className="w-4 h-4 text-slate-500" />
                        <span>Select PDF or DOCX file (Max 10MB)</span>
                      </button>
                    )}
                  </div>

                  {/* Modal Actions */}
                  <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || isUploading}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{isSubmitting ? 'Submitting...' : 'Submit Request'}</span>
                    </button>
                  </div>

                </form>
              </div>
            </div>
          )}

        </div>
      );
}
