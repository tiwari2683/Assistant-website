import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../../controllers/hooks';
import { Card, Button } from '../../components/UI';
import { ShieldAlert, Activity, ClipboardList, Send, Loader2, AlertTriangle, AlertCircle } from 'lucide-react';
import { sendToWaitingRoom, autoSaveDraftToCloud } from '../../../controllers/apiThunks';
import { setIsSubmitting } from '../../../controllers/slices/patientVisitSlice';
import { DraftService } from '../../../services/draftService';
import { UploadService } from '../../../services/uploadService';
import { usePendingFiles } from '../../../contexts/PendingFilesContext';

export const OverviewTab: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const patientVisitState = useAppSelector((state) => state.patientVisit);

    const {
        basic,
        clinical,
        diagnosis,
        isVisitLocked,
        patientId,
        draftId,
        cloudPatientId,
        visitId,
    } = patientVisitState;

    const { pendingFiles, clearPendingFiles } = usePendingFiles();

    const isLocalId = (id: string | null) => id?.startsWith('draft_') || id?.startsWith('checkin_');
    const effectiveId = (!isLocalId(patientId) ? patientId : cloudPatientId) || null;

    const [isSending, setIsSending] = useState(false);

    // Compute UI States for File Volatility Warnings
    const hasPendingFiles = Object.keys(pendingFiles).length > 0;
    const hasOrphanedFiles = clinical.reports.some(
        (r) => r.isPending && (!r.fileId || !pendingFiles[r.fileId])
    );

    // Filter populated vitals only
    const populatedVitals = Object.entries(clinical.vitals).filter(([_, val]) => val !== undefined && val !== '');

    const handleSendToDoctor = async () => {
        if (!basic.fullName) {
            alert('Patient name is required before sending.');
            return;
        }

        setIsSending(true);
        dispatch(setIsSubmitting(true));

        try {
            // 0. Ensure Cloud Record exists before uploading files
            let resolvedId = effectiveId;
            let resolvedVisitId = visitId || patientVisitState.visitId;
            
            if (!resolvedId || !resolvedVisitId) {
                console.log('🔄 No Cloud ID or Visit ID found. Forcing immediate sync...');
                const syncResult = await dispatch(autoSaveDraftToCloud()).unwrap();
                resolvedId = syncResult.cloudPatientId;
                resolvedVisitId = syncResult.visitId || null;
                if (!resolvedId || !resolvedVisitId) throw new Error("Could not create cloud record. Please check your connection.");
            }

            // 1. Upload Pending Files sequentially (to avoid overwhelming network/lambda)
            const finalizedReports = [...clinical.reports];
            for (let i = 0; i < finalizedReports.length; i++) {
                const report = finalizedReports[i];
                if (report.isPending && report.fileId && pendingFiles[report.fileId]) {
                    const physicalFile = pendingFiles[report.fileId];
                    if (!resolvedId) throw new Error("Missing Patient ID for upload.");

                    const result = await UploadService.performCompleteUpload(resolvedId, physicalFile, report.category || 'Report');
                    
                    // Update report with S3 permanent data, remove pending flags
                    finalizedReports[i] = {
                        ...report,
                        s3Key: result.s3Key,
                        isPending: false,
                        fileId: undefined,
                        fileUrl: undefined // Remove local blob URL to prevent memory leaks over time
                    };
                }
            }

            // 2. Send to Waiting Room (Thunk handles payload construction from Redux state)
            await dispatch(sendToWaitingRoom({
                visitId: resolvedVisitId,
                patientId: resolvedId,
                clinical: {
                    ...clinical,
                    reports: finalizedReports
                },
                diagnosis: diagnosis,
                medications: patientVisitState.prescription.medications
            })).unwrap();
            
            // Clear pending files context on success
            clearPendingFiles();

            // Visit submitted successfully — clear the local draft
            if (draftId) {
                DraftService.deleteDraft(draftId);
            } else if (patientId && isLocalId(patientId)) {
                DraftService.deleteDraft(patientId);
            }

            // Return to Dashboard
            navigate('/');
        } catch (error: any) {
            console.error('Error sending to Doctor or Uploading files:', error);
            
            // Extract a proper error message if error is an object
            let msg = 'An unexpected error occurred.';
            if (typeof error === 'string') {
                msg = error;
            } else if (error && typeof error === 'object') {
                if (error.message) {
                    msg = error.message;
                } else if (error.error) {
                    msg = error.error;
                } else {
                    try {
                        msg = JSON.stringify(error);
                    } catch (e) {
                        msg = 'Unknown object error';
                    }
                }
            }
            alert(`Submission Failed: ${msg}`);
            
            // Unlock UI so the user can try again, WITHOUT losing their local draft data
            dispatch(setIsSubmitting(false));
            setIsSending(false);
        }
    };

    return (
        <div className="space-y-4 md:space-y-5">

            {/* ── 1. Demographics Summary ────────────────────────────────── */}
            <Card title="Patient Demographics" className="border-t-4 border-t-blue-500">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                        <p className="text-[10px] text-type-body uppercase tracking-wider mb-1 font-black">Full Name</p>
                        <p className="font-bold text-type-contrast text-sm">{basic.fullName || <span className="text-gray-400 italic">Not provided</span>}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-type-body uppercase tracking-wider mb-1 font-black">Age / Sex</p>
                        <p className="font-bold text-type-contrast text-sm">
                            {basic.age || '?'} yrs / {basic.sex || '?'}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-type-body uppercase tracking-wider mb-1 font-black">Mobile</p>
                        <p className="font-bold text-type-contrast text-sm">{basic.mobileNumber || <span className="text-gray-400 italic">—</span>}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-type-body uppercase tracking-wider mb-1 font-black">Address</p>
                        <p className="font-bold text-type-contrast text-sm">{basic.address || <span className="text-gray-400 italic">—</span>}</p>
                    </div>
                </div>
            </Card>

            {/* ── 2. Clinical Vitals ───────────────────────────────────── */}
            <Card title="Clinical Vitals" className="border-t-4 border-t-emerald-500">
                <div className="flex items-start gap-4">
                    <Activity className="text-emerald-500 mt-1" size={18} />
                    <div className="w-full">
                        {populatedVitals.length === 0 ? (
                            <p className="text-type-body text-xs italic">No vitals recorded.</p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 bg-slate-50/50 p-3 rounded-lg border border-slate-100/50">
                                {populatedVitals.map(([key, value]) => (
                                    <div key={key} className="bg-white p-2 rounded shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                                        <span className="text-[9px] text-slate-500 font-black mb-1 uppercase bg-slate-100 px-2 py-0.5 rounded-full tracking-tighter">{key}</span>
                                        <span className="font-bold text-slate-800 text-sm">{value as string}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {clinical.historyText && (
                            <div className="mt-4 pt-3 border-t border-slate-100">
                                <p className="text-[10px] text-type-body uppercase tracking-wider mb-2 font-black">History & Symptoms</p>
                                <div className="bg-white p-2.5 rounded border border-slate-100 text-xs whitespace-pre-wrap font-mono text-slate-600">
                                    {clinical.historyText}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* ── 3. Diagnosis & Investigations ───────────────────────────── */}
            <Card title="Diagnosis Summary" className="border-t-4 border-t-purple-500">
                <div className="flex items-start gap-4">
                    <ClipboardList className="text-purple-500 mt-1" size={20} />
                    <div className="w-full space-y-4">
                        <div>
                            <p className="text-xs text-type-body uppercase tracking-wider mb-1">Provisional Diagnosis</p>
                            {diagnosis.diagnosisText ? (
                                <p className="text-sm font-medium text-gray-800">{diagnosis.diagnosisText}</p>
                            ) : (
                                <p className="text-sm italic text-gray-400">None recorded.</p>
                            )}
                        </div>

                        {(diagnosis.selectedInvestigations.length > 0 || diagnosis.customInvestigations) && (
                            <div>
                                <p className="text-xs text-type-body uppercase tracking-wider mb-1">Advised Investigations</p>
                                <div className="flex flex-wrap gap-2">
                                    {diagnosis.selectedInvestigations.map(inv => (
                                        <span key={inv} className="bg-purple-50 text-purple-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-purple-100">
                                            {inv}
                                        </span>
                                    ))}
                                    {diagnosis.customInvestigations && (
                                        <span className="bg-purple-50 text-purple-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-purple-100">
                                            {diagnosis.customInvestigations}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* ── Assistant Role Notice ─────────────────────────────────── */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 flex gap-3 text-sm text-blue-800">
                <ShieldAlert size={20} className="text-blue-500 shrink-0" />
                <p>
                    <strong>Assistant Role:</strong> You have staged the patient records.
                    Finalizing visits and generating the Prescription PDF is reserved for the primary doctor.
                </p>
            </div>

            {/* ── Volatility Warning Banner ────────────────────────────── */}
            {hasPendingFiles && !hasOrphanedFiles && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-sm text-amber-800 animate-in fade-in slide-in-from-bottom-2">
                    <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold">Do not refresh or close this page.</p>
                        <p className="mt-0.5 opacity-90">
                           {Object.keys(pendingFiles).length} files attached. Files will be irrevocably lost if you refresh before clicking "Send to Doctor".
                        </p>
                    </div>
                </div>
            )}

            {/* ── Orphaned File Blocker Warning ────────────────────────── */}
            {hasOrphanedFiles && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 text-sm text-red-800 animate-in fade-in slide-in-from-bottom-2">
                    <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold">Missing Attachments Detected.</p>
                        <p className="mt-0.5 opacity-90">
                           A page refresh has wiped your attached files. Please return to the Clinical tab and re-attach the missing files (or remove them) to proceed.
                        </p>
                    </div>
                </div>
            )}

            {/* ── FINAL SUBMISSION ACTION ───────────────────────────────── */}
            <div className="pt-4 border-t border-gray-200 flex justify-end">
                {isVisitLocked ? (
                    <div className="px-6 py-3 bg-gray-100 text-gray-500 font-bold rounded-lg border border-gray-200">
                        Visit Locked — Already Submitted
                    </div>
                ) : (
                    <Button
                        variant="primary"
                        onClick={handleSendToDoctor}
                        disabled={isSending || !basic.fullName || hasOrphanedFiles}
                        className={`w-full md:w-auto min-w-[200px] flex justify-center items-center gap-2 py-3 shadow-lg ${
                            hasOrphanedFiles ? 'bg-red-400 opacity-60 cursor-not-allowed shadow-none hover:bg-red-400' : 'shadow-blue-500/20'
                        }`}
                    >
                        {isSending ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Sending...
                            </>
                        ) : hasOrphanedFiles ? (
                            <>
                                <AlertCircle size={18} /> Fix Missing Files
                            </>
                        ) : !basic.fullName ? (
                            'Missing Patient Name'
                        ) : (
                            <>
                                <Send size={18} /> 
                                Send {basic.fullName} to Doctor
                            </>
                        )}
                    </Button>
                )}
            </div>

        </div>
    );
};
