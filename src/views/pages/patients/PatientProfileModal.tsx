import { X, FileText, Pill, Activity } from 'lucide-react';
import type { Patient, Medication } from '../../../models';
import { UploadService } from '../../../services/uploadService';

interface Props {
    patient: Patient;
    onClose: () => void;
}

export const PatientProfileModal = ({ patient, onClose }: Props) => {
    const formattedDate = patient.createdAt
        ? new Date(patient.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'N/A';

    const medicationsList: Medication[] = patient.medications || [];
    const reportsList: any[] = patient.reportFiles || [];

    const handleViewReport = async (report: any) => {
        if (report.s3Key) {
            try {
                if (!patient.patientId) throw new Error("No valid patient ID to fetch report");
                const data = await UploadService.getPresignedGetUrl(patient.patientId, report.s3Key);
                if (data.url) {
                    window.open(data.url, '_blank');
                } else {
                    throw new Error("Could not retrieve secure URL");
                }
            } catch (error) {
                console.error("Failed to fetch secure report URL", error);
                alert("Failed to securely fetch this report. Please try again.");
            }
        } else if (report.signedUrl || report.url) {
            window.open(report.signedUrl || report.url, '_blank');
        } else if (report.fileUrl) {
            window.open(report.fileUrl, '_blank');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 transition-opacity" onClick={onClose}>
            <div
                className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                    <div>
                        <h2 className="text-2xl font-bold text-[#1F2937]">{patient.name}</h2>
                        <span className="text-sm font-medium text-[#6B7280]">#{patient.patientId}</span>
                    </div>
                    <button onClick={onClose} className="p-2 text-[#6B7280] hover:text-[#EF4444] rounded-full hover:bg-red-50 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto space-y-8">

                    {/* Demographics */}
                    <section>
                        <h3 className="text-sm font-bold tracking-wide text-[#6B7280] uppercase mb-4">Demographics</h3>
                        <div className="grid grid-cols-2 gap-4 bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB]">
                            <div>
                                <p className="text-xs text-[#9CA3AF] font-medium uppercase">First Visit Date</p>
                                <p className="font-semibold text-[#374151] mt-1">{formattedDate}</p>
                            </div>
                            <div>
                                <p className="text-xs text-[#9CA3AF] font-medium uppercase">Age</p>
                                <p className="font-semibold text-[#374151] mt-1">{patient.age} yrs</p>
                            </div>
                            <div>
                                <p className="text-xs text-[#9CA3AF] font-medium uppercase">Gender</p>
                                <p className="font-semibold text-[#374151] mt-1">{patient.sex}</p>
                            </div>
                        </div>
                    </section>

                    {/* Medical Details */}
                    <section>
                        <h3 className="text-sm font-bold tracking-wide text-[#6B7280] uppercase mb-4">Medical Details</h3>
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm">
                                <p className="text-xs text-[#9CA3AF] font-medium uppercase flex items-center gap-2 mb-2">
                                    <Activity size={14} className="text-[#2563EB]" />
                                    Latest Diagnosis
                                </p>
                                <p className="font-medium text-[#1F2937] leading-relaxed">
                                    {patient.diagnosis || 'No diagnosis recorded yet.'}
                                </p>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm">
                                <p className="text-xs text-[#9CA3AF] font-medium uppercase mb-2">Advised Investigations</p>
                                <p className="font-medium text-[#1F2937] leading-relaxed">
                                    {patient.advisedInvestigations || 'None advised.'}
                                </p>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm">
                                <p className="text-xs text-[#9CA3AF] font-medium uppercase mb-2">Treatment Plan</p>
                                <p className="font-medium text-[#1F2937] leading-relaxed whitespace-pre-wrap">
                                    {patient.treatment || 'No specific treatment plan noted.'}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Medications */}
                    <section>
                        <h3 className="text-sm font-bold tracking-wide text-[#6B7280] uppercase mb-4">Current Medications</h3>
                        {medicationsList.length === 0 ? (
                            <div className="bg-[#F9FAFB] border border-dashed border-[#D1D5DB] rounded-xl p-8 text-center">
                                <p className="text-[#6B7280] text-sm">No active medications.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {medicationsList.map((med, index) => (
                                    <div key={index} className="flex items-start gap-4 p-4 rounded-xl border border-[#E5E7EB] shadow-sm bg-white">
                                        <div className="bg-[#DBEAFE] p-2 rounded-lg shrink-0 mt-1">
                                            <Pill className="text-[#2563EB]" size={18} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-[#1F2937] text-base">{med.name}</h4>
                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                <span className="text-xs font-semibold text-[#10B981] bg-[#D1FAE5] px-2 py-1 rounded-md">
                                                    {med.dosage}
                                                </span>
                                                <span className="text-xs font-semibold text-[#6B7280] bg-[#F3F4F6] px-2 py-1 rounded-md">
                                                    {med.frequency}
                                                </span>
                                            </div>
                                            {med.instructions && (
                                                <p className="text-sm text-[#6B7280] mt-2 italic">{med.instructions}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Reports Grid */}
                    <section>
                        <h3 className="text-sm font-bold tracking-wide text-[#6B7280] uppercase mb-4">Laboratory Reports</h3>
                        {reportsList.length === 0 ? (
                            <div className="bg-[#F9FAFB] border border-dashed border-[#D1D5DB] rounded-xl p-8 text-center flex flex-col items-center">
                                <FileText className="text-[#9CA3AF] mb-2" size={24} />
                                <p className="text-[#6B7280] text-sm">No reports uploaded.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                {reportsList.map((report, index) => (
                                    <div 
                                        key={index} 
                                        className="bg-white border border-[#E5E7EB] rounded-xl p-3 flex flex-col hover:border-[#2563EB] cursor-pointer transition shadow-sm group"
                                        onClick={() => handleViewReport(report)}
                                    >
                                        <div className="bg-[#F3F4F6] h-24 mb-3 rounded-lg flex items-center justify-center group-hover:bg-[#DBEAFE] transition">
                                            <FileText className="text-[#9CA3AF] group-hover:text-[#2563EB]" size={32} />
                                        </div>
                                        <p className="text-xs font-semibold text-[#374151] truncate" title={report.fileName || 'Report Document'}>
                                            {report.fileName || `Report ${index + 1}`}
                                        </p>
                                        <p className="text-[10px] text-[#6B7280] mt-1">{report.category || 'Document'}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};
