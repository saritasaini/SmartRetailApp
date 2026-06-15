export default function GlassCard({ children, className = '', hover = false, ...props }) {
  return (
    <div 
      className={`glass-card ${hover ? 'glass-card-hover' : ''} p-4 sm:p-5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
