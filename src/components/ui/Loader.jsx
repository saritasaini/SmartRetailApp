import { motion } from 'framer-motion';

export default function Loader({ fullScreen = false }) {
  const containerClass = fullScreen 
    ? "fixed inset-0 bg-[#FFFFFF]/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
    : "flex flex-col items-center justify-center py-12";

  return (
    <div className={containerClass}>
      <motion.div
        animate={{ 
          y: [0, -10, 0],
          rotate: [-5, 5, -5]
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative"
      >
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-caramel relative z-10">
          <path d="M7 17v-2a2 2 0 1 1 4 0v2"></path>
          <path d="M13 17v-2a2 2 0 1 1 4 0v2"></path>
          <path d="m12 17-3 4"></path>
          <path d="m12 17 3 4"></path>
          <path d="M7 11a5 5 0 0 1 10 0"></path>
        </svg>
        
        {/* Drip animations */}
        <motion.div 
          initial={{ height: 0, opacity: 1 }}
          animate={{ height: [0, 15, 0], opacity: [1, 1, 0], y: [0, 5, 20] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          className="absolute top-[60%] left-[30%] w-1.5 bg-brand-caramel rounded-full z-0"
        />
        <motion.div 
          initial={{ height: 0, opacity: 1 }}
          animate={{ height: [0, 20, 0], opacity: [1, 1, 0], y: [0, 10, 25] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: 0.8 }}
          className="absolute top-[60%] left-[60%] w-1.5 bg-brand-berry rounded-full z-0"
        />
      </motion.div>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
        className="mt-4 text-sm font-medium text-brand-caramel tracking-widest"
      >
        CHURNING...
      </motion.p>
    </div>
  );
}
