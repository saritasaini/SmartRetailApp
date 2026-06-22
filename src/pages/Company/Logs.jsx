import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/ui/GlassCard';
import { Activity, Clock, Filter, Search, ChevronDown, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

export default function CompanyLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  const getLogIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle size={18} className="text-brand-pistachio" />;
      case 'warning': return <AlertTriangle size={18} className="text-brand-honey" />;
      case 'info':
      default: return <Info size={18} className="text-blue-500" />;
    }
  };

  const getLogBg = (type) => {
    switch (type) {
      case 'success': return 'bg-brand-pistachio/10 border-brand-pistachio/20';
      case 'warning': return 'bg-brand-honey/10 border-brand-honey/20';
      case 'info':
      default: return 'bg-blue-500/10 border-blue-500/20';
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

      <div className="flex flex-col sm:flex-row gap-3">
        <GlassCard className="flex flex-1 items-center gap-2 px-4 py-2.5 w-full">
          <Search className="text-text-secondary shrink-0" size={18} />
          <input 
            type="text" 
            placeholder="Search logs by action, detail, or user..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none text-text-primary focus:outline-none w-full text-sm"
          />
        </GlassCard>

        <div className="relative sm:w-48 z-40">
          <GlassCard 
            className="flex items-center justify-between py-2.5 px-4 cursor-pointer h-full"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="flex items-center gap-2">
              <Filter className="text-text-secondary" size={18} />
              <span className="text-sm text-text-primary capitalize truncate">
                {typeFilter === 'all' ? 'All Types' : typeFilter}
              </span>
            </div>
            <ChevronDown size={16} className={`text-text-secondary transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </GlassCard>

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

      <GlassCard className="overflow-hidden p-0">
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
          <div className="divide-y divide-border-light/50">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-bg-primary/30 transition-colors flex gap-4">
                <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center border shrink-0 ${getLogBg(log.type)}`}>
                  {getLogIcon(log.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <h4 className="text-sm font-bold text-text-primary truncate">{log.action}</h4>
                    <span className="text-xs text-text-secondary flex items-center gap-1 shrink-0">
                      <Clock size={12} />
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mb-2">{log.details}</p>
                  <p className="text-xs font-medium text-text-muted">
                    User: <span className="text-text-primary">{log.user_name}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
