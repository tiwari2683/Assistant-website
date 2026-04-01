import React, { useState } from 'react';
import { useAppDispatch } from '../../../controllers/hooks';
import { setAuthSuccess } from '../../../controllers/slices/authSlice';
import { Card, Input, Button } from '../../components/UI';
import { UserPlus } from 'lucide-react';
import { signUp, confirmSignUp, signIn, fetchUserAttributes } from 'aws-amplify/auth';

interface SignupProps {
    onNavigateToLogin: () => void;
}

export const SignupScreen: React.FC<SignupProps> = ({ onNavigateToLogin }) => {
    const dispatch = useAppDispatch();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmationCode, setConfirmationCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'SIGNUP' | 'CONFIRM'>('SIGNUP');

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await signUp({
                username: email,
                password,
                options: {
                    userAttributes: {
                        name: name,
                        email: email,
                        'custom:role': 'Assistant'
                    }
                }
            });
            setStep('CONFIRM');
        } catch (err: any) {
            console.error('Signup error:', err);
            setError(err.message || 'Failed to sign up.');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await confirmSignUp({
                username: email,
                confirmationCode
            });

            // Auto-login after confirmation
            const { isSignedIn } = await signIn({
                username: email,
                password
            });

            if (isSignedIn) {
                const attributes = await fetchUserAttributes();
                dispatch(setAuthSuccess({
                    email: attributes.email || email,
                    name: attributes.name || name,
                    role: (attributes['custom:role'] as 'Assistant' | 'Doctor') || 'Assistant'
                }));
            }
        } catch (err: any) {
            console.error('Confirmation error:', err);
            setError(err.message || 'Failed to confirm account.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-appBg px-4 py-12">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="bg-primary-base w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-tier-medium">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-type-contrast">
                        {step === 'SIGNUP' ? 'Create Account' : 'Verify Email'}
                    </h1>
                    <p className="text-type-body mt-2">
                        {step === 'SIGNUP' ? "Join the Physician's Assistant Panel" : "Enter the code sent to your email"}
                    </p>
                </div>

                <Card>
                    {error && (
                        <div className="mb-4 p-3 bg-status-error/10 border border-status-error text-status-error rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    {step === 'SIGNUP' ? (
                        <form onSubmit={handleSignup} className="space-y-4">
                            <Input
                                label="Full Name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Jane Doe"
                                required
                            />
                            <Input
                                label="Email Address"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="assistant@clinic.com"
                                required
                            />
                            <Input
                                label="Password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />

                            <Button variant="primary" type="submit" loading={loading} className="w-full py-3 mt-4">
                                <UserPlus size={20} className="mr-2" /> Sign Up
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleConfirm} className="space-y-4">
                            <div className="bg-status-info/10 p-4 rounded-md mb-4 text-sm text-status-info border border-status-info/20">
                                Please enter the verification code sent to your email.
                            </div>
                            <Input
                                label="Verification Code"
                                type="text"
                                value={confirmationCode}
                                onChange={(e) => setConfirmationCode(e.target.value)}
                                placeholder="123456"
                                required
                            />
                            <Button variant="primary" type="submit" loading={loading} className="w-full py-3 mt-4">
                                Verify & Sign In
                            </Button>
                            <button
                                type="button"
                                onClick={() => setStep('SIGNUP')}
                                className="w-full text-center text-type-body text-sm hover:underline mt-2"
                            >
                                Back to Signup
                            </button>
                        </form>
                    )}
                </Card>

                {step === 'SIGNUP' && (
                    <p className="text-center mt-6 text-type-body text-sm">
                        Already have an account?{' '}
                        <button onClick={onNavigateToLogin} className="text-primary-base font-bold hover:underline">
                            Sign In
                        </button>
                    </p>
                )}
            </div>
        </div>
    );
};
