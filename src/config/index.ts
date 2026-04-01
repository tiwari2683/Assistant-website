export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export const API_ENDPOINTS = {
    PATIENT_DATA: `${API_BASE_URL}/patient-data`,
    APPOINTMENTS: `${API_BASE_URL}/appointments`,
};

export const AWS_CONFIG = {
    REGION: import.meta.env.VITE_AWS_REGION || "",
    S3_BUCKET: import.meta.env.VITE_S3_BUCKET || "",
    S3_URL_PREFIX: import.meta.env.VITE_S3_URL_PREFIX || "",
};

export const AUTH_CONFIG = {
    USER_POOL_ID: import.meta.env.VITE_USER_POOL_ID || "",
    CLIENT_ID: import.meta.env.VITE_CLIENT_ID || "",
};
