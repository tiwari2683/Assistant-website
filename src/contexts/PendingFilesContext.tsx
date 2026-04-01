import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type PendingFileMap = Record<string, File>;

interface PendingFilesContextType {
    pendingFiles: PendingFileMap;
    addPendingFile: (fileId: string, file: File) => void;
    removePendingFile: (fileId: string) => void;
    clearPendingFiles: () => void;
}

const PendingFilesContext = createContext<PendingFilesContextType | undefined>(undefined);

export const PendingFilesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [pendingFiles, setPendingFiles] = useState<PendingFileMap>({});

    const addPendingFile = (fileId: string, file: File) => {
        setPendingFiles(prev => ({ ...prev, [fileId]: file }));
    };

    const removePendingFile = (fileId: string) => {
        setPendingFiles(prev => {
            const updated = { ...prev };
            delete updated[fileId];
            return updated;
        });
    };

    const clearPendingFiles = () => {
        setPendingFiles({});
    };

    return (
        <PendingFilesContext.Provider value={{ pendingFiles, addPendingFile, removePendingFile, clearPendingFiles }}>
            {children}
        </PendingFilesContext.Provider>
    );
};

export const usePendingFiles = () => {
    const context = useContext(PendingFilesContext);
    if (context === undefined) {
        throw new Error('usePendingFiles must be used within a PendingFilesProvider');
    }
    return context;
};
