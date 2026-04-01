import React, { useState } from 'react';
import { Card, Input, Button } from '../../components/UI';
import { ArrowLeft, KeyRound, Mail, CheckCircle2 } from 'lucide-react';
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth';

interface ForgotPasswordProps {
    onNavigateToLogin: () => void;
}

type Step = 'EMAIL' | 'OTP' | 'SUCCESS';

export const ForgotPasswordScreen: React.FC<ForgotPasswordProps> = ({ onNavigateToLogin }) => {
    const [step, setStep] = useState<Step>('EMAIL');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await resetPassword({ username: email });
            setStep('OTP');
        } catch (err: any) {
            console.error('Reset password error:', err);
            setError(err.message || 'Failed to send reset code.');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmReset = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            setError("Passwords don't match.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await confirmResetPassword({ 
                username: email, 
                confirmationCode: otp, 
                newPassword 
            });
            setStep('SUCCESS');
        } catch (err: any) {
            console.error('Confirm password error:', err);
            setError(err.message || 'Failed to reset password. Please check your code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-appBg px-4">
            <div className="max-w-md w-full">
                
                {step !== 'SUCCESS' && (
                    <button 
                        type="button"
                        onClick={onNavigateToLogin}
                        className="mb-6 flex items-center text-type-body hover:text-primary-base transition-colors"
                    >
                        <ArrowLeft size={20} className="mr-2" />
                        Back to Login
                    </button>
                )}

                <div className="text-center mb-8">
                    <div className="bg-primary-base w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-tier-medium">
                        {step === 'SUCCESS' ? (
                            <CheckCircle2 className="w-10 h-10 text-white" />
                        ) : step === 'OTP' ? (
                            <KeyRound className="w-10 h-10 text-white" />
                        ) : (
                            <Mail className="w-10 h-10 text-white" />
                        )}
                    </div>
                    <h1 className="text-3xl font-bold text-type-contrast">
                        {step === 'EMAIL' ? 'Forgot Password?' : step === 'OTP' ? 'Reset Password' : 'Password Reset'}
                    </h1>
                    <p className="text-type-body mt-2">
                        {step === 'EMAIL' 
                            ? "Enter your email, and we'll send you a code to reset your password."
                            : step === 'OTP' 
                                ? "Enter the 6-digit code sent to your email and your new password."
                                : "Your password has been successfully reset."}
                    </p>
                </div>

                <Card>
                    {error && (
                        <div className="mb-4 p-3 bg-status-error/10 border border-status-error text-status-error rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    {step === 'EMAIL' && (
                        <form onSubmit={handleSendCode} className="space-y-4">
                            <Input
                                label="Email Address"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="assistant@clinic.com"
                                required
                            />
                            <Button variant="primary" type="submit" loading={loading} className="w-full py-3">
                                Send Reset Code
                            </Button>
                        </form>
                    )}

                    {step === 'OTP' && (
                        <form onSubmit={handleConfirmReset} className="space-y-4">
                            <div className="mb-4 text-sm text-center font-medium bg-primary-base/10 text-primary-base p-3 rounded-lg border border-primary-base/20">
                                Code sent to: {email}
                            </div>
                            
                            <Input
                                label="Verification Code"
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="123456"
                                required
                            />
                            <Input
                                label="New Password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                            <Input
                                label="Confirm New Password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                            <Button variant="primary" type="submit" loading={loading} className="w-full py-3">
                                Change Password
                            </Button>
                        </form>
                    )}

                    {step === 'SUCCESS' && (
                        <div className="space-y-4 text-center">
                            <Button 
                                variant="primary" 
                                type="button" 
                                onClick={onNavigateToLogin} 
                                className="w-full py-3"
                            >
                                Return to Login
                            </Button>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};
