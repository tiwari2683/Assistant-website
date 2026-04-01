import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import { API_ENDPOINTS } from '../config';

const getAuthHeaders = async () => {
    try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    } catch (e) {
        console.warn("Could not fetch auth session token", e);
        return { 'Content-Type': 'application/json' };
    }
};

const normalizeResponse = (res: any) => {
    // Some endpoints wrap the response in a "body" string (Lambda Proxy)
    if (res.data && res.data.body) {
        return typeof res.data.body === 'string' ? JSON.parse(res.data.body) : res.data.body;
    }
    return res.data;
};

export const UploadService = {
    /**
     * Secure Handshake Flow for S3 Uploads
     */
    getPresignedUrl: async (patientId: string, fileName: string, fileType: string, fileSize: number, category: string) => {
        const headers = await getAuthHeaders();
        const response = await axios.post(API_ENDPOINTS.PATIENT_DATA, {
            action: 'getPresignedUploadUrl',
            patientId,
            fileName,
            fileType,
            fileSize,
            category,
        }, { headers });
        return normalizeResponse(response);
    },

    getPresignedGetUrl: async (patientId: string, s3Key: string) => {
        const headers = await getAuthHeaders();
        const response = await axios.post(API_ENDPOINTS.PATIENT_DATA, {
            action: 'getPresignedGetUrl',
            patientId,
            s3Key
        }, { headers });
        return normalizeResponse(response);
    },

    uploadToS3: async (uploadUrl: string, file: File) => {
        return axios.put(uploadUrl, file, {
            headers: {
                'Content-Type': file.type,
            },
        });
    },

    confirmUpload: async (metadata: {
        patientId: string;
        s3Key: string;
        fileName: string;
        fileSize: number;
        fileType: string;
        category: string;
    }) => {
        const headers = await getAuthHeaders();
        const response = await axios.post(API_ENDPOINTS.PATIENT_DATA, {
            action: 'confirmFileUpload',
            ...metadata,
        }, { headers });
        return normalizeResponse(response);
    },

    /**
     * Full handshake implementation
     */
    performCompleteUpload: async (
        patientId: string,
        file: File,
        category: string
    ) => {
        try {
            // 1. Get Presigned URL
            const data = await UploadService.getPresignedUrl(
                patientId, 
                file.name, 
                file.type,
                file.size,
                category
            );

            const uploadUrl = data.uploadUrl || data.url;
            const s3Key = data.s3Key || data.key;

            if (!uploadUrl || !s3Key) {
                throw new Error('Failed to retrieve upload coordinates from server');
            }

            // 2. PUT to S3
            await UploadService.uploadToS3(uploadUrl, file);

            // 3. Confirm to Backend
            await UploadService.confirmUpload({
                patientId,
                s3Key,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                category,
            });

            return { s3Key, fileName: file.name, success: true };
        } catch (error: any) {
            console.error('S3 Handshake failed:', error.response?.data || error.message);
            throw error;
        }
    }
};
