import React, { useState } from 'react';
import { useAppDispatch } from '../../../controllers/hooks';
import { setAuthSuccess } from '../../../controllers/slices/authSlice';
import { Card, Input, Button } from '../../components/UI';
import { LogIn } from 'lucide-react';
import { signIn, fetchUserAttributes, signOut } from 'aws-amplify/auth';

interface LoginProps {
    onNavigateToForgotPassword: () => void; // Removed onNavigateToSignup
}

export const LoginScreen: React.FC<LoginProps> = ({ onNavigateToForgotPassword }) => {
    const dispatch = useAppDispatch();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { isSignedIn, nextStep } = await signIn({
                username: email,
                password,
            });

            if (isSignedIn) {
                const attributes = await fetchUserAttributes();
                const role = (attributes['custom:role'] as 'Assistant' | 'Doctor') || 'Assistant';

                if (role !== 'Assistant') {
                    await signOut();
                    throw new Error("Access Denied: You must be an Assistant to log into this panel.");
                }

                dispatch(setAuthSuccess({
                    email: attributes.email || email,
                    name: attributes.name || 'Assistant User',
                    role: role
                }));
            } else if (nextStep.signInStep === 'CONFIRM_SIGN_UP') {
                setError('Please contact your administrator to confirm your account.');
            }
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Failed to sign in. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-appBg px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="bg-primary-base w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-tier-medium">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-type-contrast">Welcome Back</h1>
                    <p className="text-type-body mt-2">Sign in to your Assistant Panel</p>
                </div>

                <Card>
                    {error && (
                        <div className="mb-4 p-3 bg-status-error/10 border border-status-error text-status-error rounded-md text-sm">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleLogin} className="space-y-4">
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

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="rounded text-primary-base" />
                                <span className="text-type-body">Remember me</span>
                            </label>
                            <button
                                type="button"
                                onClick={onNavigateToForgotPassword}
                                className="text-primary-base font-semibold hover:underline"
                            >
                                Forgot password?
                            </button>
                        </div>

                        <Button variant="primary" type="submit" loading={loading} className="w-full py-3">
                            <LogIn size={20} className="mr-2" /> Sign In
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
};