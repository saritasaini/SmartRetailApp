import React from 'react'; 
export class ErrorBoundary extends React.Component { 
    constructor(props) { 
        super(props); 
        this.state = { hasError: false, error: null }; 
    } 
    static getDerivedStateFromError(error) { 
        return { hasError: true, error }; 
    } 
    componentDidCatch(error, errorInfo) { 
        console.error('Error caught by boundary:', error, errorInfo); 
    } 
    render() { 
        if (this.state.hasError) { 
            return (
                <div className="p-8 text-red-500 bg-red-50 rounded-xl m-4 border border-red-200">
                    <h1 className="text-2xl font-bold mb-4">React Render Error</h1>
                    <pre className="whitespace-pre-wrap font-mono text-sm">{this.state.error.toString()}</pre>
                    <pre className="whitespace-pre-wrap font-mono text-xs mt-4 opacity-75">{this.state.error.stack}</pre>
                </div>
            ); 
        } 
        return this.props.children; 
    } 
}
