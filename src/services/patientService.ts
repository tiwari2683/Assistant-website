import axios from 'axios';
import { API_ENDPOINTS } from '../config';
import { fetchAuthSession } from 'aws-amplify/auth';

const getAuthHeaders = async () => {
    try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        if (!token) throw new Error('No auth token available');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    } catch (e) {
        console.warn('getAuthHeaders failed:', e);
        throw e;
    }
};

export const PatientService = {
    getPatientProfile: async (patientId: string) => {
        const headers = await getAuthHeaders();
        const response = await axios.post(API_ENDPOINTS.PATIENT_DATA, {
            action: 'getPatient',
            patientId
        }, { headers });
        const data = typeof response.data.body === 'string' ? JSON.parse(response.data.body) : response.data;
        return data; 
    },

    saveVisit: async (patientId: string, payload: any) => {
        const headers = await getAuthHeaders();
        const response = await axios.post(API_ENDPOINTS.PATIENT_DATA, {
            action: 'processPatientVisit',
            patientId,
            ...payload
        }, { headers });
        return response.data;
    },

    searchPatients: async (query: string) => {
        const headers = await getAuthHeaders();
        const response = await axios.post(API_ENDPOINTS.PATIENT_DATA, {
            action: 'searchPatients',
            searchTerm: query
        }, { headers });
        const data = typeof response.data.body === 'string' ? JSON.parse(response.data.body) : response.data;
        return data.patients || [];
    }
};
