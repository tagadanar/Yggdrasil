// packages/frontend/src/components/planning/ConflictWarning.tsx

'use client';

interface ConflictWarning {
  id: string;
  message: string;
  severity: 'warning' | 'error';
  events: string[];
}

interface ConflictWarningProps {
  conflict: ConflictWarning;
  onDismiss: () => void;
}

export function ConflictWarning({ conflict, onDismiss }: ConflictWarningProps) {
  return (
    <div className={`p-4 rounded-md border-l-4 ${
      conflict.severity === 'error' 
        ? 'bg-red-50 border-red-400' 
        : 'bg-yellow-50 border-yellow-400'
    }`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {conflict.severity === 'error' ? (
            <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          )}
        </div>
        <div className="ml-3 flex-1">
          <p className={`text-sm font-medium ${
            conflict.severity === 'error' ? 'text-red-800' : 'text-yellow-800'
          }`}>
            {conflict.severity === 'error' ? 'Scheduling Conflict' : 'Scheduling Warning'}
          </p>
          <p className={`text-sm mt-1 ${
            conflict.severity === 'error' ? 'text-red-700' : 'text-yellow-700'
          }`}>
            {conflict.message}
          </p>
        </div>
        <div className="ml-auto pl-3">
          <button
            onClick={onDismiss}
            className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              conflict.severity === 'error'
                ? 'text-red-500 hover:bg-red-100 focus:ring-red-500'
                : 'text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-500'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}