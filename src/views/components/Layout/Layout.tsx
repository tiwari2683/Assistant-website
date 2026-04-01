import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, Calendar, Users as UsersIcon, LogOut, Menu, X, ChevronRight, Settings } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { clearAuth } from '../../../controllers/slices/authSlice';
import { signOut } from 'aws-amplify/auth';
import type { RootState } from '../../../controllers/store';

export const Layout = () => {
    const dispatch = useDispatch();
    const location = useLocation();
    const { name, role } = useSelector((state: RootState) => state.auth.user) || { name: 'Assistant User', role: 'Assistant' };
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Close mobile menu on navigation
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location]);

    const handleLogout = async () => {
        try {
            await signOut();
            dispatch(clearAuth());
        } catch (error) {
            console.error('Error signing out: ', error);
        }
    };

    const navItemClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center justify-between px-4 py-2.5 rounded-xl font-bold transition-all duration-300 group ${isActive
            ? 'bg-primary-base text-white shadow-md shadow-primary-base/25'
            : 'text-type-body hover:bg-slate-100 hover:text-type-heading'
        }`;

    const navLinks = [
        { to: '/', icon: Home, label: 'Dashboard' },
        { to: '/appointments', icon: Calendar, label: 'Appointments' },
        { to: '/patients', icon: UsersIcon, label: 'Patients' },
        { to: '/settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <div className="flex flex-col md:flex-row h-screen bg-appBg overflow-hidden">
            
            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border-b border-borderColor sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="bg-primary-base p-2 rounded-xl text-white shadow-lg shadow-primary-base/20">
                        <Activity size={20} />
                    </div>
                    <div>
                        <h1 className="font-black text-type-heading text-lg leading-none tracking-tight">Physician</h1>
                        <span className="text-[10px] font-black text-primary-base uppercase tracking-widest">Assistant Panel</span>
                    </div>
                </div>
                <button 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2.5 rounded-xl bg-slate-50 text-type-heading border border-borderColor active:scale-95 transition-all"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Desktop Sidebar */}
            <aside className="w-72 bg-white border-r border-borderColor flex-col hidden md:flex relative z-40">
                {/* Logo Section */}
                <div className="p-6 mb-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-primary-base to-indigo-600 p-2 rounded-xl text-white shadow-md shadow-primary-base/20">
                            <Activity size={20} />
                        </div>
                        <div>
                            <h1 className="font-black text-type-heading text-xl leading-none tracking-tighter">Physician</h1>
                            <span className="text-[10px] font-black text-primary-base uppercase tracking-[0.2em] mt-1 block">Assistant</span>
                        </div>
                    </div>
                </div>

                {/* Nav Section */}
                <nav className="flex-1 px-4 space-y-2">
                    <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Main Menu</p>
                    {navLinks.map((link) => (
                        <NavLink key={link.to} to={link.to} className={navItemClass}>
                            {({ isActive }) => (
                                <>
                                    <div className="flex items-center gap-3">
                                        <link.icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary-base transition-colors'} />
                                        <span className="text-sm">{link.label}</span>
                                    </div>
                                    {isActive && (
                                        <motion.div layoutId="nav-indicator">
                                            <ChevronRight size={16} className="text-white/70" />
                                        </motion.div>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* User Section */}
                <div className="p-4 mt-auto">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-borderColor">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-base to-indigo-400 p-[2px]">
                                <div className="w-full h-full rounded-lg bg-white flex items-center justify-center text-primary-base font-black text-base">
                                    {name[0].toUpperCase()}
                                </div>
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-black text-type-contrast truncate">{name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{role}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 justify-center px-4 py-2 text-sm font-black text-rose-500 bg-white border border-rose-100 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
                        >
                            <LogOut size={16} />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Drawer */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] md:hidden"
                        />
                        <motion.aside 
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white z-[70] md:hidden shadow-2xl flex flex-col"
                        >
                            <div className="p-6 border-b border-borderColor flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary-base p-2 rounded-xl text-white">
                                        <Activity size={20} />
                                    </div>
                                    <h1 className="font-black text-type-heading text-xl tracking-tight">Assistant</h1>
                                </div>
                                <button 
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-2 rounded-lg bg-slate-100 text-slate-500"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <nav className="flex-1 p-6 space-y-3">
                                {navLinks.map((link) => (
                                    <NavLink key={link.to} to={link.to} className={navItemClass}>
                                        <div className="flex items-center gap-4">
                                            <link.icon size={22} />
                                            <span className="text-lg">{link.label}</span>
                                        </div>
                                        <ChevronRight size={18} />
                                    </NavLink>
                                ))}
                            </nav>

                            <div className="p-6 border-t border-borderColor bg-slate-50">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-primary-base flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary-base/20">
                                        {name[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-lg font-black text-type-contrast">{name}</p>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{role}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 justify-center px-4 py-4 text-sm font-black text-rose-500 bg-white border border-rose-200 rounded-2xl shadow-sm"
                                >
                                    <LogOut size={20} />
                                    Sign Out
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto scroll-smooth">
                <Outlet />
            </main>
        </div>
    );
};

// Helper component for Logo
const Activity = ({ size, className }: { size: number, className?: string }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
);
