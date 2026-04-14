import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../controllers/hooks';
import {
    setActiveTab,
    initializeNewVisit,
    initializeExistingVisit,
    loadDraftIntoState,
} from '../../../controllers/slices/patientVisitSlice';
import { fetchPatientDataThunk } from '../../../controllers/apiThunks';
import { BasicTab } from './BasicTab';
import { ClinicalTab } from './ClinicalTab';
import { DiagnosisTab } from './DiagnosisTab';
import { OverviewTab } from './OverviewTab';
import { DraftService } from '../../../services/draftService';
import { HistoryDrawer } from './components/HistoryDrawer';
import { Stethoscope, ClipboardList, Activity, FileText, Clock, AlertCircle, ChevronLeft, ChevronRight, Save, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TABS = [
    { id: 0, label: 'Basic', icon: Stethoscope },
    { id: 1, label: 'Clinical', icon: Activity },
    { id: 2, label: 'Diagnosis', icon: ClipboardList },
    { id: 3, label: 'Overview', icon: FileText },
];

const isLocalDraftId = (id: string | null | undefined): boolean => {
    if (!id) return false;
    return id.startsWith('draft_') || id.startsWith('checkin_');
};

export const NewPatientForm: React.FC = () => {
    const { patientId: id } = useParams<{ patientId: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const patientVisitState = useAppSelector((state) => state.patientVisit);
    const { activeTab, isVisitLocked, visitId, patientId, draftId, cloudPatientId, basic, saveStatus, isHistoryDrawerOpen, isSubmitting, vitalsHistory, medicalHistory, clinicalHistory } = patientVisitState;

    const getSaveStatusDisplay = () => {
        if (isVisitLocked) return null;

        const hasRequiredBasicInfo = !!(basic?.fullName?.trim() && basic?.mobileNumber?.trim());
        if (!hasRequiredBasicInfo) {
            return (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
                    <AlertCircle size={12} />
                    <span>Basic Info Required to Save</span>
                </div>
            );
        }

        return (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                <Save size={12} />
                <span>Local Draft Ready</span>
            </div>
        );
    };

    const isInitialized = useRef(false);
    const localSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const patientVisitStateRef = useRef(patientVisitState);

    useEffect(() => {
        patientVisitStateRef.current = patientVisitState;
    });

    useEffect(() => {
        isInitialized.current = false;
        if (id && id !== 'new') {
            if (draftId === id || patientId === id) {
                isInitialized.current = true;
                // ── BUG #2 FIX: Stale Redux Guard ─────────────────────────────────
                // The early-return guard fires when Redux already has this patient.
                // But history arrays in the state may be empty if the user arrived
                // via handleCheckIn (which creates an empty draft) or if the state
                // was hydrated from localStorage without fetching server history.
                // In either case, if we have a real server ID, re-fetch silently.
                const realId = !isLocalDraftId(id) ? id : cloudPatientId;
                const isHistoryEmpty =
                    (!vitalsHistory || vitalsHistory.length === 0) &&
                    (!medicalHistory || medicalHistory.length === 0) &&
                    (!clinicalHistory || clinicalHistory.length === 0);
                if (realId && !isLocalDraftId(realId) && isHistoryEmpty) {
                    dispatch(fetchPatientDataThunk(realId));
                }
                return;
            }
            const savedDraft = DraftService.getDraft(id);
            if (savedDraft) {
                dispatch(loadDraftIntoState(savedDraft));
                // ── BUG #1 SAFETY NET: Draft loaded but history may be empty ────────
                // If the draft was a check-in draft created by handleCheckIn it will
                // have empty history arrays. If it has a cloudPatientId (real server
                // patient), fetch history now so it arrives before the user reaches
                // the Clinical/Diagnosis tabs.
                const draftCloudId = savedDraft.patientData?.cloudPatientId;
                if (draftCloudId && !isLocalDraftId(draftCloudId)) {
                    dispatch(fetchPatientDataThunk(draftCloudId));
                }
            } else if (isLocalDraftId(id)) {
                dispatch(initializeNewVisit(id));
            } else {
                dispatch(initializeExistingVisit(id));
                dispatch(fetchPatientDataThunk(id));
            }
            isInitialized.current = true;
        } else {
            const newDraftId = DraftService.generateDraftId();
            navigate(`/visit/${newDraftId}`, { replace: true });
        }
    }, [id, draftId, patientId]); 

    // ❌ REMOVED: immediate initiateVisitThunk call. 
    // Visit creation is now strictly deferred until the Assistant clicks "Send to Doctor".
    // ---------------------------------------------------------------------------------- 

    useEffect(() => {
        return () => {
            const snapshot = patientVisitStateRef.current;
            const currentId = snapshot.draftId || snapshot.patientId;
            if (!currentId || !isLocalDraftId(currentId) || snapshot.isVisitLocked || snapshot.isSubmitting) return;

            const hasRequiredBasicInfo = !!(snapshot.basic?.fullName?.trim() && snapshot.basic?.mobileNumber?.trim());
            if (!hasRequiredBasicInfo) {
                // Do not save blank untitled drafts to localStorage 
                return;
            }

            DraftService.saveDraft(currentId, {
                patientId: currentId,
                cloudPatientId: snapshot.cloudPatientId ?? undefined,
                status: 'DRAFT',
                patientData: snapshot,
                lastUpdatedAt: Date.now(),
                savedSections: { basic: true, clinical: false, diagnosis: false, prescription: false }
            });
        };
    }, []); 

    useEffect(() => {
        if (!isInitialized.current) return;
        const currentId = draftId || patientId;
        if (!isLocalDraftId(currentId) || isVisitLocked || isSubmitting) return;

        const hasRequiredBasicInfo = !!(basic?.fullName?.trim() && basic?.mobileNumber?.trim());
        if (!hasRequiredBasicInfo) return; // Prevent saving unnamed empty drafts

        if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current);
        localSaveTimerRef.current = setTimeout(() => {
            if (!currentId) return;

            // ── BUG #5 FIX: Prevent auto-save from overwriting freshly fetched history ──
            // When the assistant checks in, handleCheckIn dispatches:
            //   1. loadDraftIntoState (empty history arrays)
            //   2. fetchPatientDataThunk (async, takes 1-3s)
            //
            // This 2s timer can fire BETWEEN steps 1 and 2 resolving, writing the
            // empty history back to localStorage and clobbering the fetched data.
            //
            // Solution: Merge history arrays — never overwrite non-empty arrays with empty ones.
            const stateToSave = patientVisitState;
            const existingDraft = DraftService.getDraft(currentId);
            const existingData = existingDraft?.patientData;

            const mergedPatientData = {
                ...stateToSave,
                // Only overwrite history if the incoming state actually has data;
                // otherwise preserve what's already saved in localStorage.
                vitalsHistory: stateToSave.vitalsHistory?.length > 0
                    ? stateToSave.vitalsHistory
                    : (existingData?.vitalsHistory || []),
                medicalHistory: stateToSave.medicalHistory?.length > 0
                    ? stateToSave.medicalHistory
                    : (existingData?.medicalHistory || []),
                clinicalHistory: stateToSave.clinicalHistory?.length > 0
                    ? stateToSave.clinicalHistory
                    : (existingData?.clinicalHistory || []),
                reportsHistory: (stateToSave as any).reportsHistory?.length > 0
                    ? (stateToSave as any).reportsHistory
                    : (existingData?.reportsHistory || []),
                diagnosisHistory: (stateToSave as any).diagnosisHistory?.length > 0
                    ? (stateToSave as any).diagnosisHistory
                    : (existingData?.diagnosisHistory || []),
                investigationsHistory: (stateToSave as any).investigationsHistory?.length > 0
                    ? (stateToSave as any).investigationsHistory
                    : (existingData?.investigationsHistory || []),
            };

            DraftService.saveDraft(currentId, {
                patientId: currentId,
                cloudPatientId: cloudPatientId ?? undefined,
                status: 'DRAFT',
                patientData: mergedPatientData,
                lastUpdatedAt: Date.now(),
                savedSections: { basic: true, clinical: false, diagnosis: false, prescription: false }
            });
        }, 2000);
        return () => { if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current); };
    }, [patientVisitState, isVisitLocked, patientId, draftId, isSubmitting]); 

    // ❌ REMOVED: autoSaveDraftToCloud effect to enforce strict localStorage-only intake.
    // Cloud sync only happens on final 'Send to Doctor' click.

    const containerVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <div className="flex w-full h-screen overflow-hidden bg-appBg">
            <motion.div 
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className={`flex-1 overflow-y-auto scroll-smooth transition-all duration-500 ease-in-out ${isHistoryDrawerOpen ? 'mr-0 lg:pr-[448px]' : 'mr-0'}`}
            >
                <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
                    
                    {/* Header Card */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6 md:mb-8">
                        <div className="flex items-center gap-5">
                            <button 
                                onClick={() => navigate('/')}
                                className="w-8 h-8 rounded-xl bg-white border border-borderColor flex items-center justify-center text-slate-400 hover:text-primary-base hover:border-primary-base transition-all active:scale-90"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-type-heading tracking-tight">
                                    {activeTab === 3 ? 'Final Review' : 'Active Patient Case'}
                                </h1>
                                <p className="text-type-body font-medium flex items-center gap-2 mt-1">
                                    <ShieldCheck size={16} className="text-primary-base" />
                                    HIPAA Compliant Secure Data Entry
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 self-end md:self-auto">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={saveStatus}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                >
                                    {getSaveStatusDisplay()}
                                </motion.div>
                            </AnimatePresence>

                            {isVisitLocked && (
                                <div className="bg-rose-50 text-rose-500 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-rose-100 flex items-center gap-2">
                                    <AlertCircle size={14} />
                                    Read-Only Archive
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="glass-card mb-6 p-1 flex gap-1 overflow-x-auto no-scrollbar outline-none focus:outline-none">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            const isClinicalTab = tab.id === 1 || tab.id === 2;
                            const isLocalDraft = isLocalDraftId(draftId || patientId);
                            const requiresActiveVisit = isClinicalTab && !visitId && !isVisitLocked && !isLocalDraft;
                            
                            const hasRequiredBasicInfo = !!(basic?.fullName?.trim() && basic?.mobileNumber?.trim());
                            const isMissingBasicInfo = !hasRequiredBasicInfo && !isVisitLocked;
                            
                            const isBlocked = requiresActiveVisit || (tab.id > 0 && isMissingBasicInfo);

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => !isBlocked && dispatch(setActiveTab(tab.id))}
                                    disabled={isBlocked}
                                    className={`relative flex items-center gap-3 px-5 py-2.5 rounded-xl font-black text-xs md:text-sm whitespace-nowrap transition-all duration-300 group ${
                                        isActive 
                                            ? 'text-white' 
                                            : isBlocked 
                                                ? 'text-slate-300 cursor-not-allowed' 
                                                : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                                >
                                    {isActive && (
                                        <motion.div 
                                            layoutId="active-tab-bg"
                                            className="absolute inset-0 bg-primary-base rounded-xl shadow-lg shadow-primary-base/20"
                                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <span className="relative z-10 flex items-center gap-2">
                                        <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary-base transition-colors'} />
                                        {tab.label}
                                        {isBlocked && <Clock size={14} className="animate-pulse opacity-50" />}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Content Section */}
                    <div className="relative">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, scale: 0.99, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.99, y: -10 }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                            >
                                {activeTab === 0 && <BasicTab />}
                                {activeTab === 1 && <ClinicalTab />}
                                {activeTab === 2 && <DiagnosisTab />}
                                {activeTab === 3 && <OverviewTab />}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-6 pt-5 border-t border-borderColor flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="order-2 sm:order-1 flex gap-4 w-full sm:w-auto">
                            {activeTab > 0 && (
                                <button
                                    onClick={() => dispatch(setActiveTab(activeTab - 1))}
                                    className="btn-secondary flex-1 sm:flex-none justify-center group"
                                >
                                    <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                                    Previous Stage
                                </button>
                            )}
                        </div>
                        <div className="order-1 sm:order-2 flex gap-4 w-full sm:w-auto">
                            {activeTab < 3 && (
                                (() => {
                                    const hasRequiredBasicInfo = !!(basic?.fullName?.trim() && basic?.mobileNumber?.trim());
                                    const isMissingBasicInfo = !hasRequiredBasicInfo && !isVisitLocked;
                                    const isClinicalTab = (activeTab + 1) === 1 || (activeTab + 1) === 2;
                                    const isLocalDraft = isLocalDraftId(draftId || patientId);
                                    const requiresActiveVisit = isClinicalTab && !visitId && !isVisitLocked && !isLocalDraft;
                                    const nextIsBlocked = requiresActiveVisit || isMissingBasicInfo;

                                    return (
                                        <button
                                            onClick={() => {
                                                if (!nextIsBlocked) dispatch(setActiveTab(activeTab + 1));
                                            }}
                                            disabled={nextIsBlocked}
                                            className={`btn-primary flex-1 sm:flex-none justify-center group ${nextIsBlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <span>Proceed to {TABS[activeTab + 1].label}</span>
                                            <ChevronRight size={20} className={nextIsBlocked ? '' : 'group-hover:translate-x-1 transition-transform'} />
                                        </button>
                                    );
                                })()
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* History Drawer Overlay for Mobile */}
            <AnimatePresence>
                {isHistoryDrawerOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
                    />
                )}
            </AnimatePresence>
            
            {isHistoryDrawerOpen && <HistoryDrawer />}
        </div>
    );
};
