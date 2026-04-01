import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { DraftService, type DraftPatient } from '../../services/draftService';
import type {
    PatientBasic,
    ClinicalData,
    DiagnosisData,
    Medication,
    VisitHistoryItem
} from '../../models';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface PatientVisitState {
    patientId: string | null;
    draftId: string | null;
    /**
     * Set when the draft has been persisted to the cloud at least once.
     * Subsequent cloud saves use this ID in UPDATE mode instead of creating
     * a brand-new DynamoDB record every time.
     */
    cloudPatientId: string | null;
    visitId: string | null;
    activeTab: number;
    visitStatus: 'DRAFT' | 'WAITING' | 'COMPLETED';

    // Current Form State
    basic: PatientBasic;
    clinical: ClinicalData;
    diagnosis: DiagnosisData;
    prescription: {
        medications: Medication[];
        isAssistant: boolean;
    };

    // History State (Independent arrays as per refinements)
    clinicalHistory: VisitHistoryItem[]; // Used for complaints history
    vitalsHistory: VisitHistoryItem[];   // Used for vitals history
    reportsHistory: VisitHistoryItem[];  // Used for reports history
    medicalHistory: VisitHistoryItem[];  // Legacy/Fallback, actually Complaints
    diagnosisHistory: VisitHistoryItem[];
    investigationsHistory: VisitHistoryItem[];

    // Logic Flags
    isVisitLocked: boolean;
    lastLockedVisitDate: string | null;
    lastSavedAt: number | null;
    isLoading: boolean;
    isSubmitting: boolean;
    error: string | null;

    // ── Layer 3: Cloud Auto-Save UX ──────────────────────────────────────────
    /** Drives the Google-Forms-style save indicator in FormFooter */
    saveStatus: SaveStatus;

    // ── Task 4: UI State ─────────────────────────────────────────────────────
    isHistoryDrawerOpen: boolean;
    historyDrawerType: 'clinical' | 'medical' | 'diagnosis' | 'investigations' | 'reports' | 'vitals';
}

const getInitialState = (): PatientVisitState => ({
    patientId: null,
    draftId: null,
    cloudPatientId: null,
    visitId: null,
    activeTab: 0,
    visitStatus: 'DRAFT',

    basic: {
        fullName: '',
        age: '',
        mobileNumber: '',
        sex: 'Male',
        address: '',
    },
    clinical: {
        historyText: '',
        reportNotes: '',
        vitals: {},
        reports: [],
    },
    diagnosis: {
        diagnosisText: '',
        selectedInvestigations: [],
        customInvestigations: '',
    },
    prescription: {
        medications: [],
        isAssistant: true,
    },

    clinicalHistory: [],
    vitalsHistory: [],
    reportsHistory: [],
    medicalHistory: [],
    diagnosisHistory: [],
    investigationsHistory: [],

    isVisitLocked: false,
    lastLockedVisitDate: null,
    lastSavedAt: null,
    isLoading: false,
    isSubmitting: false,
    error: null,

    saveStatus: 'idle',
    isHistoryDrawerOpen: false,
    historyDrawerType: 'clinical',
});

const initialState: PatientVisitState = getInitialState();

const patientVisitSlice = createSlice({
    name: 'patientVisit',
    initialState,
    reducers: {
        updateBasicDetails: (state, action: PayloadAction<Partial<PatientBasic>>) => {
            if (!state.isVisitLocked) {
                state.basic = { ...state.basic, ...action.payload };
            }
        },
        updateClinicalDetails: (state, action: PayloadAction<Partial<ClinicalData>>) => {
            if (!state.isVisitLocked) {
                state.clinical = { ...state.clinical, ...action.payload };
            }
        },
        updateDiagnosisDetails: (state, action: PayloadAction<Partial<DiagnosisData>>) => {
            if (!state.isVisitLocked) {
                state.diagnosis = { ...state.diagnosis, ...action.payload };
            }
        },
        setMedications: (state, action: PayloadAction<Medication[]>) => {
            if (!state.isVisitLocked) {
                state.prescription.medications = action.payload;
            }
        },
        setActiveTab: (state, action: PayloadAction<number>) => {
            state.activeTab = action.payload;
        },
        setIsSubmitting: (state, action: PayloadAction<boolean>) => {
            state.isSubmitting = action.payload;
        },

        // ── Layer 3 UX ───────────────────────────────────────────────────────
        /**
         * Manually set the cloud save status.
         * Called by the 8s autosave effect before dispatching the cloud thunk,
         * and by the thunk's fulfilled/rejected handlers via extraReducers.
         */
        setSaveStatus: (state, action: PayloadAction<SaveStatus>) => {
            state.saveStatus = action.payload;
        },

        /**
         * Store the cloud patient ID returned by the first successful cloud save.
         * All subsequent saves will use this in UPDATE mode.
         */
        setCloudPatientId: (state, action: PayloadAction<string>) => {
            state.cloudPatientId = action.payload;
        },

        setVisitId: (state, action: PayloadAction<string | null>) => {
            state.visitId = action.payload;
        },

        // Visit Lock Logic
        setVisitLock: (state, action: PayloadAction<{ isLocked: boolean; lastLockedDate: string | null }>) => {
            state.isVisitLocked = action.payload.isLocked;
            state.lastLockedVisitDate = action.payload.lastLockedDate;
            if (action.payload.isLocked) {
                state.visitStatus = 'COMPLETED';
            }
        },

        // Loading full history payload
        setFullPatientHistory: (state, action: PayloadAction<{
            clinicalHistory: any[];
            vitalsHistory?: any[];
            reportsHistory?: any[];
            medicalHistory: any[];
            diagnosisHistory: any[];
            investigationsHistory: any[];
            patientData: Partial<PatientBasic>;
            activeVisit?: any;
            lastLockedVisitDate?: string;
        }>) => {
            state.clinicalHistory = action.payload.clinicalHistory;
            state.vitalsHistory = action.payload.vitalsHistory || [];
            state.reportsHistory = action.payload.reportsHistory || [];
            state.medicalHistory = action.payload.medicalHistory;
            state.diagnosisHistory = action.payload.diagnosisHistory;
            state.investigationsHistory = action.payload.investigationsHistory;

            // Hydrate demographics
            state.basic = { ...state.basic, ...action.payload.patientData };

            // Phase 3: Hydrate Active Visit Data if present
            // ── BUG #6 FIX: Guard against overwriting a visitId that was already set. ──
            // If initiateVisitThunk already ran and set state.visitId, we should
            // NOT overwrite it with the one from the history fetch — they may differ.
            if (action.payload.activeVisit && !state.visitId) {
                const av = action.payload.activeVisit;
                state.visitId = av.visitId;
                state.visitStatus = (av.status as any) || 'WAITING';

                // Clinical Vitals
                if (av.clinicalParameters) {
                    state.clinical.vitals = av.clinicalParameters;
                }

                // History text
                if (av.medicalHistory) {
                    state.clinical.historyText = av.medicalHistory;
                }

                // Diagnosis
                if (av.diagnosis) {
                    state.diagnosis.diagnosisText = av.diagnosis;
                }

                // ── BUG #9 FIX: Handle both JSON arrays and bullet-point strings ──
                // The doctor's app saves advisedInvestigations as a bullet-point
                // text string (e.g. "• X-Ray Chest\n• CBC"). The assistant panel
                // saves it as a JSON-serialized array (e.g. "[\"X-Ray\"]").
                // Both formats must be handled here to correctly pre-check boxes.
                if (av.advisedInvestigations) {
                    const rawAdv = av.advisedInvestigations;
                    if (typeof rawAdv === 'string' && rawAdv.trim() !== '') {
                        const trimmed = rawAdv.trim();
                        if (trimmed.startsWith('[')) {
                            // JSON array format (from assistant portal)
                            try {
                                const invs = JSON.parse(trimmed);
                                if (Array.isArray(invs)) {
                                    state.diagnosis.selectedInvestigations = invs;
                                }
                            } catch (e) {
                                console.warn('Failed to parse JSON investigations string');
                            }
                        } else {
                            // Bullet-point string format (from doctor mobile app)
                            const lines = trimmed
                                .split('\n')
                                .map((l: string) => l.replace(/^[\u2022\-\*]\s*/, '').trim())
                                .filter((l: string) => l.length > 0);
                            state.diagnosis.selectedInvestigations = lines;
                        }
                    } else if (Array.isArray(rawAdv)) {
                        state.diagnosis.selectedInvestigations = rawAdv;
                    }
                }

                // Medications
                if (av.medications && Array.isArray(av.medications)) {
                    state.prescription.medications = av.medications;
                }

                // Reports
                if (av.reportFiles && Array.isArray(av.reportFiles)) {
                    state.clinical.reports = av.reportFiles;
                }
            }

            // Automatic Lock Detection
            const lockDate = action.payload.lastLockedVisitDate || (action.payload.activeVisit?.status === 'COMPLETED' ? action.payload.activeVisit.updatedAt : null);
            if (lockDate) {
                const today = new Date().toISOString().split('T')[0];
                const cleanLockedDate = lockDate.split('T')[0];
                if (cleanLockedDate >= today) {
                    state.isVisitLocked = true;
                    state.lastLockedVisitDate = lockDate;
                    state.visitStatus = 'COMPLETED';
                }
            }
        },

        // Draft Management
        initializeNewVisit: (state, action: PayloadAction<string | undefined>) => {
            Object.assign(state, getInitialState());
            state.draftId = action.payload || DraftService.generateDraftId();
            state.visitStatus = 'DRAFT';
        },

        initializeExistingVisit: (state, action: PayloadAction<string>) => {
            Object.assign(state, getInitialState());
            state.patientId = action.payload;
            state.visitStatus = 'DRAFT';
        },

        loadDraftIntoState: (state, action: PayloadAction<DraftPatient>) => {
            const { patientData } = action.payload;

            state.patientId = patientData.patientId;
            state.draftId = patientData.draftId;
            state.cloudPatientId = patientData.cloudPatientId || null;
            state.activeTab = patientData.activeTab;
            state.visitStatus = patientData.visitStatus;

            state.basic = patientData.basic;
            state.clinical = patientData.clinical;
            state.diagnosis = patientData.diagnosis;
            state.prescription = { ...patientData.prescription, isAssistant: true };

            state.clinicalHistory = patientData.clinicalHistory || [];
            state.vitalsHistory = patientData.vitalsHistory || [];
            state.reportsHistory = patientData.reportsHistory || [];
            state.medicalHistory = patientData.medicalHistory || [];
            state.diagnosisHistory = patientData.diagnosisHistory || [];
            state.investigationsHistory = patientData.investigationsHistory || [];

            state.isVisitLocked = patientData.isVisitLocked;
            state.lastLockedVisitDate = patientData.lastLockedVisitDate;
            state.lastSavedAt = action.payload.lastUpdatedAt;
            state.saveStatus = 'saved'; // Hydrated from storage = already saved
        },

        toggleHistoryDrawer: (state, action: PayloadAction<{ open: boolean; type?: PatientVisitState['historyDrawerType'] }>) => {
            state.isHistoryDrawerOpen = action.payload.open;
            if (action.payload.type) {
                state.historyDrawerType = action.payload.type;
            }
        },

        clearVisitSession: () => getInitialState(),
    },
});

export const {
    updateBasicDetails,
    updateClinicalDetails,
    updateDiagnosisDetails,
    setMedications,
    setActiveTab,
    setIsSubmitting,
    setSaveStatus,
    setCloudPatientId,
    setVisitId,
    setVisitLock,
    setFullPatientHistory,
    initializeNewVisit,
    initializeExistingVisit,
    loadDraftIntoState,
    clearVisitSession,
    toggleHistoryDrawer,
} = patientVisitSlice.actions;

export default patientVisitSlice.reducer;