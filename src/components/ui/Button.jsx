import { Loader2 } from 'lucide-react';

export default function Button({ 
  children, 
  variant = 'primary', 
  loading = false, 
  disabled = false, 
  className = '', 
  ...props 
}) {
  const baseClasses = "flex justify-center items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-gradient-to-br from-brand-caramel to-brand-caramel-light text-white shadow-[0_4px_16px_rgba(220,38,38,0.25)] hover:from-brand-caramel-dark hover:to-brand-caramel hover:shadow-[0_6px_20px_rgba(220,38,38,0.35)] hover:-translate-y-px",
    secondary: "bg-white border border-border-light text-brand-caramel hover:bg-bg-primary",
    danger: "bg-red-50 border border-red-200 text-brand-berry hover:bg-red-100",
    text: "text-brand-caramel hover:text-brand-caramel-dark hover:bg-brand-caramel/10 bg-transparent"
  };

  return (
    <button 
      disabled={loading || disabled}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" size={18} />}
      {children}
    </button>
  );
}
