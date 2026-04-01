import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Calendar, Activity, FilePlus, Save, Trash2, ArrowRight, Clock, ShieldCheck } from 'lucide-react';
import { fetchPatients, fetchAppointments, fetchWaitingRoom, fetchPatientDataThunk } from '../../../controllers/apiThunks';
import { loadDraftIntoState } from '../../../controllers/slices/patientVisitSlice';
import { DraftService, type DraftPatient } from '../../../services/draftService';
import type { RootState, AppDispatch } from '../../../controllers/store';

const Dashboard = () => {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();

    // Remote Data
    const { patients, waitingRoom, isLoading: loadingPatients } = useSelector((state: RootState) => state.patients);
    const { appointments, isLoading: loadingAppointments } = useSelector((state: RootState) => state.appointments);

    // Local Data
    const [localDrafts, setLocalDrafts] = useState<DraftPatient[]>([]);
    const hasFetched = useRef(false);

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        dispatch(fetchPatients());
        dispatch(fetchWaitingRoom());
        dispatch(fetchAppointments());
        setLocalDrafts(DraftService.getAllDrafts());

        DraftService.cleanupOldDrafts(30);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                dispatch(fetchAppointments());
                setLocalDrafts(DraftService.getAllDrafts());
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [dispatch]);

    const handleNewVisit = () => {
        navigate('/visit/new');
    };

    const handleResumeDraft = (draft: DraftPatient) => {
        dispatch(loadDraftIntoState(draft));
        navigate(`/visit/${draft.patientId}`);
    };

    const handleDeleteDraft = (draftId: string) => {
        if (window.confirm('Are you sure you want to delete this draft?')) {
            DraftService.deleteDraft(draftId);
            setLocalDrafts(DraftService.getAllDrafts());
        }
    };

    const handleCheckIn = (apt: any) => {
        const draftId = `checkin_${apt.id}`;
        const freshDraft: DraftPatient = {
            patientId: draftId,
            lastUpdatedAt: Date.now(),
            status: "DRAFT",
            savedSections: { basic: true, clinical: false, diagnosis: false, prescription: false },
            patientData: {
                patientId: draftId,
                draftId: draftId,
                // ── KEY FIX ────────────────────────────────────────────────────
                // If the appointment already has a real patientId (created via
                // createPatientAndAppointment), carry it over so that:
                //   1. initiateVisitThunk uses the REAL id (not checkin_...)
                //   2. autoSaveDraftToCloud SCENARIO A returns a valid cloudPatientId
                //   3. OverviewTab can resolve effectiveId without a cloud round-trip
                cloudPatientId: apt.patientId || null,
                activeTab: 0,
                visitStatus: 'DRAFT',
                basic: {
                    fullName: apt.patientName || apt.name || apt.fullName || '',
                    age: apt.age ? String(apt.age) : '',
                    mobileNumber: apt.mobile || apt.phone || apt.mobileNumber || '',
                    sex: apt.sex || apt.gender || 'Male',
                    address: apt.address || ''
                },
                clinical: { historyText: '', vitals: {}, reports: [] },
                diagnosis: { diagnosisText: '', selectedInvestigations: [], customInvestigations: '' },
                prescription: { medications: [], isAssistant: true },
                clinicalHistory: [],
                medicalHistory: [],
                vitalsHistory: [],
                diagnosisHistory: [],
                investigationsHistory: [],
                isVisitLocked: false,
                lastLockedVisitDate: null
            }
        };
        DraftService.saveDraft(draftId, freshDraft);
        dispatch(loadDraftIntoState(freshDraft));

        // ── HISTORY HYDRATION FIX (Bug #1) ─────────────────────────────────
        // If the appointment is linked to a real server patient, immediately
        // fetch their full visit history so HistoryDrawer and CompareTable
        // are populated. Without this, the empty [] arrays in the draft above
        // would persist and history would never appear.
        if (apt.patientId) {
            dispatch(fetchPatientDataThunk(apt.patientId));
        }

        navigate(`/visit/${draftId}`);
    };

    const todayAppointments = appointments.filter((apt) => {
        const status = (apt.status || '').toLowerCase();
        if (status === 'canceled' || status === 'cancelled') return false;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const tomorrow = new Date(todayStart);
        tomorrow.setDate(tomorrow.getDate() + 1);

        try {
            const aptDate = new Date(`${apt.date} ${apt.time || '00:00'}`);
            if (!isNaN(aptDate.getTime())) {
                return aptDate >= todayStart && aptDate < tomorrow;
            }
        } catch { }

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const todayStr = `${months[todayStart.getMonth()]} ${todayStart.getDate()}, ${todayStart.getFullYear()}`;
        return apt.date === todayStr;
    });

    const waitingRoomPatients = waitingRoom;

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
    };

    return (
        <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500">
                        Assistant Dashboard
                    </h1>
                    <p className="text-type-body flex items-center gap-2 mt-1">
                        <Clock size={16} className="text-primary-base" />
                        Welcome back. Here's your overview for today.
                    </p>
                </div>
                <button
                    onClick={handleNewVisit}
                    className="btn-primary w-full md:w-auto overflow-hidden group relative"
                >
                    <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12"></div>
                    <FilePlus size={20} />
                    <span>New Patient Visit</span>
                </button>
            </motion.div>

            {/* Metrics Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {[
                    { label: 'Total Registered', value: patients.length, loading: loadingPatients, icon: Users, color: 'primary', gradient: 'from-blue-500 to-indigo-600' },
                    { label: 'In Waiting Room', value: waitingRoomPatients.length, loading: loadingPatients, icon: Activity, color: 'amber', gradient: 'from-amber-400 to-orange-500', pulse: true },
                    { label: 'Today\'s Appointments', value: todayAppointments.length, loading: loadingAppointments, icon: Calendar, color: 'secondary', gradient: 'from-emerald-400 to-teal-500' }
                ].map((metric, idx) => (
                    <motion.div 
                        key={idx}
                        whileHover={{ y: -5 }}
                        className="glass-card p-4 md:p-5 flex items-center gap-4 group relative overflow-hidden"
                    >
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${metric.gradient} text-white shadow-lg shadow-${metric.color}-500/20`}>
                            <metric.icon size={22} className={metric.pulse ? 'animate-pulse' : ''} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{metric.label}</p>
                            <p className="text-2xl font-bold text-type-heading mt-0.5">
                                {metric.loading ? (
                                    <span className="flex gap-1">
                                        <span className="w-1.5 h-6 bg-slate-200 animate-pulse rounded"></span>
                                        <span className="w-1.5 h-6 bg-slate-200 animate-pulse rounded delay-75"></span>
                                    </span>
                                ) : metric.value}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Main Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                
                {/* Left Section (Waiting Room & Drafts) - 7 Columns on Large */}
                <div className="lg:col-span-7 space-y-6 md:space-y-8">
                    
                    {/* Waiting Room Queue */}
                    <motion.div variants={itemVariants} className="glass-card overflow-hidden">
                        <div className="p-4 border-b border-borderColor/50 flex justify-between items-center bg-amber-50/50">
                            <h2 className="text-base font-bold text-amber-800 flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                </span>
                                Waiting Room Queue
                            </h2>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-amber-600 uppercase tracking-tighter bg-amber-100/50 px-2 py-1 rounded-full border border-amber-200/50">
                                <ShieldCheck size={12} />
                                Cloud Sync Active
                            </div>
                        </div>
                        <div className="divide-y divide-borderColor/30">
                            <AnimatePresence mode="popLayout">
                                {loadingPatients ? (
                                    <div className="p-12 text-center flex flex-col items-center gap-3">
                                        <Activity className="text-amber-400 animate-spin" size={32} />
                                        <p className="text-amber-800 font-medium animate-pulse">Synchronizing patient queue...</p>
                                    </div>
                                ) : waitingRoomPatients.length === 0 ? (
                                    <div className="p-12 text-center text-type-body bg-white/30 backdrop-blur-sm">
                                        <Users className="mx-auto text-slate-300 mb-3" size={48} />
                                        <p className="text-sm font-medium">The waiting room is currently empty.</p>
                                        <p className="text-xs mt-1 text-slate-400">Newly checked-in patients will appear here automatically.</p>
                                    </div>
                                ) : (
                                    waitingRoomPatients.map((patient: any) => (
                                        <motion.div 
                                            key={patient.visitId || patient.patientId}
                                            layout
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="p-4 md:p-5 flex flex-col sm:flex-row justify-between items-center bg-white/40 hover:bg-amber-50/50 transition-colors group"
                                        >
                                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold shrink-0 text-sm">
                                                    {(patient.name || 'U')[0].toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-type-contrast truncate text-base leading-tight">{patient.name}</p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono border border-slate-200">#{patient.patientId.split('_').pop()}</span>
                                                        {patient.visitId && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">Visit Active</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => navigate(`/visit/${patient.patientId}`)}
                                                className="mt-4 sm:mt-0 w-full sm:w-auto px-4 py-1.5 rounded-lg text-amber-700 bg-amber-100 hover:bg-amber-200 font-bold text-xs transition-all flex items-center justify-center gap-2 group"
                                            >
                                                <span>View Case</span>
                                                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>

                    {/* Local Drafts */}
                    <AnimatePresence>
                        {localDrafts.length > 0 && (
                            <motion.div 
                                variants={itemVariants}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card overflow-hidden"
                            >
                                <div className="p-4 border-b border-borderColor/50 flex justify-between items-center bg-slate-50/50">
                                    <h2 className="text-base font-bold text-type-heading flex items-center gap-2">
                                        <Save size={18} className="text-primary-base" />
                                        In-Progress Drafts
                                    </h2>
                                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">OFFLINE SYNC</span>
                                </div>
                                <div className="divide-y divide-borderColor/30">
                                    {localDrafts.map((draft) => (
                                        <div key={draft.patientId} className="p-4 flex flex-col sm:flex-row justify-between items-center bg-white/20 hover:bg-primary-light/10 transition-colors">
                                            <div className="w-full sm:w-auto">
                                                <p className="font-bold text-type-contrast text-base leading-none">
                                                    {draft.patientData?.basic?.fullName || 'Untitled Patient'}
                                                </p>
                                                <p className="text-xs text-type-body mt-2 flex items-center gap-1.5">
                                                    <Clock size={12} />
                                                    Modified: {new Date(draft.lastUpdatedAt).toLocaleDateString()} at {new Date(draft.lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <div className="mt-4 sm:mt-0 w-full sm:w-auto flex items-center gap-2">
                                                <button
                                                    onClick={() => handleResumeDraft(draft)}
                                                    className="flex-1 sm:flex-none px-5 py-2 rounded-xl text-primary-base bg-primary-light/50 border border-primary-base/20 hover:bg-primary-base hover:text-white font-bold text-sm transition-all"
                                                >
                                                    Resume
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteDraft(draft.patientId)}
                                                    className="p-2.5 rounded-xl text-rose-500 bg-rose-50 border border-rose-100 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                                    title="Discard Draft"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Section (Schedule) - 5 Columns on Large */}
                <div className="lg:col-span-5">
                    <motion.div variants={itemVariants} className="glass-card flex flex-col h-full overflow-hidden">
                        <div className="p-4 border-b border-borderColor/50 flex justify-between items-center bg-slate-900 text-white">
                            <h2 className="text-base font-bold flex items-center gap-2">
                                <Calendar size={18} className="text-secondary-base" />
                                Today's Schedule
                            </h2>
                            <button 
                                onClick={() => navigate('/appointments')}
                                className="text-secondary-light text-xs font-bold hover:underline tracking-widest uppercase"
                            >
                                Full View
                            </button>
                        </div>
                        <div className="divide-y divide-borderColor/30 overflow-y-auto max-h-[600px] flex-1 scroll-smooth">
                            {loadingAppointments ? (
                                <div className="p-10 space-y-4">
                                    {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse"></div>)}
                                </div>
                            ) : todayAppointments.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Calendar className="text-slate-300" size={32} />
                                    </div>
                                    <p className="text-type-body font-medium">Clear schedule for today!</p>
                                    <p className="text-xs text-slate-400 mt-1">No upcoming appointments found.</p>
                                </div>
                            ) : (
                                todayAppointments.map((apt) => (
                                    <div key={apt.id} className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors relative group">
                                        <div className="flex items-center gap-4">
                                            <div className="text-center w-14 px-1 py-2 bg-slate-50 border border-slate-100 rounded-xl group-hover:bg-white group-hover:shadow-sm transition-all shrink-0">
                                                <span className="block text-[10px] font-black text-primary-base scale-90">{apt.time.split(' ')[1] || ''}</span>
                                                <span className="block text-base font-bold text-slate-800 leading-none mt-0.5">{apt.time.split(' ')[0]}</span>
                                            </div>
                                            <div className="min-w-0 pr-2">
                                                <p className="font-bold text-type-contrast truncate text-base leading-tight">{apt.patientName}</p>
                                                <p className="text-[9px] font-black text-secondary-base bg-secondary-light/30 px-2 py-0.5 rounded-full mt-1 inline-flex items-center gap-1 border border-secondary-base/10 uppercase tracking-tighter">
                                                    <ShieldCheck size={10} />
                                                    {apt.type || 'Consultation'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleCheckIn(apt)}
                                            className="ml-auto px-4 py-1.5 rounded-lg text-slate-600 border border-slate-200 bg-white hover:border-primary-base hover:text-primary-base hover:bg-primary-light/30 font-bold text-xs transition-all shadow-sm shrink-0"
                                        >
                                            Check In
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                        {todayAppointments.length > 0 && (
                            <div className="p-4 bg-slate-50/50 border-t border-borderColor/30 text-center">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                                    Last synced: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        )}
                    </motion.div>
                </div>

            </div>
        </motion.div>
    );
};

export default Dashboard;
