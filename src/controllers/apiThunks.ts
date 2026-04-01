import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import type { Patient, Appointment } from '../models';
import { API_ENDPOINTS } from '../config';
import type { RootState } from './store';
import { setVisitId, setCloudPatientId, setFullPatientHistory } from './slices/patientVisitSlice';

// ============================================================================
// AUTH HELPER
// Returns headers with Bearer token, or throws if no valid session exists.
// This prevents unauthenticated requests from hitting the API and getting 400s.
// ============================================================================
const getAuthHeaders = async () => {
    try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();

        if (!token) {
            // No token means user is not authenticated — abort instead of sending
            // a bare request that the API Gateway will reject with 400/401
            throw new Error('No auth token available — user is not authenticated');
        }

        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    } catch (e: any) {
        console.warn('getAuthHeaders failed:', e?.message || e);
        // Re-throw so callers can rejectWithValue instead of sending bad requests
        throw e;
    }
};

/**
 * Robustly parse data from an AWS Lambda response.
 * Handles both "Proxy Integration" format (statusCode, body) and raw objects.
 * Safely handles stringified or already-parsed bodies.
 */
const parseLambdaResponse = (axiosResponse: any) => {
    const data = axiosResponse?.data;
    if (!data) return null;

    // If it's a standard APIGW response: { statusCode, body, headers }
    if (data.body !== undefined) {
        return typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
    }

    // Otherwise, assume the payload is the root object
    return data;
};

// ============================================================================
// VISIT THUNKS
// ============================================================================

export const initiateVisitThunk = createAsyncThunk<
    { visitId: string },
    { patientId: string; name: string; age: string; sex: string; mobile: string; address: string },
    { state: RootState }
>(
    'patientVisit/initiate',
    async (basicInfo, { dispatch, rejectWithValue }) => {
        try {
            const headers = await getAuthHeaders();
            const payload = {
                action: 'initiateVisit',
                ...basicInfo
            };

            const response = await axios.post(API_ENDPOINTS.PATIENT_DATA, payload, { headers });
            const responseData = parseLambdaResponse(response);

            if (responseData?.success && responseData.visitId) {
                dispatch(setVisitId(responseData.visitId));
                return { visitId: responseData.visitId };
            } else {
                throw new Error(responseData?.message || 'Failed to initiate visit');
            }
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to initiate visit');
        }
    }
);

export const fetchPatientDataThunk = createAsyncThunk<
    any,
    string,
    { state: RootState }
>(
    'patientVisit/fetchPatient',
    async (patientId, { dispatch, rejectWithValue }) => {
        try {
            const headers = await getAuthHeaders();
            // Option A: getPatient now returns activeVisit embedded.
            // We only need 2 parallel calls instead of 3.
            const [patientResponse, reportsResponse] = await Promise.all([
                axios.post(API_ENDPOINTS.PATIENT_DATA, { action: 'getPatient', patientId }, { headers }),
                axios.post(API_ENDPOINTS.PATIENT_DATA, { action: 'getReportsHistory', patientId }, { headers }).catch(e => {
                    console.warn('Failed to fetch reports history silently', e);
                    return { data: { success: true, reportsHistory: [] } };
                })
            ]);

            const responseData = parseLambdaResponse(patientResponse);
            const reportsData = parseLambdaResponse(reportsResponse);

            if (responseData?.success && responseData.patient) {
                const p = responseData.patient;
                // activeVisit now comes directly from getPatient (Option A merge)
                const activeVisit = responseData.activeVisit ?? null;

                // Helper to safely format history items for the HistoryDrawer wrapper
                const mapHistoryItem = (arr: any[], mapper: (item: any) => any) => {
                    if (!Array.isArray(arr)) return [];
                    return arr.map(item => ({
                        timestamp: item.createdAt || item.updatedAt || new Date().toISOString(),
                        doctorName: item.doctorName || 'Dr. Tiwari',
                        data: mapper(item)
                    }));
                };

                const mappedMedicalHistory = mapHistoryItem(responseData.medicalHistory || [], item => ({
                    historyText: item.historyDetails || item.medicalHistory || item.newHistoryEntry
                }));

                const vitalsArray = responseData.clinicalHistory || [];
                const mappedVitalsHistory = mapHistoryItem(vitalsArray, item => {
                    const metadataKeys = ['visitId', 'patientId', 'createdAt', 'updatedAt', 'doctorName'];
                    const vitals: any = {};
                    Object.keys(item).forEach(key => {
                        if (!metadataKeys.includes(key)) {
                            const mappedKey = key === 'fastingHBA1C' ? 'fastingHbA1c' : key;
                            vitals[mappedKey] = item[key];
                        }
                    });
                    return { vitals };
                });

                const rawReportsArray = reportsData.reportsHistory || reportsData.history || (Array.isArray(reportsData) ? reportsData : []);
                const mappedReportsHistory = mapHistoryItem(rawReportsArray, item => ({
                    reportNotes: item.reportNotes || item.reports,
                    reportsAttached: item.filesAttached || (item.reportFiles ? item.reportFiles.length : 0)
                }));

                const mappedDiagnosisHistory = mapHistoryItem(responseData.diagnosisHistory || [], item => ({
                    diagnosisText: item.diagnosis
                }));

                const mappedInvestigationsHistory = mapHistoryItem(responseData.investigationsHistory || [], item => {
                    const rawInv = item.investigations || item.advisedInvestigations || [];
                    let advisedArray: string[] = [];
                    if (typeof rawInv === 'string') {
                        try {
                            const parsed = JSON.parse(rawInv);
                            advisedArray = Array.isArray(parsed) ? parsed : [rawInv];
                        } catch (e) {
                            advisedArray = [rawInv];
                        }
                    } else if (Array.isArray(rawInv)) {
                        advisedArray = rawInv;
                    }

                    return {
                        selectedInvestigations: advisedArray,
                        customInvestigations: item.customInvestigations
                    };
                });

                dispatch(setFullPatientHistory({
                    clinicalHistory: mappedMedicalHistory, // fallback
                    vitalsHistory: mappedVitalsHistory,
                    reportsHistory: mappedReportsHistory,
                    medicalHistory: mappedMedicalHistory,
                    diagnosisHistory: mappedDiagnosisHistory,
                    investigationsHistory: mappedInvestigationsHistory,
                    patientData: {
                        fullName: p.name || '',
                        age: p.age ? String(p.age) : '',
                        sex: (p.sex as any) || 'Male',
                        mobileNumber: p.mobile || '',
                        address: p.address || '',
                    },
                    activeVisit: activeVisit
                }));

                if (activeVisit) {
                    dispatch(setVisitId(activeVisit.visitId));
                }

                return responseData;
            } else {
                throw new Error(responseData.message || 'Failed to fetch patient data');
            }
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch patient data');
        }
    }
);

export const sendToWaitingRoom = createAsyncThunk<any, any, { state: RootState }>(
    'patients/sendToWaitingRoom',
    async (patientData, { getState, rejectWithValue }) => {
        try {
            const headers = await getAuthHeaders();
            const state = getState().patientVisit;

            const payload: any = {
                action: 'updateVisit',
                visitId: patientData.visitId || state.visitId,
                patientId: patientData.patientId || state.patientId || state.cloudPatientId,

                // Clinical Info
                medicalHistory: patientData.medicalHistory || patientData.clinical?.historyText || '',
                clinicalParameters: patientData.clinicalParameters || patientData.clinical?.vitals || {},
                reportFiles: patientData.reportFiles || patientData.clinical?.reports || [],
                reportNotes: patientData.reportNotes || patientData.clinical?.reportNotes || '',

                // Diagnosis Info
                diagnosis: patientData.diagnosis?.diagnosisText || (typeof patientData.diagnosis === 'string' ? patientData.diagnosis : ''),
                advisedInvestigations: patientData.advisedInvestigations || JSON.stringify([
                    ...(patientData.diagnosis?.selectedInvestigations || []),
                    ...(patientData.diagnosis?.customInvestigations ? [patientData.diagnosis.customInvestigations] : [])
                ]),

                // Final status: promotes draft to live queue
                status: 'WAITING',
                treatment: patientData.treatment || 'WAITING',
                medications: patientData.medications || [],

                // Identify this record as pre-filled by the Assistant
                sentByAssistant: true,
            };

            const response = await axios.post(API_ENDPOINTS.PATIENT_DATA, payload, { headers });

            const responseData = typeof response.data.body === 'string'
                ? JSON.parse(response.data.body)
                : response.data;

            return responseData;
        } catch (error: any) {
            return rejectWithValue(error.response?.data || 'Failed to send to waiting room');
        }
    }
);

// ============================================================================
// LAYER 3: Cloud Auto-Save Draft (debounced, status: 'DRAFT')
//
// Sends the current visit state to DynamoDB with status='DRAFT'.
// DRAFT records are filtered out of all live queues (Waiting Room, patients list).
//
// First call:       creates a new patient record → returns patientId → stored as cloudPatientId
//                   then initiates a visit → returns visitId → stored in state
// Subsequent calls: uses visitId to UPDATE the existing Visits record (no duplicates).
// ============================================================================
export const autoSaveDraftToCloud = createAsyncThunk<
    { cloudPatientId: string; visitId?: string },
    void,
    { state: RootState }
>(
    'patientVisit/cloudSave',
    async (_, { getState, dispatch, rejectWithValue }) => {
        try {
            const headers = await getAuthHeaders();
            const state = getState().patientVisit;

            // Guard: do not save if visit is already locked or completed
            if (state.isVisitLocked || state.visitStatus === 'COMPLETED') {
                return rejectWithValue('Visit is locked — cloud save skipped');
            }

            // Guard: do not save if there is no patient name yet
            if (!state.basic?.fullName) {
                return rejectWithValue('No patient name — cloud save skipped');
            }

            // ── SCENARIO A: Both visitId AND cloudPatientId are known ────────────
            // Update the existing Visits record in-place. This is the fast path for
            // subsequent saves after the visit has already been properly initialized.
            // We guard on BOTH fields to avoid returning a null cloudPatientId to the
            // caller (which would cause OverviewTab to throw "Could not create cloud record").
            if (state.visitId && state.cloudPatientId) {
                const payload = {
                    action: 'updateVisit',
                    visitId: state.visitId,
                    clinicalParameters: state.clinical?.vitals || {},
                    diagnosis: state.diagnosis?.diagnosisText || '',
                    reportFiles: state.clinical?.reports || [],
                    advisedInvestigations: JSON.stringify([
                        ...(state.diagnosis?.selectedInvestigations || []),
                        ...(state.diagnosis?.customInvestigations ? [state.diagnosis.customInvestigations] : [])
                    ])
                };
                await axios.post(API_ENDPOINTS.PATIENT_DATA, payload, { headers });
                return { cloudPatientId: state.cloudPatientId, visitId: state.visitId };
            }

            // ── SCENARIO B: No visitId yet ──

            // B1: No cloudPatientId → create the Patient master record first
            let resolvedPatientId = state.cloudPatientId;
            if (!resolvedPatientId) {
                // FIX: Explicitly route the action and provide a fallback for age
                const createPayload = {
                    action: 'processPatientData', 
                    name: state.basic.fullName,
                    age: state.basic.age || '0', 
                    sex: state.basic.sex,
                    mobile: state.basic.mobileNumber,
                    address: state.basic.address
                };
                const res = await axios.post(API_ENDPOINTS.PATIENT_DATA, createPayload, { headers });
                const body = typeof res.data.body === 'string' ? JSON.parse(res.data.body) : res.data;
                resolvedPatientId = body.patientId;
                if (!resolvedPatientId) throw new Error('Failed to create patient — no patientId returned');
                dispatch(setCloudPatientId(resolvedPatientId));
            }

            // B2: Initiate a new Visit record for this patient
            const initRes = await dispatch(initiateVisitThunk({
                patientId: resolvedPatientId,
                name: state.basic.fullName,
                age: state.basic.age,
                sex: state.basic.sex,
                mobile: state.basic.mobileNumber,
                address: state.basic.address
            })).unwrap();

            return { cloudPatientId: resolvedPatientId, visitId: initRes.visitId };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Cloud save failed');
        }
    }
);

// ============================================================================
// PATIENT LIST THUNKS
// ============================================================================

export const fetchPatients = createAsyncThunk<Patient[], void>(
    'patients/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const headers = await getAuthHeaders();
            const response = await axios.post(API_ENDPOINTS.PATIENT_DATA, {
                action: 'getAllPatients'
            }, { headers });

            const body = response.data.body;
            let responseData;

            if (typeof body === 'string') {
                try {
                    responseData = JSON.parse(body);
                } catch (e) {
                    console.error('Failed to parse Patients body', e);
                    responseData = response.data;
                }
            } else {
                responseData = body || response.data;
            }

            const allPatients: Patient[] = responseData.patients || (Array.isArray(responseData) ? responseData : []);

            // Filter out DRAFT records from the main patients list
            return allPatients.filter((p: any) =>
                p.status !== 'DRAFT' && p.treatment !== 'DRAFT'
            );
        } catch (error: any) {
            console.error('fetchPatients error details:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data
            });
            return rejectWithValue(error.response?.data || error.message || 'Failed to fetch patients');
        }
    }
);

export const fetchWaitingRoom = createAsyncThunk<Patient[], void>(
    'patients/fetchWaitingRoom',
    async (_, { rejectWithValue }) => {
        try {
            const headers = await getAuthHeaders();
            const response = await axios.post(API_ENDPOINTS.PATIENT_DATA, {
                action: 'getWaitingRoom'
            }, { headers });

            const body = response.data.body;
            let responseData;

            if (typeof body === 'string') {
                try {
                    responseData = JSON.parse(body);
                } catch (e) {
                    console.error('Failed to parse WaitingRoom body', e);
                    responseData = response.data;
                }
            } else {
                responseData = body || response.data;
            }

            return responseData.patients || (Array.isArray(responseData) ? responseData : []);
        } catch (error: any) {
            console.error('fetchWaitingRoom error details:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data
            });
            return rejectWithValue(error.response?.data || error.message || 'Failed to fetch waiting room');
        }
    }
);

// ============================================================================
// APPOINTMENT THUNKS
// ============================================================================

export const fetchAppointments = createAsyncThunk<Appointment[], void>(
    'appointments/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const headers = await getAuthHeaders();
            const response = await axios.get(API_ENDPOINTS.APPOINTMENTS, { headers });
            const responseData = typeof response.data.body === 'string'
                ? JSON.parse(response.data.body)
                : response.data;

            return responseData;
        } catch (error: any) {
            return rejectWithValue(error.response?.data || 'Failed to fetch appointments');
        }
    }
);

export const createAppointment = createAsyncThunk<Appointment, Partial<Appointment>>(
    'appointments/create',
    async (appointmentData, { dispatch, rejectWithValue }) => {
        try {
            const headers = await getAuthHeaders();
            const response = await axios.post(API_ENDPOINTS.APPOINTMENTS, appointmentData, { headers });

            dispatch(fetchAppointments());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data || 'Failed to create appointment');
        }
    }
);

// ============================================================================
// createPatientAndAppointment
//
// Used when the assistant schedules an appointment for a BRAND-NEW patient
// (i.e. mode === 'new' in NewAppointmentModal).
//
// Flow:
//   1. POST /patient-data  { action: 'processPatientData', ...demographics }
//      → Creates a record in the Patients table, returns patientId
//   2. POST /appointments  { ...appointmentData, patientId }
//      → Creates the Appointment record, now linked to the real patient
//
// For existing patients the original createAppointment thunk is used instead.
// ============================================================================
export const createPatientAndAppointment = createAsyncThunk<
    Appointment,
    {
        patientData: { name: string; age: string; sex: string; mobile: string; address: string };
        appointmentData: Partial<Appointment>;
    }
>(
    'appointments/createWithPatient',
    async ({ patientData, appointmentData }, { dispatch, rejectWithValue }) => {
        try {
            const headers = await getAuthHeaders();

            // ── Step 1: Create patient master record ──────────────────────────
            const createRes = await axios.post(API_ENDPOINTS.PATIENT_DATA, {
                action: 'processPatientData',
                name: patientData.name,
                age: patientData.age || '0',
                sex: patientData.sex,
                mobile: patientData.mobile,
                address: patientData.address,
            }, { headers });

            const body = typeof createRes.data.body === 'string'
                ? JSON.parse(createRes.data.body)
                : createRes.data;

            if (!body.patientId) {
                throw new Error(body.error || 'Failed to create patient — no patientId returned');
            }

            const resolvedPatientId: string = body.patientId;

            // ── Step 2: Create appointment linked to the new patient ──────────
            const appointmentPayload = {
                ...appointmentData,
                patientId: resolvedPatientId,
            };

            const apptRes = await axios.post(API_ENDPOINTS.APPOINTMENTS, appointmentPayload, { headers });

            // Refresh the appointments list in the store
            dispatch(fetchAppointments());

            return apptRes.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data || error.message || 'Failed to create appointment');
        }
    }
);