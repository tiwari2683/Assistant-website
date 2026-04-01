import React from 'react';
import { useAppDispatch, useAppSelector } from '../../../controllers/hooks';
import { updateBasicDetails } from '../../../controllers/slices/patientVisitSlice';
import { Input, Card } from '../../components/UI';

export const BasicTab: React.FC = () => {
    const dispatch = useAppDispatch();
    const { basic, isVisitLocked } = useAppSelector((state) => state.patientVisit);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'mobileNumber') {
            dispatch(updateBasicDetails({ [name]: value.replace(/\D/g, '') }));
        } else {
            dispatch(updateBasicDetails({ [name]: value }));
        }
    };

    return (
        <Card title="Patient Demographics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                    label="Full Name"
                    name="fullName"
                    value={basic.fullName}
                    onChange={handleChange}
                    disabled={isVisitLocked}
                    placeholder="Enter patient full name"
                    required
                />
                <Input
                    label="Age"
                    name="age"
                    type="number"
                    value={basic.age}
                    onChange={handleChange}
                    disabled={isVisitLocked}
                    placeholder="Years"
                    required
                />
                <Input
                    label="Mobile Number"
                    name="mobileNumber"
                    type="tel"
                    value={basic.mobileNumber}
                    onChange={handleChange}
                    disabled={isVisitLocked}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    required
                />
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-type-heading mb-1">Sex</label>
                    <div className="flex gap-4 mt-2">
                        {['Male', 'Female', 'Other'].map((option) => (
                            <label key={option} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="sex"
                                    value={option}
                                    checked={basic.sex === option}
                                    onChange={handleChange}
                                    disabled={isVisitLocked}
                                    className="w-4 h-4 text-primary-base focus:ring-primary-base"
                                />
                                <span className="text-type-body">{option}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
            <div className="mt-4">
                <label className="block text-sm font-semibold text-type-heading mb-1">Address</label>
                <textarea
                    name="address"
                    value={basic.address}
                    onChange={handleChange}
                    disabled={isVisitLocked}
                    className="input-field min-h-[80px]"
                    placeholder="Patient permanent address"
                />
            </div>
        </Card>
    );
};
