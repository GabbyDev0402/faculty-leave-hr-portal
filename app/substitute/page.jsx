"use client";

import { useState, useEffect } from 'react';
import { 
  Clock, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  FileText, 
  Search, 
  Filter, 
  Sparkles,
  BookOpen,
  UserCheck,
  Loader2,
  RefreshCw,
  XCircle,
  Briefcase,
  ExternalLink,
  Layers
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SubstituteDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [myClaimedSchedules, setMyClaimedSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [generatingUrlId, setGeneratingUrlId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Fetch available jobs on mount
  useEffect(() => {
    fetchSubstituteBoardData();
  }, []);

  const fetchSubstituteBoardData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Get authenticated user
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      setCurrentUser(user);

      // 2. Query leave_requests with profiles and class_schedules
      const { data: openRequests, error: openErr } = await supabase
        .from('leave_requests')
        .select(`
          *,
          profiles:teacher_id (
            full_name,
            department
          ),
          class_schedules (*)
        `)
        .eq('status', 'approved')
        .order('start_date', { ascending: true });

      if (openErr) throw openErr;

      // Filter leave requests to only show those having at least 1 unclaimed class schedule (substitute_id === null)
      const filteredJobs = (openRequests || []).filter(req => 
        req.class_schedules && 
        req.class_schedules.some(cs => cs.substitute_id === null)
      );

      setAvailableJobs(filteredJobs);

      // 3. Query class schedules claimed by this specific substitute
      if (user) {
        const { data: claimed, error: claimedErr } = await supabase
          .from('class_schedules')
          .select(`
            *,
            leave_requests (
              id,
              start_date,
              end_date,
              reason,
              lesson_plan_path,
              profiles:teacher_id (
                full_name,
                department
              )
            )
          `)
          .eq('substitute_id', user.id);

        if (!claimedErr) {
          setMyClaimedSchedules(claimed || []);
        }
      }

    } catch (err) {
      console.error("Error fetching substitute job board:", err);
      setErrorMsg("Failed to load available teaching assignments.");
    } finally {
      setLoading(false);
    }
  };

  // Generate Secure Supabase Storage Signed URL (60-second expiration)
  const handleViewLessonPlan = async (filePath, targetId) => {
    if (!filePath) {
      setErrorMsg("No lesson plan file attached to this request.");
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
      console.error("Error generating signed URL for lesson plan:", err);
      setErrorMsg(err.message || "Could not retrieve the requested lesson plan file.");
    } finally {
      setGeneratingUrlId(null);
    }
  };

  // Handle Claiming a Specific Class Schedule in `class_schedules`
  const handleClaimClassSchedule = async (scheduleId) => {
    if (!currentUser) {
      setErrorMsg("You must be signed in as a substitute to claim class assignments.");
      return;
    }

    setClaimingId(scheduleId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // UPDATE class_schedules table setting substitute_id = currentUser.id
      const { data, error } = await supabase
        .from('class_schedules')
        .update({ substitute_id: currentUser.id })
        .eq('id', scheduleId)
        .select();

      if (error) throw error;

      setSuccessMsg("Class coverage assignment claimed successfully!");

      // Refresh board data from database so UI updates immediately
      await fetchSubstituteBoardData();

    } catch (err) {
      console.error("Error claiming class schedule:", err);
      setErrorMsg(err.message || "Failed to claim class assignment. Someone else may have claimed it.");
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Substitute Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-600 mb-1">
            <Clock className="w-4 h-4" />
            <span>Substitute Staffing Portal • Relational Coverage Board</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Open Class Schedules Board
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse approved faculty leave requests, view specific class subjects and times, and claim coverage slots.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchSubstituteBoardData}
            title="Refresh Job Board"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-900 cursor-pointer">
            &times;
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
            &times;
          </button>
        </div>
      )}

      {/* Main Grid Layout: Job Board (2 cols) & Confirmed Jobs Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Open Job Listings (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Available Faculty Requests ({availableJobs.length} Open Requests)
            </h2>
            <span className="text-xs text-slate-400 font-medium">Sorted by Date</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-3 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
              <p className="text-xs font-medium">Loading open class schedules from database...</p>
            </div>
          ) : availableJobs.length === 0 ? (
            
            /* Clean Empty State */
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3 bg-white">
              <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">No sub jobs available right now</h3>
                <p className="text-xs text-slate-500 mt-1">All approved faculty class schedules are currently covered. Check back later!</p>
              </div>
              <button
                onClick={fetchSubstituteBoardData}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Board</span>
              </button>
            </div>

          ) : (
            
            /* Available Job Cards List */
            <div className="space-y-5">
              {availableJobs.map((job) => {
                const isGeneratingUrl = generatingUrlId === job.id;
                const teacherName = job.profiles?.full_name || 'Faculty Member';
                const department = job.profiles?.department || 'General Department';
                
                // Filter unclaimed class schedules for this leave request
                const unclaimedSchedules = (job.class_schedules || []).filter(
                  cs => cs.substitute_id === null
                );

                return (
                  <div 
                    key={job.id} 
                    className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-4"
                  >
                    {/* Card Header (No hardcoded stipend) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-base">{teacherName}</span>
                          <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100">
                            {department}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Faculty Leave Absence Request</p>
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

                    {/* Class Schedules List & Individual Claim Buttons */}
                    <div className="space-y-2.5 pt-1">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Open Classes Needing Substitute Coverage ({unclaimedSchedules.length})</span>
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
                                onClick={() => handleClaimClassSchedule(cs.id)}
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

        {/* Claimed Schedule Sidebar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 self-start">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">My Confirmed Classes</h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              {myClaimedSchedules.length} Booked
            </span>
          </div>

          {myClaimedSchedules.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
              <Clock className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">No confirmed classes yet</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Click "Claim Class" on any available class slot to confirm your coverage.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myClaimedSchedules.map((cs) => {
                const parentReq = cs.leave_requests;
                const teacherName = parentReq?.profiles?.full_name || 'Faculty Member';

                return (
                  <div key={cs.id} className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-950">
                        {cs.subject}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-full">
                        Confirmed
                      </span>
                    </div>
                    
                    <p className="text-[11px] text-emerald-800 font-semibold">
                      Time: {cs.class_time}
                    </p>

                    <div className="text-[10px] text-slate-600 space-y-0.5 border-t border-emerald-200/60 pt-1.5">
                      <div>Teacher: {teacherName}</div>
                      {parentReq?.start_date && (
                        <div>Dates: {parentReq.start_date} &rarr; {parentReq.end_date}</div>
                      )}
                    </div>
                    
                    {parentReq?.lesson_plan_path && (
                      <button
                        onClick={() => handleViewLessonPlan(parentReq.lesson_plan_path, `claimed-cs-${cs.id}`)}
                        disabled={generatingUrlId === `claimed-cs-${cs.id}`}
                        className="w-full mt-1.5 flex items-center justify-center space-x-1 py-1 bg-white hover:bg-emerald-100/60 text-emerald-900 font-semibold text-[10px] rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                      >
                        {generatingUrlId === `claimed-cs-${cs.id}` ? (
                          <Loader2 className="w-3 h-3 animate-spin text-emerald-700" />
                        ) : (
                          <FileText className="w-3 h-3 text-emerald-700" />
                        )}
                        <span>View Lesson Plan</span>
                        <ExternalLink className="w-2.5 h-2.5 text-emerald-600" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
