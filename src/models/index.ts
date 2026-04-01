export interface PatientBasic {
    fullName: string;
    age: string;
    mobileNumber: string;
    sex: 'Male' | 'Female' | 'Other';
    address: string;
}

export interface ClinicalVitals {
    inr?: string;
    hb?: string;
    wbc?: string;
    platelet?: string;
    bilirubin?: string;
    sgot?: string;
    sgpt?: string;
    alt?: string;
    tprAlb?: string;
    ureaCreat?: string;
    sodium?: string;
    fastingHbA1c?: string;
    pp?: string;
    tsh?: string;
    ft4?: string;
    others?: string;
    [key: string]: string | undefined;
}

export interface ClinicalData {
    historyText: string;
    reportNotes: string;
    vitals: ClinicalVitals;
    reports: Array<{
        s3Key?: string;
        fileId?: string;
        fileName: string;
        fileType?: string;
        fileSize: number;
        category: string;
        timestamp: string;
        fileUrl?: string; // Optional local preview URL or signed URL
        isPending?: boolean; // True if file is only stored locally
    }>;
}

export interface DiagnosisData {
    diagnosisText: string;
    selectedInvestigations: string[];
    customInvestigations: string;
}

export interface Medication {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    instructions?: string;
}

export interface VisitHistoryItem {
    timestamp: string;
    data: any;
}

export interface Patient {
    patientId: string;
    name: string;
    age: number;
    sex: string;
    diagnosis?: string;
    treatment?: string;
    prescription?: string;
    advisedInvestigations?: string;
    reports?: string;
    medications?: any[];
    reportFiles?: any[];
    createdAt?: string;
    updatedAt?: string;
}

export interface Appointment {
    id: string;
    patientId?: string;
    patientName: string;
    age?: number | string;
    mobile?: string;
    sex?: 'Male' | 'Female' | 'Other';
    address?: string;
    date: string;
    time: string;
    type: string;
    status: 'Upcoming' | 'Completed' | 'Canceled';
}
