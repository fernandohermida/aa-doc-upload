import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { DocumentUpload } from './components/DocumentUpload/DocumentUpload';

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* AA Ireland Header */}
        <header className="bg-aa-black shadow-lg sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-aa-yellow rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-black font-black text-2xl tracking-tighter">AA</span>
                </div>
                <div>
                  <h1 className="text-xl font-black text-white tracking-tight">
                    AA Ireland
                  </h1>
                  <p className="text-xs text-aa-yellow font-semibold tracking-wide">
                    Motor Insurance Portal
                  </p>
                </div>
              </div>

              {/* Help Badge */}
              <div className="hidden sm:flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg">
                <svg className="w-5 h-5 text-aa-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-white">Need Help?</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          <DocumentUpload />
        </main>

        {/* Footer */}
        <footer className="bg-aa-black border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm">
    
              <p className="text-gray-400">
                Developed by{' '}
                <a
                  href="https://www.fernandohermida.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-aa-yellow hover:text-yellow-400 font-medium transition-colors underline decoration-dotted underline-offset-4"
                >
                  Fernando Hermida
                </a>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default App;
