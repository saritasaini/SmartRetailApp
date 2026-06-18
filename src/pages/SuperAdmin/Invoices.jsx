import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Counter component for animation
const AnimatedCounter = ({ target }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) {
        setCount(0);
        return;
    }
    let start = 0;
    const end = parseInt(target, 10);
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

  return <span>{count.toLocaleString('en-IN')}</span>;
};

export default function SuperAdminInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [stats, setStats] = useState({
      total: 0,
      paid: 0,
      pending: 0
  });

  useEffect(() => {
      fetchInvoices();
  }, []);

  useEffect(() => {
      setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  const fetchInvoices = async () => {
      try {
          // Temporarily removed dummy records. To be replaced with real API call later.
          setInvoices([]);
          setStats({
              total: 0,
              paid: 0,
              pending: 0
          });

          setLoading(false);
      } catch (error) {
          console.error('Error fetching invoices:', error);
          setLoading(false);
      }
  };

  const filteredInvoices = invoices.filter(inv => {
      const searchMatch = inv.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inv.companyName.toLowerCase().includes(searchQuery.toLowerCase());
      const statusMatch = filterStatus === 'All Status' || inv.status === filterStatus;

      return searchMatch && statusMatch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInvoices = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);

  if (loading) {
      return (
          <div className="flex flex-col justify-center items-center py-20 fade-in">
              <i className="fas fa-circle-notch fa-spin text-4xl text-red-500 mb-4"></i>
              <p className="text-gray-500 font-medium">Loading invoices data...</p>
          </div>
      );
  }

  return (
      <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Invoices */}
              <div className="stat-card glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in bg-white relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl" style={{ animationDelay: '0.2s' }}>
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-600 to-red-400 scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100 z-10"></div>
                  <div className="flex items-start justify-between mb-4">
                      <div className="icon-box w-14 h-14 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center text-red-600 text-2xl shadow-sm">
                          <i className="fas fa-file-invoice"></i>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                          <i className="fas fa-arrow-up text-xs"></i> 8%
                      </span>
                  </div>
                  <h3 className="text-4xl font-bold text-gray-800 mb-1">
                      <AnimatedCounter target={stats.total} />
                  </h3>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Invoices</p>
                  <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full" style={{ width: '75%' }}></div>
                  </div>
              </div>

              {/* Paid Invoices */}
              <div className="stat-card glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in bg-white relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl" style={{ animationDelay: '0.3s' }}>
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-600 to-emerald-400 scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100 z-10"></div>
                  <div className="flex items-start justify-between mb-4">
                      <div className="icon-box w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-emerald-600 text-2xl shadow-sm">
                          <i className="fas fa-check-circle"></i>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                          <i className="fas fa-arrow-up text-xs"></i> 5%
                      </span>
                  </div>
                  <h3 className="text-4xl font-bold text-gray-800 mb-1">
                      <AnimatedCounter target={stats.paid} />
                  </h3>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Paid</p>
                  <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" style={{ width: '67%' }}></div>
                  </div>
              </div>

              {/* Pending Invoices */}
              <div className="stat-card glass-card rounded-2xl p-6 shadow-sm border border-gray-100 fade-in bg-white relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl" style={{ animationDelay: '0.4s' }}>
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-600 to-amber-400 scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100 z-10"></div>
                  <div className="flex items-start justify-between mb-4">
                      <div className="icon-box w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-amber-600 text-2xl shadow-sm">
                          <i className="fas fa-clock"></i>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                          <i className="fas fa-exclamation text-xs"></i> 4
                      </span>
                  </div>
                  <h3 className="text-4xl font-bold text-gray-800 mb-1">
                      <AnimatedCounter target={stats.pending} />
                  </h3>
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Pending</p>
                  <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full" style={{ width: '33%' }}></div>
                  </div>
              </div>
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between fade-in relative z-20" style={{ animationDelay: '0.5s' }}>
              <div className="flex gap-4 w-full lg:w-auto flex-1 flex-col sm:flex-row">
                  <div className="relative flex-1 max-w-md">
                      <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                      <input 
                          type="text" 
                          placeholder="Search by invoice ID, customer..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="search-input w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all shadow-sm"
                      />
                  </div>
                  <div className="relative shrink-0 sm:w-40" style={{ minWidth: '160px' }}>
                      <button 
                          type="button"
                          onClick={() => setIsStatusOpen(!isStatusOpen)}
                          className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 focus:outline-none focus:border-red-500 hover:border-gray-300 transition-colors shadow-sm"
                      >
                          <span>{filterStatus}</span>
                          <i className={`fas fa-chevron-down text-xs transition-transform ${isStatusOpen ? 'rotate-180' : ''}`}></i>
                      </button>
                      
                      {isStatusOpen && (
                          <>
                              <div className="fixed inset-0 z-10" onClick={() => setIsStatusOpen(false)}></div>
                              <div className="absolute z-20 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden py-1">
                                  {['All Status', 'Paid', 'Pending', 'Overdue'].map((status) => (
                                      <button
                                          key={status}
                                          onClick={() => { setFilterStatus(status); setIsStatusOpen(false); }}
                                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${filterStatus === status ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                                      >
                                          {status}
                                      </button>
                                  ))}
                              </div>
                          </>
                      )}
                  </div>
              </div>
              <button className="add-btn flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold shadow-lg shadow-red-500/30 whitespace-nowrap shrink-0 w-full lg:w-auto bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 transition-all">
                  <i className="fas fa-plus"></i> Generate Invoice
              </button>
          </div>

          {/* Invoices Table */}
          <div className="glass-card rounded-2xl shadow-sm border border-gray-100 overflow-hidden fade-in bg-white" style={{ animationDelay: '0.6s' }}>
              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                          <tr className="bg-gray-50/80 border-b border-gray-100">
                              <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Invoice ID</th>
                              <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                              <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Company</th>
                              <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                              <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Due Date</th>
                              <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                          {currentInvoices.length === 0 ? (
                              <tr>
                                  <td colSpan="8" className="py-8 text-center text-gray-500 font-medium">No invoices found matching your filters.</td>
                              </tr>
                          ) : (
                              currentInvoices.map(inv => (
                                  <motion.tr 
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      key={inv.id} 
                                      className="table-row hover:bg-gray-50/50 transition-colors border-l-4 border-transparent hover:border-red-500 cursor-pointer"
                                  >
                                      <td className="py-5 px-6 whitespace-nowrap">
                                          <span className="font-mono text-sm font-bold text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-100">{inv.id}</span>
                                      </td>
                                      <td className="py-5 px-6 whitespace-nowrap">
                                          <div className="flex items-center gap-3">
                                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center font-bold text-sm ${inv.customerColor}`}>
                                                  {inv.customerInitials}
                                              </div>
                                              <div>
                                                  <p className="text-sm font-bold text-gray-800">{inv.customerName}</p>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="py-5 px-6 whitespace-nowrap">
                                          <div className="flex items-center gap-2">
                                              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-xs font-bold ${inv.companyColor}`}>
                                                  {inv.companyInitials}
                                              </div>
                                              <span className="text-sm font-medium text-gray-700">{inv.companyName}</span>
                                          </div>
                                      </td>
                                      <td className="py-5 px-6 whitespace-nowrap">
                                          <span className="text-sm font-bold text-gray-800">₹{inv.amount.toLocaleString()}</span>
                                      </td>
                                      <td className="py-5 px-6 whitespace-nowrap">
                                          <div className="flex items-center gap-2 text-sm text-gray-600">
                                              <i className="far fa-calendar-alt text-gray-400"></i>
                                              <span className="font-medium">{inv.date}</span>
                                          </div>
                                      </td>
                                      <td className="py-5 px-6 whitespace-nowrap">
                                          <div className="flex items-center gap-2 text-sm text-gray-600">
                                              <i className="far fa-clock text-gray-400"></i>
                                              <span className="font-medium">{inv.dueDate}</span>
                                          </div>
                                      </td>
                                      <td className="py-5 px-6 whitespace-nowrap">
                                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border ${inv.statusBadge}`}>
                                              {inv.pulse && <span className={`w-2 h-2 rounded-full animate-pulse ${inv.statusDot}`}></span>}
                                              {!inv.pulse && <span className={`w-2 h-2 rounded-full ${inv.statusDot}`}></span>}
                                              {inv.status}
                                          </span>
                                      </td>
                                      <td className="py-5 px-6">
                                          <div className="flex items-center justify-end gap-2">
                                              <button className="w-9 h-9 rounded-lg bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-100 hover:text-gray-700 transition-colors">
                                                  <i className="fas fa-download text-xs"></i>
                                              </button>
                                              <button className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors">
                                                  <i className="fas fa-pen text-xs"></i>
                                              </button>
                                          </div>
                                      </td>
                                  </motion.tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50">
                  <p className="text-sm text-gray-500">Showing <span className="font-bold text-gray-800">{filteredInvoices.length > 0 ? indexOfFirstItem + 1 : '0'}-{Math.min(indexOfLastItem, filteredInvoices.length)}</span> of <span className="font-bold text-gray-800">{filteredInvoices.length}</span> invoices</p>
                  <div className="flex items-center gap-2">
                      <button 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                          <i className="fas fa-chevron-left text-xs"></i>
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button 
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm transition-colors ${currentPage === page ? 'bg-red-500 text-white font-bold shadow-md shadow-red-500/20' : 'border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600 font-medium'}`}
                          >
                              {page}
                          </button>
                      ))}

                      <button 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                          <i className="fas fa-chevron-right text-xs"></i>
                      </button>
                  </div>
              </div>
          </div>
      </div>
  );
}
