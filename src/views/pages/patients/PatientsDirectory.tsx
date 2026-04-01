import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../controllers/hooks';
import { fetchPatients } from '../../../controllers/apiThunks';
import { PatientProfileModal } from './PatientProfileModal';
import { Search, Activity, Eye, FileText, Users as UsersIcon, Clock, Filter, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Patient } from '../../../models';

type SortOption = 'Newest First' | 'Oldest First' | 'Name (A-Z)';
type FilterOption = 'All' | 'Male' | 'Female' | 'Critical';

const PatientsDirectory = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { patients, isLoading } = useAppSelector(state => state.patients);

    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterOption>('All');
    const [sortOption, setSortOption] = useState<SortOption>('Newest First');
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

    useEffect(() => {
        dispatch(fetchPatients());
    }, [dispatch]);

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Unknown Date';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; 
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const processedPatients = useMemo(() => {
        let result = [...patients];
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            result = result.filter(p =>
                (p.name && p.name.toLowerCase().includes(query)) ||
                (p.patientId && p.patientId.toLowerCase().includes(query)) ||
                (p.diagnosis && p.diagnosis.toLowerCase().includes(query))
            );
        }
        switch (activeFilter) {
            case 'Male':
            case 'Female':
                result = result.filter(p => p.sex === activeFilter);
                break;
            case 'Critical':
                result = result.filter(p => p.diagnosis && p.diagnosis.toLowerCase().includes('critical'));
                break;
            case 'All':
            default:
                break;
        }
        result.sort((a, b) => {
            if (sortOption === 'Name (A-Z)') return a.name.localeCompare(b.name);
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return sortOption === 'Newest First' ? dateB - dateA : dateA - dateB;
        });
        return result;
    }, [patients, searchQuery, activeFilter, sortOption]);

    const filterTabs: FilterOption[] = ['All', 'Male', 'Female', 'Critical'];

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
            <motion.div variants={itemVariants}>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500">
                    Patients Directory
                </h1>
                <p className="text-type-body flex items-center gap-2 mt-1 font-medium text-sm md:text-base">
                    <UsersIcon size={16} className="text-primary-base" />
                    Secure access to your medical records and patient data.
                </p>
            </motion.div>

            {/* Toolbar */}
            <motion.div variants={itemVariants} className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/60 backdrop-blur-md p-2.5 rounded-xl border border-borderColor shadow-glass-sm overflow-hidden">
                <div className="w-full lg:w-80 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-base transition-colors" size={16} />
                    <input
                        type="text"
                        placeholder="Search name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-field pl-11 py-2 text-xs"
                    />
                </div>

                <div className="flex w-full lg:w-auto overflow-x-auto gap-1.5 p-1 no-scrollbar border-y lg:border-y-0 border-borderColor/30 py-2.5 lg:py-0">
                    {filterTabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveFilter(tab)}
                            className={`px-4 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all duration-300 ${activeFilter === tab
                                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                                    : 'text-slate-500 hover:bg-slate-100'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="w-full lg:w-auto flex items-center gap-3">
                    <div className="relative w-full sm:w-auto">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            className="w-full sm:w-auto pl-9 pr-7 py-2 bg-slate-50 border border-borderColor rounded-lg focus:ring-4 focus:ring-primary-base/10 outline-none text-[11px] text-type-contrast font-black uppercase appearance-none"
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value as SortOption)}
                        >
                            <option value="Newest First">Newest First</option>
                            <option value="Oldest First">Oldest First</option>
                            <option value="Name (A-Z)">Name (A-Z)</option>
                        </select>
                    </div>
                </div>
            </motion.div>

            {/* List */}
            <motion.div variants={itemVariants} className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {isLoading ? (
                        <div className="py-20 text-center flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-primary-base border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-type-body font-black uppercase tracking-widest text-xs animate-pulse">Loading Archives...</p>
                        </div>
                    ) : processedPatients.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-20 text-center glass-card border-dashed border-slate-300"
                        >
                            <Search className="mx-auto text-slate-200 mb-4" size={64} />
                            <h3 className="text-xl font-black text-type-heading">No results found</h3>
                            <p className="text-type-body text-sm mt-1">Try refining your search or filter parameters.</p>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 lg:gap-6">
                            {processedPatients.map((patient) => (
                                <motion.div 
                                    key={patient.patientId}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    whileHover={{ y: -3 }}
                                    className="glass-card p-4 md:p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 group border-l-4 border-l-primary-base/20 hover:border-l-primary-base transition-all duration-300"
                                >
                                    <div className="flex items-start gap-4 lg:gap-6 flex-1 min-w-0 w-full">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-700 flex items-center justify-center font-black text-xl shrink-0 shadow-inner group-hover:from-primary-base group-hover:to-indigo-500 group-hover:text-white transition-all duration-500">
                                            {getInitials(patient.name)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                                <h3 className="font-black text-type-heading text-lg lg:text-xl truncate">{patient.name}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-tighter">
                                                        ID: {patient.patientId}
                                                    </span>
                                                    {patient.reportFiles && patient.reportFiles.length > 0 && (
                                                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-tighter flex items-center gap-1">
                                                            <FileText size={9} /> {patient.reportFiles.length} FILES
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-type-body font-bold uppercase tracking-tight">
                                                <span className="flex items-center gap-1.5"><Clock size={12} className="text-slate-400" /> {patient.age}Y · {patient.sex}</span>
                                                <span className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-400" /> Registered {formatDate(patient.createdAt)}</span>
                                            </div>

                                            <div className="mt-3 bg-slate-50/80 rounded-xl p-3 border border-slate-100 flex items-center gap-3 group/box relative overflow-hidden">
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-base/10"></div>
                                                <div className="bg-white p-1.5 rounded-lg shadow-sm">
                                                    <Activity size={14} className="text-primary-base" />
                                                </div>
                                                <p className="text-xs font-bold text-type-contrast truncate">
                                                    <span className="text-slate-400 uppercase text-[9px] tracking-widest block mb-0.5 font-black">Latest Diagnosis</span>
                                                    {patient.diagnosis || "No records found."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-row lg:flex-col items-center gap-2 shrink-0 w-full lg:w-auto justify-end border-t lg:border-t-0 border-borderColor/30 pt-4 lg:pt-0">
                                        <button
                                            onClick={() => setSelectedPatient(patient)}
                                            className="flex-1 lg:flex-none p-2.5 lg:aspect-square rounded-xl bg-white border border-borderColor text-slate-600 hover:border-primary-base hover:text-primary-base hover:shadow-lg transition-all active:scale-90"
                                            title="View Profile"
                                        >
                                            <Eye size={18} className="mx-auto" />
                                        </button>

                                        <button
                                            onClick={() => navigate(`/visit/${patient.patientId}`)}
                                            className="flex-[2] lg:flex-none px-5 py-2.5 rounded-xl transition-all active:scale-95 btn-primary text-xs whitespace-nowrap"
                                        >
                                            Add Vitals
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </motion.div>

            {selectedPatient && (
                <PatientProfileModal
                    patient={selectedPatient}
                    onClose={() => setSelectedPatient(null)}
                />
            )}
        </motion.div>
    );
};

export default PatientsDirectory;
