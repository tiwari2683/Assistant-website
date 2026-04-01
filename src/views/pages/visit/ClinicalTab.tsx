import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../controllers/hooks';
import { updateClinicalDetails, toggleHistoryDrawer } from '../../../controllers/slices/patientVisitSlice';
import { Card, Button, Input } from '../../components/UI';
import { usePendingFiles } from '../../../contexts/PendingFilesContext';
import { UploadService } from '../../../services/uploadService';
import { Camera, FileUp, FileText, History as HistoryIcon, Table, X, MoreHorizontal, AlertCircle, AlertTriangle, Trash2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Vitals field schema — single source of truth for both Grid and Compare views
// ─────────────────────────────────────────────────────────────────────────────
const vitalsFields = [
    { name: 'inr', label: 'INR', unit: '' },
    { name: 'hb', label: 'Hb', unit: 'g/dL' },
    { name: 'wbc', label: 'WBC', unit: '×10³' },
    { name: 'platelet', label: 'Platelet', unit: '×10³' },
    { name: 'bilirubin', label: 'Bilirubin', unit: 'mg/dL' },
    { name: 'sgot', label: 'SGOT', unit: 'U/L' },
    { name: 'sgpt', label: 'SGPT', unit: 'U/L' },
    { name: 'alt', label: 'ALT', unit: 'U/L' },
    { name: 'tprAlb', label: 'TPR/Alb', unit: '' },
    { name: 'ureaCreat', label: 'Urea/Creat', unit: 'mg/dL' },
    { name: 'sodium', label: 'Sodium', unit: 'mEq/L' },
    { name: 'fastingHbA1c', label: 'Fasting/HbA1c', unit: '%' },
    { name: 'pp', label: 'PP', unit: 'mg/dL' },
    { name: 'tsh', label: 'TSH', unit: 'mIU/L' },
    { name: 'ft4', label: 'FT4', unit: 'ng/dL' },
];

// ─────────────────────────────────────────────────────────────────────────────
// CompareTable — sticky first column, read-only history, editable Today
// ─────────────────────────────────────────────────────────────────────────────
interface CompareTableProps {
    vitals: Record<string, string | undefined>;
    history: Array<{ timestamp: string; data: any }>;
    onVitalsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isLocked: boolean;
}

const CompareTable: React.FC<CompareTableProps> = ({ vitals, history, onVitalsChange, isLocked }) => {
    // Filter history items that actually have vitals data, newest-first → show max 4 past visits
    const historicalColumns = [...history]
        .filter(h => h.data?.vitals && Object.keys(h.data.vitals).length > 0)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 4)
        .reverse(); // show oldest → newest (left → right), Today is rightmost

    const formatDate = (iso: string) => {
        try {
            const d = new Date(iso);
            return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
        } catch {
            return iso;
        }
    };

    const todayLabel = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });

    return (
        <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] shadow-sm">
            <table className="min-w-full border-collapse text-sm">
                {/* ── THEAD ──────────────────────────────────────────────── */}
                <thead>
                    <tr className="bg-[#F9FAFB]">
                        {/* Sticky header: Parameter column */}
                        <th
                            className="sticky left-0 z-20 bg-[#F9FAFB] text-left px-3 py-2 font-black text-[#374151] border-b border-r border-[#E5E7EB] min-w-[120px] whitespace-nowrap text-xs uppercase tracking-wider"
                        >
                            Parameter
                        </th>

                        {/* Historical date headers (read-only) */}
                        {historicalColumns.map((col, i) => (
                            <th
                                key={i}
                                className="text-center px-3 py-2 font-bold text-[#6B7280] border-b border-r border-[#E5E7EB] min-w-[90px] whitespace-nowrap text-xs"
                            >
                                {formatDate(col.timestamp)}
                            </th>
                        ))}

                        {/* Today column header */}
                        <th
                            className="text-center px-3 py-2 font-black text-white bg-primary-base border-b border-primary-dark min-w-[110px] whitespace-nowrap text-xs uppercase tracking-widest"
                        >
                            Today
                            <span className="block text-[10px] font-normal opacity-80">{todayLabel}</span>
                        </th>
                    </tr>
                </thead>

                {/* ── TBODY ──────────────────────────────────────────────── */}
                <tbody>
                    {vitalsFields.map((field, rowIdx) => {
                        const isEven = rowIdx % 2 === 0;
                        const rowBg = isEven ? 'bg-white' : 'bg-[#F9FAFB]';

                        return (
                            <tr key={field.name} className={`${rowBg} hover:bg-[#EFF6FF] transition-colors group`}>
                                {/* ── Sticky Parameter Name Cell ─────────── */}
                                <td
                                    className={`sticky left-0 z-10 ${rowBg} group-hover:bg-[#EFF6FF] transition-colors px-3 py-1.5 font-bold text-[#374151] border-r border-[#E5E7EB] whitespace-nowrap text-[13px]`}
                                >
                                    <span>{field.label}</span>
                                    {field.unit && (
                                        <span className="ml-1 text-[10px] text-[#9CA3AF] font-normal uppercase">({field.unit})</span>
                                    )}
                                </td>

                                {/* ── Read-Only Historical Cells ─────────── */}
                                {historicalColumns.map((col, i) => {
                                    const val = col.data?.vitals?.[field.name];
                                    return (
                                        <td
                                            key={i}
                                            className="text-center px-3 py-1.5 text-[#374151] border-r border-[#E5E7EB] text-xs"
                                        >
                                            {val !== undefined && val !== '' && val !== null
                                                ? <span className="font-bold">{val}</span>
                                                : <span className="text-[#D1D5DB]">—</span>
                                            }
                                        </td>
                                    );
                                })}

                                {/* ── Editable Today Cell — bound to Redux ─ */}
                                <td className="px-2 py-1 bg-primary-light/30">
                                    <input
                                        type="number"
                                        name={field.name}
                                        value={vitals[field.name] || ''}
                                        onChange={onVitalsChange}
                                        disabled={isLocked}
                                        step="0.01"
                                        placeholder="—"
                                        className="w-full text-center bg-white border border-primary-base/20 rounded-md px-1.5 py-1 text-xs font-black text-primary-base focus:outline-none focus:ring-2 focus:ring-primary-base focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Empty history notice */}
            {historicalColumns.length === 0 && (
                <div className="text-center py-4 text-sm text-[#9CA3AF] bg-[#F9FAFB] border-t border-[#E5E7EB]">
                    No previous visit data available for comparison. Fill in "Today" values to build history.
                </div>
            )}
        </div>
    );
};


// ─────────────────────────────────────────────────────────────────────────────
// Main ClinicalTab component
// ─────────────────────────────────────────────────────────────────────────────
export const ClinicalTab: React.FC = () => {
    const dispatch = useAppDispatch();
    const { basic, clinical, vitalsHistory, patientId, cloudPatientId, isVisitLocked } = useAppSelector((state) => state.patientVisit);
    const { addPendingFile, pendingFiles } = usePendingFiles();

    // ── ID RESOLUTION STRATEGY ──────────────────────────────────────────────
    // For existing patients, patientId is a UUID.
    // For new patients, patientId is a local ID (checkin_...).
    // cloudPatientId is set once the Layer 3 autosave syncs the draft to DynamoDB.
    // The backend handshake REQUIRES a persistent ID (UUID) or null (to create).
    // ──────────────────────────────────────────────────────────────────────────
    const isLocalId = (id: string | null) => id?.startsWith('draft_') || id?.startsWith('checkin_');
    const effectiveId = (!isLocalId(patientId) ? patientId : cloudPatientId) || null;
    const canUpload = !!basic.fullName;

    // Volatility flags — same logic as OverviewTab
    const hasPendingFiles = Object.keys(pendingFiles).length > 0;
    const hasOrphanedFiles = clinical.reports.some(
        (r) => r.isPending && (!r.fileId || !pendingFiles[r.fileId])
    );

    const [isCompareMode, setIsCompareMode] = useState(false);

    const handleViewReport = async (report: any) => {
        if (report.fileUrl) {
            window.open(report.fileUrl, '_blank');
        } else if (report.signedUrl || report.url) {
            window.open(report.signedUrl || report.url, '_blank');
        } else if (report.s3Key) {
            try {
                // Fetch a secure short-lived presigned GET URL
                // We use effectiveId since patientId might be a draft ID, but if it has an S3 key, it's a real patient.
                // Assuming the report belongs to the actual patient UUID stored in cloudPatientId if patientId is local.
                const realId = (!isLocalId(patientId) ? patientId : cloudPatientId);
                if (!realId) throw new Error("No valid patient ID to fetch report");
                
                const data = await UploadService.getPresignedGetUrl(realId, report.s3Key);
                if (data.url) {
                    window.open(data.url, '_blank');
                } else {
                    throw new Error("Could not retrieve secure URL");
                }
            } catch (error) {
                console.error("Failed to fetch secure report URL", error);
                alert("Failed to securely fetch this report. Please try again.");
            }
        }
    };

    const handleVitalsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        dispatch(updateClinicalDetails({
            vitals: { ...clinical.vitals, [name]: value }
        }));
    };

    const handleHistoryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        let value = e.target.value;
        const lines = value.split('\n');
        const bulletedLines = lines.map(line => {
            if (line.trim() && !line.trim().startsWith('•')) {
                return `• ${line.trim()}`;
            }
            return line;
        });
        dispatch(updateClinicalDetails({ historyText: bulletedLines.join('\n') }));
    };

    const handleRemoveReport = (idxToRemove: number) => {
        const updated = clinical.reports.filter((_, i) => i !== idxToRemove);
        dispatch(updateClinicalDetails({ reports: updated }));
    };

    const handleReportNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        dispatch(updateClinicalDetails({ reportNotes: e.target.value }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const fileId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7);
            const localUrl = URL.createObjectURL(file);
            
            // Stage physical file in Context
            addPendingFile(fileId, file);

            // Stage serializable metadata in Redux
            dispatch(updateClinicalDetails({
                reports: [...clinical.reports, {
                    fileId: fileId,
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    fileUrl: localUrl,
                    isPending: true,
                    category: 'Report',
                    timestamp: new Date().toISOString()
                }]
            }));
            
            // Reset the input so the same file can be selected again if needed
            e.target.value = '';
        } catch (error: any) {
            console.error('Failed to stage file:', error);
            alert('Failed to stage file.');
        }
    };

    return (
        <div className="space-y-4 md:space-y-5">
            {/* ── History & Symptoms ──────────────────────────────────────── */}
            <Card title="History & Symptoms">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-type-heading">Complaints (Auto-Bulleted)</label>
                    <Button
                        variant="secondary"
                        className="text-xs py-1 h-auto flex gap-1"
                        onClick={() => dispatch(toggleHistoryDrawer({ open: true, type: 'medical' }))}
                    >
                        <HistoryIcon size={14} /> View History
                    </Button>
                </div>
                <textarea
                    value={clinical.historyText}
                    onChange={handleHistoryChange}
                    disabled={isVisitLocked}
                    className="input-field min-h-[150px] font-mono text-sm"
                    placeholder="Start typing symptoms... each new line will be bulleted."
                />
            </Card>

            {/* ── Clinical Vitals ─────────────────────────────────────────── */}
            <Card title="Clinical Vitals">
                {/* Header row: description + toggle button */}
                <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-type-body">
                        {isCompareMode
                            ? 'Longitudinal comparison — scroll horizontally for past visits'
                            : 'Enter vital parameters from reports'}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsCompareMode(prev => !prev)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${isCompareMode
                                ? 'bg-[#2563EB] text-white border-[#1D4ED8] shadow-sm'
                                : 'bg-white text-[#2563EB] border-[#2563EB] hover:bg-[#EFF6FF]'
                                }`}
                        >
                            {isCompareMode
                                ? <><X size={13} /> Close Compare</>
                                : <><Table size={13} /> Compare Table</>
                            }
                        </button>
                    </div>
                </div>

                {isCompareMode ? (
                    /* ── Compare Table View ─────────────────────────────── */
                    <CompareTable
                        vitals={clinical.vitals}
                        history={vitalsHistory}
                        onVitalsChange={handleVitalsChange}
                        isLocked={isVisitLocked}
                    />
                ) : (
                    /* ── Standard Grid View ─────────────────────────────── */
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        {vitalsFields.map((field) => (
                            <Input
                                key={field.name}
                                label={field.label}
                                name={field.name}
                                value={clinical.vitals[field.name] || ''}
                                onChange={handleVitalsChange}
                                disabled={isVisitLocked}
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                            />
                        ))}
                    </div>
                )}

                {!isCompareMode && (
                    <div className="mt-6">
                        <label className="text-sm font-semibold text-type-heading mb-1 block flex items-center gap-2">
                            <MoreHorizontal size={16} className="text-primary-base" />
                            Other Vital Parameters
                        </label>
                        <textarea
                            value={clinical.vitals.others || ''}
                            onChange={(e) => dispatch(updateClinicalDetails({
                                vitals: { ...clinical.vitals, others: e.target.value }
                            }))}
                            disabled={isVisitLocked}
                            className="input-field min-h-[100px] text-sm"
                            placeholder="Enter any other specific vital observations..."
                        />
                    </div>
                )}
            </Card>

            {/* ── Reports & Documents ─────────────────────────────────────── */}
            <Card title="Reports & Documents">
                {/* ── Amber volatility warning ────────────────────────────── */}
                {hasPendingFiles && !hasOrphanedFiles && (
                    <div className="flex items-start gap-3 p-3.5 mb-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                        <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold">Do not refresh or close this page.</p>
                            <p className="mt-0.5 opacity-90">
                                {Object.keys(pendingFiles).length} file{Object.keys(pendingFiles).length > 1 ? 's' : ''} attached. Files will be irrevocably lost if you refresh before clicking “Send to Doctor”.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Red orphan warning ───────────────────────────────── */}
                {hasOrphanedFiles && (
                    <div className="flex items-start gap-3 p-3.5 mb-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                        <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold">Missing Attachments Detected.</p>
                            <p className="mt-0.5 opacity-90">
                                A page refresh wiped your attached files. Remove them from the list below or re-attach before proceeding.
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-3 border border-dashed border-borderColor rounded-lg p-3 bg-gray-50">
                    <FileUp size={20} className="text-type-body shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-type-heading leading-tight">Upload Patient Reports</p>
                        <p className="text-xs text-type-body mt-0.5 truncate">PDF, JPG, PNG</p>
                    </div>
                    <input
                        type="file"
                        id="report-upload"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={isVisitLocked || !canUpload}
                    />
                    <Button
                        variant="primary"
                        onClick={() => document.getElementById('report-upload')?.click()}
                        disabled={isVisitLocked || !canUpload}
                        className="flex gap-1.5 text-xs py-1.5 h-auto shrink-0"
                    >
                        <Camera size={14} /> Select
                    </Button>
                    {!canUpload && <p className="text-xs text-status-error font-medium shrink-0">Fill Basic info first</p>}
                </div>
                {canUpload && !effectiveId && (
                    <p className="mt-1.5 text-xs text-blue-500 font-medium italic">Syncing with cloud... uploads will be processed on finalize</p>
                )}

                {clinical.reports.length > 0 && (
                    <div className="mt-4">
                        <h4 className="font-semibold text-type-heading mb-3">Recent Uploads</h4>
                        <div className="space-y-2">
                            {clinical.reports.map((report, idx) => {
                                const isOrphaned = report.isPending && (!report.fileId || !pendingFiles[report.fileId]);
                                return (
                                    <div key={idx} className={`flex items-center justify-between p-3 bg-white border rounded-md shadow-tier-light ${isOrphaned ? 'border-red-300 bg-red-50' : 'border-borderColor'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded ${isOrphaned ? 'bg-red-100 text-red-500' : 'bg-primary-light text-primary-base'}`}>
                                                <FileText size={16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-type-heading truncate max-w-[200px]">{report.fileName}</p>
                                                <p className="text-xs text-type-body">{(report.fileSize / 1024).toFixed(1)} KB • {report.category}</p>
                                            </div>
                                        </div>
                                        {/* ── Action buttons ─────────────────────────────── */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            {isOrphaned ? (
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">
                                                    <AlertCircle size={13} /> File lost
                                                </div>
                                            ) : (
                                                <Button 
                                                    variant="secondary" 
                                                    className="text-xs py-1 h-auto"
                                                    onClick={() => handleViewReport(report)}
                                                >
                                                    View
                                                </Button>
                                            )}
                                            {/* Remove is always available */}
                                            <button
                                                onClick={() => handleRemoveReport(idx)}
                                                disabled={isVisitLocked}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Remove file"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="mt-4">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-sm font-semibold text-type-heading block">Report Details / Notes</label>
                        <Button
                            variant="secondary"
                            className="text-xs py-1 h-auto flex gap-1"
                            onClick={() => dispatch(toggleHistoryDrawer({ open: true, type: 'reports' }))}
                        >
                            <HistoryIcon size={14} /> View History
                        </Button>
                    </div>
                    <textarea
                        value={clinical.reportNotes || ''}
                        onChange={handleReportNotesChange}
                        disabled={isVisitLocked}
                        className="input-field min-h-[120px] text-sm"
                        placeholder="Add findings, summaries, or specific observations about the uploaded reports..."
                    />
                </div>

            </Card>
        </div>
    );
};
