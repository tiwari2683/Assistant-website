import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../controllers/hooks';
import { fetchAppointments } from '../../../controllers/apiThunks';
import { Calendar, Clock, Plus, Search, MoreVertical, ChevronRight } from 'lucide-react';
import { NewAppointmentModal } from './NewAppointmentModal';
import { motion, AnimatePresence } from 'framer-motion';
import type { Appointment } from '../../../models';

const AppointmentsList = () => {
    const dispatch = useAppDispatch();
    const { appointments, isLoading } = useAppSelector(state => state.appointments);
    const [activeTab, setActiveTab] = useState<'Today' | 'Upcoming' | 'Completed' | 'Canceled'>('Today');
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

    useEffect(() => {
        dispatch(fetchAppointments());
    }, [dispatch]);

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const getSmartStatusAndDate = (apt: Appointment) => {
        const rawStatus = apt.status?.toLowerCase() || 'upcoming';
        let smartStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
        let aptDateObj: Date | null = null;

        try {
            const dateStr = `${apt.date} ${apt.time}`;
            aptDateObj = new Date(dateStr);

            if (!isNaN(aptDateObj.getTime())) {
                const now = new Date();
                if (smartStatus === 'Upcoming' && aptDateObj < now) {
                    smartStatus = 'Completed';
                }
            }
        } catch (e) {
            console.error("Could not parse date", apt.date, apt.time);
        }

        return { smartStatus, aptDateObj };
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const filteredAppointments = appointments.filter(apt => {
        const { smartStatus, aptDateObj } = getSmartStatusAndDate(apt);
        if (searchQuery && !apt.patientName.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        switch (activeTab) {
            case 'Today':
                if (aptDateObj) {
                    return aptDateObj >= today && aptDateObj < tomorrow && smartStatus !== 'Canceled';
                }
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const todayStr = `${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
                return apt.date === todayStr && smartStatus !== 'Canceled';
            case 'Upcoming':
                if (aptDateObj) {
                    return aptDateObj >= tomorrow && smartStatus === 'Upcoming';
                }
                return smartStatus === 'Upcoming';
            case 'Completed':
                return smartStatus === 'Completed';
            case 'Canceled':
                return smartStatus === 'Canceled';
            default:
                return true;
        }
    });

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'Upcoming':
                return { badge: 'bg-primary-light text-primary-base border-primary-base/10', avatar: 'from-primary-base to-indigo-600', icon: 'text-primary-base' };
            case 'Completed':
                return { badge: 'bg-secondary-light text-secondary-base border-secondary-base/10', avatar: 'from-secondary-base to-emerald-600', icon: 'text-secondary-base' };
            case 'Canceled':
                return { badge: 'bg-rose-50 text-rose-500 border-rose-100', avatar: 'from-rose-500 to-orange-600', icon: 'text-rose-500' };
            default:
                return { badge: 'bg-slate-100 text-slate-500 border-slate-200', avatar: 'from-slate-400 to-slate-600', icon: 'text-slate-400' };
        }
    };

    const tabs: ('Today' | 'Upcoming' | 'Completed' | 'Canceled')[] = ['Today', 'Upcoming', 'Completed', 'Canceled'];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500">
                        Appointments Manager
                    </h1>
                    <p className="text-type-body flex items-center gap-2 mt-1 font-medium">
                        <Calendar size={16} className="text-primary-base" />
                        Manage and view all patient appointments.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setSelectedAppointment(null);
                        setIsModalOpen(true);
                    }}
                    className="btn-primary w-full md:w-auto overflow-hidden group relative"
                >
                    <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12"></div>
                    <Plus size={20} />
                    <span>New Appointment</span>
                </button>
            </motion.div>

            {/* Filters Bar */}
            <motion.div variants={itemVariants} className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white/60 backdrop-blur-md p-3 rounded-2xl border border-borderColor shadow-glass-sm">
                <div className="flex w-full lg:w-auto overflow-x-auto gap-2 p-1 no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition-all duration-300 ${activeTab === tab
                                ? 'bg-primary-base text-white shadow-md shadow-primary-base/20'
                                : 'text-slate-500 hover:bg-slate-100 hover:text-type-heading'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="w-full lg:w-96 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-base transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search patient name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-field pl-11 py-2 text-xs"
                    />
                </div>
            </motion.div>

            {/* Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {isLoading ? (
                        <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
                            <div className="w-10 h-10 border-4 border-primary-base border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-type-body font-bold animate-pulse">Fetching records...</p>
                        </div>
                    ) : filteredAppointments.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="col-span-full py-20 text-center glass-card border-dashed border-slate-300"
                        >
                            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                <Calendar className="text-slate-300" size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-type-heading mb-1">Queue Clear</h3>
                            <p className="text-type-body text-sm">No matches found for "{activeTab}" filter.</p>
                        </motion.div>
                    ) : (
                        filteredAppointments.map((apt) => {
                            const { smartStatus } = getSmartStatusAndDate(apt);
                            const styles = getStatusStyles(smartStatus);

                            return (
                                <motion.div 
                                    key={apt.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    whileHover={{ y: -5 }}
                                    className="glass-card p-4 md:p-5 group cursor-default"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${styles.avatar} text-white flex items-center justify-center font-black text-base shadow-lg shrink-0`}>
                                                {getInitials(apt.patientName)}
                                            </div>
                                            <div className="min-w-0 pr-4">
                                                <h3 className="font-bold text-type-heading text-base leading-tight truncate">{apt.patientName}</h3>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-[10px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                                        {apt.type || 'Consultation'}
                                                    </span>
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-tighter ${styles.badge}`}>
                                                        {smartStatus}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMenuOpenId(menuOpenId === apt.id ? null : apt.id);
                                                }}
                                                className="text-slate-400 hover:text-type-heading p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                                            >
                                                <MoreVertical size={16} />
                                            </button>
                                            <AnimatePresence>
                                                {menuOpenId === apt.id && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        className="absolute right-0 mt-2 w-48 bg-white border border-borderColor rounded-2xl shadow-tier-dark z-20 overflow-hidden"
                                                    >
                                                        <button
                                                            className="w-full text-left px-5 py-3.5 hover:bg-slate-50 text-sm text-type-contrast font-bold transition flex items-center justify-between group"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedAppointment(apt);
                                                                setIsModalOpen(true);
                                                                setMenuOpenId(null);
                                                            }}
                                                        >
                                                            <span>Edit Schedule</span>
                                                            <ChevronRight size={14} className="text-slate-300 group-hover:text-primary-base transition-colors" />
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/50 rounded-xl p-3 border border-slate-100/50">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-slate-400">
                                                <Calendar size={12} />
                                                <span className="text-[9px] font-black uppercase tracking-widest leading-none">Date</span>
                                            </div>
                                            <span className="font-bold text-type-contrast text-xs">{apt.date}</span>
                                        </div>
                                        <div className="flex flex-col gap-1 pl-3 border-l border-slate-200">
                                            <div className="flex items-center gap-1.5 text-slate-400">
                                                <Clock size={12} />
                                                <span className="text-[9px] font-black uppercase tracking-widest leading-none">Time</span>
                                            </div>
                                            <span className="font-bold text-type-contrast text-xs">{apt.time}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </motion.div>

            {isModalOpen && (
                <NewAppointmentModal
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedAppointment(null);
                    }}
                    initialData={selectedAppointment}
                />
            )}
        </motion.div>
    );
};

export default AppointmentsList;
