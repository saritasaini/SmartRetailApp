import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

// Counter component for animation
const AnimatedCounter = ({ target, prefix = '', suffix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) {
        setCount(0);
        return;
    }
    let start = 0;
    const end = parseInt(target, 10) || target;
    const duration = 2500; // 2.5 seconds
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
          setCount(end);
          clearInterval(timer);
      } else {
          setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [target]);

  return <span>{prefix}{count.toLocaleString('en-IN')}{suffix}</span>;
};

export default function SuperAdminAuditTrail() {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeFilter = searchParams.get('filter') || 'All Activities';
  const startDate = searchParams.get('start') || '';
  const endDate = searchParams.get('end') || '';

  const setActiveFilter = (filter) => {
    setSearchParams(prev => {
      prev.set('filter', filter);
      return prev;
    });
  };

  const setStartDate = (date) => {
    setSearchParams(prev => {
      if (date) prev.set('start', date);
      else prev.delete('start');
      return prev;
    });
  };

  const setEndDate = (date) => {
    setSearchParams(prev => {
      if (date) prev.set('end', date);
      else prev.delete('end');
      return prev;
    });
  };

  const filters = ['All Activities', 'Orders', 'Companies', 'Customers', 'Invoices'];

  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();

    // Subscribe to new logs
    const channel = supabase
      .channel('public:super_admin_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'super_admin_logs' }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('super_admin_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedLogs = data.map(log => {
          const dt = new Date(log.created_at);
          
          // Formatter for time: e.g., "10:30 AM"
          const time = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          
          // Formatter for date: e.g., "June 16, 2026"
          const dateStr = dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          
          // Check if today or yesterday
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          let dayPrefix = '';
          if (dt.toDateString() === today.toDateString()) {
            dayPrefix = 'Today - ';
          } else if (dt.toDateString() === yesterday.toDateString()) {
            dayPrefix = 'Yesterday - ';
          }
          
          // Raw date for filtering: YYYY-MM-DD
          const rawDate = dt.toISOString().split('T')[0];

          return {
            id: log.id,
            type: log.type,
            time: time,
            date: dayPrefix + dateStr,
            rawDate: rawDate,
            title: log.title,
            desc: log.desc,
            color: log.color || 'blue',
            icon: log.icon || 'fas fa-info-circle',
            userInitials: log.user_initials || 'SA',
            userColor: 'gray'
          };
        });
        setAuditLogs(formattedLogs);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
      let typeMatch = true;
      if (activeFilter !== 'All Activities') {
          if (activeFilter === 'Orders') typeMatch = log.type === 'ORDER';
          else if (activeFilter === 'Companies') typeMatch = log.type === 'COMPANY';
          else if (activeFilter === 'Customers') typeMatch = log.type === 'CUSTOMER';
          else if (activeFilter === 'Invoices') typeMatch = log.type === 'INVOICE';
      }

      let dateMatch = true;
      if (startDate && endDate) {
          dateMatch = log.rawDate >= startDate && log.rawDate <= endDate;
      } else if (startDate) {
          dateMatch = log.rawDate >= startDate;
      } else if (endDate) {
          dateMatch = log.rawDate <= endDate;
      }

      return typeMatch && dateMatch;
  });

  const handleExport = () => {
      const headers = ['ID', 'Type', 'Time', 'Date', 'Title', 'Description', 'User'];
      const csvData = filteredLogs.map(log => 
          [log.id, log.type, log.time, log.rawDate, `"${log.title}"`, `"${log.desc}"`, log.userInitials].join(',')
      );
      
      const csvContent = [headers.join(','), ...csvData].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'audit_logs.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const groupedLogs = filteredLogs.reduce((acc, log) => {
      if (!acc[log.date]) acc[log.date] = [];
      acc[log.date].push(log);
      return acc;
  }, {});

  return (
    <div className="space-y-8">
        {/* Header Options specific to Audit */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Audit <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400">Trail</span></h2>
                <p className="text-sm text-gray-500 mt-1">Track all platform activities and changes</p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2">
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 focus:outline-none focus:border-red-500 cursor-pointer shadow-sm" 
                    />
                    <span className="text-gray-400 text-sm font-medium">to</span>
                    <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 focus:outline-none focus:border-red-500 cursor-pointer shadow-sm" 
                    />
                </div>
                <button 
                    onClick={handleExport}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-red-600 transition-colors shadow-sm flex items-center"
                >
                    <i className="fas fa-download mr-2"></i>Export
                </button>
            </div>
        </div>


        {/* Filters */}
        <div className="flex gap-3 flex-wrap fade-in" style={{ animationDelay: '0.5s' }}>
            {filters.map((filter) => (
                <button 
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${activeFilter === filter ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-500/20' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                    {filter}
                </button>
            ))}
        </div>

        {/* Timeline */}
        <div className="glass-card rounded-2xl p-8 shadow-sm border border-gray-100 bg-white fade-in" style={{ animationDelay: '0.6s' }}>
            <h3 className="text-lg font-bold text-gray-800 mb-6">Activity Timeline</h3>
            <div className="space-y-0 pl-2">
                {loading ? (
                    <div className="py-8 text-center text-gray-500 font-medium"><i className="fas fa-spinner fa-spin mr-2"></i>Loading logs...</div>
                ) : Object.keys(groupedLogs).length === 0 ? (
                    <div className="py-8 text-center text-gray-500 font-medium">No activity logs found for this filter.</div>
                ) : (
                    Object.keys(groupedLogs).map((date, dateIndex) => (
                        <React.Fragment key={date}>
                            <div className={`mb-6 relative z-20 ${dateIndex > 0 ? 'mt-8' : ''}`}>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider bg-white py-1">{date}</span>
                            </div>

                            {groupedLogs[date].map((log, logIndex) => {
                                const isLastInGroup = logIndex === groupedLogs[date].length - 1;
                                const isAbsolutelyLast = dateIndex === Object.keys(groupedLogs).length - 1 && isLastInGroup;

                                return (
                                    <div key={log.id} className="relative pl-8 pb-4 group">
                                        {/* Vertical Line */}
                                        {!isAbsolutelyLast && (
                                            <div className="absolute left-[11px] top-12 bottom-[-16px] w-0.5 bg-gradient-to-b from-gray-200 to-transparent"></div>
                                        )}
                                        {/* Dot */}
                                        <div className={`absolute left-0 top-3 w-6 h-6 rounded-full bg-gradient-to-br from-${log.color}-400 to-${log.color}-500 shadow-lg shadow-${log.color}-500/30 flex items-center justify-center z-10 transition-transform duration-300 group-hover:scale-125`}>
                                            <i className={`${log.icon} text-white text-xs`}></i>
                                        </div>
                                        {/* Content Card */}
                                        <div className={`bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:translate-x-2 transition-all duration-300 border-l-[3px] border-l-transparent hover:border-l-${log.color}-500`}>
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className={`px-2.5 py-1 text-xs font-bold text-${log.color}-600 bg-${log.color}-50 rounded-lg border border-${log.color}-100`}>{log.type}</span>
                                                        <span className="text-xs text-gray-400">{log.time}</span>
                                                    </div>
                                                    {log.link ? (
                                                        <Link to={log.link} className="text-sm font-semibold text-gray-800 hover:text-red-600 transition-colors inline-block">{log.title}</Link>
                                                    ) : (
                                                        <p className="text-sm font-semibold text-gray-800">{log.title}</p>
                                                    )}
                                                    <p className="text-xs text-gray-500 mt-1">{log.desc}</p>
                                                </div>
                                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-${log.userColor}-100 to-${log.userColor}-200 flex items-center justify-center text-${log.userColor}-700 font-bold text-sm flex-shrink-0`}>{log.userInitials}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))
                )}
            </div>
        </div>
    </div>
  );
}
