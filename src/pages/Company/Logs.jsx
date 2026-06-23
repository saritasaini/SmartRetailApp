import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/ui/GlassCard';
import { Activity, Clock, Filter, Search, ChevronDown, CheckCircle, AlertTriangle, Info, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

export default function CompanyLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const user = useAuthStore.getState().user;
        const { data, error } = await supabase
          .from('system_logs')
          .select('*')
          .eq('company_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) setLogs(data);
      } catch (error) {
        console.error('Error fetching logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();

    // Set up Realtime subscription
    const channel = supabase.channel('public:system_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_logs' }, payload => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.user_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || log.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter]);

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage, '...', totalPages);
      }
    }
    return pages;
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle size={18} />;
      case 'warning': return <AlertTriangle size={18} />;
      case 'info':
      default: return <Info size={18} />;
    }
  };

  const getIconBg = (type) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-600';
      case 'warning': return 'bg-orange-100 text-orange-600';
      case 'info':
      default: return 'bg-blue-100 text-blue-600';
    }
  };

  const getAccentBg = (type) => {
    switch (type) {
      case 'success': return 'bg-green-600';
      case 'warning': return 'bg-orange-600';
      case 'info':
      default: return 'bg-blue-600';
    }
  };

  const getBadgeBg = (type) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-700';
      case 'warning': return 'bg-orange-100 text-orange-700';
      case 'info':
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">System Logs</h1>
          <p className="text-text-secondary">Track all recent activities and changes in the system.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-5">
        <div className="relative flex-1 max-w-[500px]">
          <Search className="absolute left-[18px] top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search logs by action, detail, or user..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-[14px] pl-[48px] pr-4 border border-border-light rounded-xl text-sm text-text-primary bg-bg-secondary shadow-sm focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 transition-all"
          />
        </div>

        <div className="relative sm:w-48 z-40">
          <button 
            className="w-full py-[14px] px-[20px] border border-border-light rounded-xl bg-bg-secondary text-text-secondary text-sm font-medium cursor-pointer flex items-center justify-between gap-2 shadow-sm hover:border-red-200 hover:shadow-md transition-all"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="flex items-center gap-2">
              <Filter size={16} />
              <span className="capitalize">{typeFilter === 'all' ? 'All Types' : typeFilter}</span>
            </div>
            <ChevronDown size={14} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-bg-secondary border border-border-light rounded-lg shadow-lg overflow-hidden"
              >
                {['all', 'info', 'success', 'warning'].map(type => (
                  <div 
                    key={type}
                    className={`px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-bg-primary capitalize ${typeFilter === type ? 'text-brand-caramel font-semibold bg-bg-primary/50' : 'text-text-primary'}`}
                    onClick={() => { setTypeFilter(type); setIsDropdownOpen(false); }}
                  >
                    {type === 'all' ? 'All Types' : type}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="bg-bg-secondary rounded-xl shadow-sm border border-border-light overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
            <Activity className="animate-pulse mb-4 text-brand-caramel" size={32} />
            <p>Loading activity logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-20 text-text-secondary">
            <Activity className="mx-auto text-text-muted mb-4 opacity-50" size={48} />
            <p className="text-lg">No logs found matching your criteria.</p>
          </div>
        ) : (
          <div>
            {paginatedLogs.map((log) => (
              <div key={log.id} className="relative flex items-start gap-4 p-5 px-6 border-b border-border-light hover:bg-bg-primary/5 transition-colors last:border-b-0 group">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${getIconBg(log.type)}`}>
                  {getLogIcon(log.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-1.5 gap-1 sm:gap-0">
                    <h4 className="text-[15px] font-bold text-text-primary">{log.action}</h4>
                    <span className="text-xs text-text-secondary flex items-center gap-1.5 whitespace-nowrap">
                      <Clock size={12} />
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="text-[13px] text-text-secondary mb-2 leading-relaxed">
                    {log.details}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <div className="text-red-600"><User size={12} /></div>
                      User: <strong className="text-text-primary font-semibold">{log.user_name}</strong>
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${getBadgeBg(log.type)}`}>
                      {log.type}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="w-9 h-9 rounded-full border-none bg-transparent text-gray-500 text-[18px] flex items-center justify-center cursor-pointer hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          
          {getPageNumbers().map((page, i) => (
            page === '...' ? (
              <span key={`ellipsis-${i}`} className="text-gray-400 px-1">...</span>
            ) : (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-9 h-9 rounded-full border-none flex items-center justify-center text-[14px] font-[600] cursor-pointer transition-all ${currentPage === page ? 'bg-red-600 text-white shadow-[0_4px_12px_rgba(220,38,38,0.3)]' : 'bg-transparent text-gray-500 hover:bg-gray-100'}`}
              >
                {page}
              </button>
            )
          ))}

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="w-9 h-9 rounded-full border-none bg-transparent text-gray-500 text-[18px] flex items-center justify-center cursor-pointer hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
