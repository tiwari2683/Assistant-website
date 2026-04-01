import React from 'react';
import { useAppDispatch, useAppSelector } from '../../../controllers/hooks';
import { updateDiagnosisDetails, toggleHistoryDrawer } from '../../../controllers/slices/patientVisitSlice';
import { Card, Button } from '../../components/UI';
import { History as HistoryIcon } from 'lucide-react';

export const DiagnosisTab: React.FC = () => {
    const dispatch = useAppDispatch();
    const { diagnosis, isVisitLocked } = useAppSelector((state) => state.patientVisit);

    const handleDiagnosisChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        let value = e.target.value;
        const lines = value.split('\n');
        const bulletedLines = lines.map(line => {
            if (line.trim() && !line.trim().startsWith('•')) {
                return `• ${line.trim()}`;
            }
            return line;
        });
        dispatch(updateDiagnosisDetails({ diagnosisText: bulletedLines.join('\n') }));
    };

    const toggleInvestigation = (id: string) => {
        if (isVisitLocked) return;
        const current = [...diagnosis.selectedInvestigations];
        const index = current.indexOf(id);
        if (index > -1) {
            current.splice(index, 1);
        } else {
            current.push(id);
        }
        dispatch(updateDiagnosisDetails({ selectedInvestigations: current }));
    };

    // ⚠️ These strings must EXACTLY match the PWA's DiagnosisTab.tsx COMMON_INVESTIGATIONS.
    // If you add or rename any string here, update the PWA list too.
    const investigations = [
        'Complete Blood Count (CBC)', 'Blood Sugar - Fasting', 'Blood Sugar - Post Prandial',
        'HbA1c', 'Lipid Profile', 'Liver Function Test (LFT)', 'Kidney Function Test (KFT)',
        'Thyroid Profile', 'Urine Routine', 'X-Ray Chest', 'X-Ray - Other',
        'Ultrasound Abdomen', 'ECG', '2D Echo', 'CT Scan', 'MRI',
        'PFT (Pulmonary Function Test)', 'Blood Pressure Monitoring', 'Vitamin D3'
    ];

    return (
        <div className="space-y-4 md:space-y-5">
            <Card title="Clinical Diagnosis">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-type-heading">Current Diagnosis (Auto-Bulleted)</label>
                    <Button
                        variant="secondary"
                        className="text-xs py-1 h-auto flex gap-1"
                        onClick={() => dispatch(toggleHistoryDrawer({ open: true, type: 'diagnosis' }))}
                    >
                        <HistoryIcon size={14} /> History
                    </Button>
                </div>
                <textarea
                    value={diagnosis.diagnosisText}
                    onChange={handleDiagnosisChange}
                    disabled={isVisitLocked}
                    className="input-field min-h-[100px] font-mono text-sm"
                    placeholder="Enter diagnosis details..."
                />
            </Card>

            <Card title="Investigations Advised">
                <p className="text-sm text-type-body mb-4">Select investigations to be carried out</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {investigations.map((test) => (
                        <label
                            key={test}
                            className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${diagnosis.selectedInvestigations.includes(test)
                                ? 'bg-primary-light border-primary-base text-primary-dark'
                                : 'bg-white border-borderColor text-type-body hover:border-primary-base/50'
                                } ${isVisitLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={diagnosis.selectedInvestigations.includes(test)}
                                onChange={() => toggleInvestigation(test)}
                                disabled={isVisitLocked}
                            />
                            <span className="text-sm font-medium">{test}</span>
                        </label>
                    ))}
                </div>

                <div className="mt-6">
                    <label className="text-sm font-semibold text-type-heading mb-1 block">Custom Investigations</label>
                    <div className="flex gap-2">
                        <textarea
                            value={diagnosis.customInvestigations}
                            onChange={(e) => dispatch(updateDiagnosisDetails({ customInvestigations: e.target.value }))}
                            disabled={isVisitLocked}
                            className="input-field flex-1 min-h-[60px]"
                            placeholder="Add other required tests manually..."
                        />
                    </div>
                </div>
            </Card>
        </div>
    );
};
