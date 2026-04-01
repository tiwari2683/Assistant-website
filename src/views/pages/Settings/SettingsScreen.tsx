import React, { useState } from 'react';
import { Card, Input, Button } from '../../components/UI';
import { updatePassword } from 'aws-amplify/auth';
import { KeyRound, ShieldCheck } from 'lucide-react';

export const SettingsScreen = () => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            setError("New passwords don't match.");
            return;
        }

        if (newPassword.length < 8) {
            setError("New password must be at least 8 characters long.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            await updatePassword({ oldPassword, newPassword });
            setSuccess(true);
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            console.error('Change password error:', err);
            setError(err.message || 'Failed to change password. Please check your current password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="bg-primary-base p-3 rounded-2xl text-white shadow-lg shadow-primary-base/20">
                    <ShieldCheck size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-type-heading leading-tight tracking-tight">Account Settings</h1>
                    <p className="text-sm font-medium text-type-body mt-1">Manage your security preferences and profile</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Change Password" className="shadow-tier-base">
                    {success && (
                        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                            <p className="text-sm font-semibold">Your password has been successfully updated.</p>
                        </div>
                    )}
                    
                    {error && (
                        <div className="mb-6 p-4 bg-status-error/10 border border-status-error/20 text-status-error rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <Input
                            label="Current Password"
                            type="password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                        <div className="pt-2">
                            <Input
                                label="New Password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <Input
                            label="Confirm New Password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                        <div className="pt-4">
                            <Button variant="primary" type="submit" loading={loading} className="w-full py-3">
                                <KeyRound size={18} className="mr-2" /> 
                                Update Password
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
};
