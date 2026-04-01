export interface DraftPatient {
    patientId: string;
    lastUpdatedAt: number;
    status: "DRAFT";
    /**
     * Set after the first successful cloud save.
     * Allows subsequent auto-saves to use UPDATE mode in DynamoDB
     * instead of creating a new record every time.
     */
    cloudPatientId?: string | null;
    patientData: any; // Aggregated state of the 4 tabs
    savedSections: {
        basic: boolean;
        clinical: boolean;
        diagnosis: boolean;
        prescription: boolean;
    };
}

const DRAFT_PREFIX = 'DRAFT_PATIENT_';

export const DraftService = {
    generateDraftId: (): string => {
        return `draft_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    },

    saveDraft: (patientId: string, data: DraftPatient): void => {
        if (!patientId) return;
        const key = `${DRAFT_PREFIX}${patientId}`;
        const draftData = {
            ...data,
            lastUpdatedAt: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(draftData));
    },

    getDraft: (patientId: string): DraftPatient | null => {
        if (!patientId) return null;
        const key = `${DRAFT_PREFIX}${patientId}`;
        const saved = localStorage.getItem(key);
        if (!saved) return null;

        try {
            return JSON.parse(saved) as DraftPatient;
        } catch (e) {
            console.error("Failed to parse draft", e);
            return null;
        }
    },

    deleteDraft: (patientId: string): void => {
        if (!patientId) return;
        const key = `${DRAFT_PREFIX}${patientId}`;
        localStorage.removeItem(key);
    },

    getAllDrafts: (): DraftPatient[] => {
        const drafts: DraftPatient[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(DRAFT_PREFIX)) {
                const saved = localStorage.getItem(key);
                if (saved) {
                    try {
                        drafts.push(JSON.parse(saved) as DraftPatient);
                    } catch (e) {
                        console.warn("Invalid draft format for key:", key);
                    }
                }
            }
        }
        return drafts.sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt);
    },

    /**
     * Mirrors the React Native mobile app's cleanupOldDrafts utility.
     * Removes drafts older than `maxAgeInDays` from localStorage.
     * Should be called once on Dashboard mount.
     */
    cleanupOldDrafts: (maxAgeInDays: number = 30): number => {
        const cutoffTime = Date.now() - (maxAgeInDays * 24 * 60 * 60 * 1000);
        let deletedCount = 0;

        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (!key?.startsWith(DRAFT_PREFIX)) continue;

            const saved = localStorage.getItem(key);
            if (!saved) continue;

            try {
                const draft = JSON.parse(saved) as DraftPatient;
                if (draft.lastUpdatedAt < cutoffTime) {
                    localStorage.removeItem(key);
                    deletedCount++;
                    console.log(`[DraftService] Cleaned up stale draft: ${draft.patientId}`);
                }
            } catch {
                // Malformed entry — remove it
                localStorage.removeItem(key!);
                deletedCount++;
            }
        }

        if (deletedCount > 0) {
            console.log(`[DraftService] Cleanup complete: removed ${deletedCount} old drafts`);
        }
        return deletedCount;
    },
};
