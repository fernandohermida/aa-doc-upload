import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { DocumentUpload } from './components/DocumentUpload/DocumentUpload';

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-aa-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">AA</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AA Ireland</h1>
                <p className="text-xs text-gray-500">Motor Insurance Portal</p>
              </div>
            </div>
          </div>
        </header>

        <main className="py-12">
          <DocumentUpload />
        </main>

        <footer className="mt-auto py-6 text-center text-sm text-gray-500">
          <p>&copy; 2026 AA Ireland. All rights reserved.</p>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default App;
