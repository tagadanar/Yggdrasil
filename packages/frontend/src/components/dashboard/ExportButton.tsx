// packages/frontend/src/components/dashboard/ExportButton.tsx
// Data export functionality for dashboard analytics

'use client';

import React, { useState } from 'react';
import {
  ArrowDownTrayIcon,
  DocumentIcon,
  ChartBarIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline';

interface ExportData {
  filename: string;
  data: any;
  headers?: string[];
}

interface ExportButtonProps {
  data: ExportData;
  formats?: ('csv' | 'json' | 'pdf')[];
  disabled?: boolean;
  className?: string;
  testId?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  formats = ['csv', 'json'],
  disabled = false,
  className = '',
  testId
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv':
        return <TableCellsIcon className="h-4 w-4" />;
      case 'json':
        return <DocumentIcon className="h-4 w-4" />;
      case 'pdf':
        return <ChartBarIcon className="h-4 w-4" />;
      default:
        return <DocumentIcon className="h-4 w-4" />;
    }
  };

  const exportToCSV = (data: any[], headers?: string[]) => {
    let csvContent = '';
    
    // Add headers if provided
    if (headers && headers.length > 0) {
      csvContent += headers.join(',') + '\n';
    } else if (data.length > 0) {
      // Auto-generate headers from first object
      csvContent += Object.keys(data[0]).join(',') + '\n';
    }
    
    // Add data rows
    data.forEach(row => {
      const values = headers 
        ? headers.map(header => row[header] || '')
        : Object.values(row);
      
      const escapedValues = values.map(value => {
        const stringValue = String(value || '');
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      
      csvContent += escapedValues.join(',') + '\n';
    });
    
    return csvContent;
  };

  const exportToJSON = (data: any) => {
    return JSON.stringify(data, null, 2);
  };

  const exportToPDF = async (data: any) => {
    // This is a basic implementation. In a real app, you'd use a library like jsPDF
    console.warn('PDF export would require a PDF generation library like jsPDF');
    
    // For now, we'll create a simple HTML export that can be printed to PDF
    const htmlContent = `
      <html>
        <head>
          <title>${data.filename}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>${data.filename}</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <pre>${JSON.stringify(data.data, null, 2)}</pre>
        </body>
      </html>
    `;
    
    return htmlContent;
  };

  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async (format: string) => {
    setIsExporting(true);
    setIsMenuOpen(false);

    try {
      let content = '';
      let contentType = '';
      let fileExtension = '';

      switch (format) {
        case 'csv':
          content = exportToCSV(Array.isArray(data.data) ? data.data : [data.data], data.headers);
          contentType = 'text/csv;charset=utf-8;';
          fileExtension = '.csv';
          break;
        
        case 'json':
          content = exportToJSON(data.data);
          contentType = 'application/json;charset=utf-8;';
          fileExtension = '.json';
          break;
        
        case 'pdf':
          content = await exportToPDF(data);
          contentType = 'text/html;charset=utf-8;';
          fileExtension = '.html'; // Would be .pdf with proper PDF library
          break;
        
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      const filename = `${data.filename}_${new Date().toISOString().split('T')[0]}${fileExtension}`;
      downloadFile(content, filename, contentType);

      // Analytics tracking
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('Dashboard Export', {
          format,
          filename: data.filename,
          dataSize: Array.isArray(data.data) ? data.data.length : 1
        });
      }

    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatLabels = {
    csv: 'Export as CSV',
    json: 'Export as JSON',
    pdf: 'Export as PDF'
  };

  return (
    <div className="relative" data-testid={testId}>
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        disabled={disabled || isExporting}
        className={`
          flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg 
          hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed 
          transition-colors ${className}
        `}
        data-testid={testId ? `${testId}-button` : undefined}
      >
        <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
        {isExporting ? 'Exporting...' : 'Export'}
      </button>

      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Menu */}
          <div 
            className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-20 border border-gray-200 dark:border-gray-700"
            data-testid={testId ? `${testId}-menu` : undefined}
          >
            <div className="py-1">
              {formats.map((format) => (
                <button
                  key={format}
                  onClick={() => handleExport(format)}
                  disabled={isExporting}
                  className="
                    w-full text-left flex items-center px-4 py-2 text-sm 
                    text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                    dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed
                  "
                  data-testid={testId ? `${testId}-${format}` : undefined}
                >
                  {getFormatIcon(format)}
                  <span className="ml-2">{formatLabels[format as keyof typeof formatLabels]}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Hook for preparing export data
export const useExportData = () => {
  const prepareTableData = (
    rows: any[],
    columns: { key: string; label: string }[],
    filename: string
  ): ExportData => {
    const headers = columns.map(col => col.label);
    const exportRows = rows.map(row => {
      const exportRow: any = {};
      columns.forEach(col => {
        exportRow[col.label] = row[col.key];
      });
      return exportRow;
    });

    return {
      filename,
      data: exportRows,
      headers
    };
  };

  const prepareChartData = (
    chartData: any,
    filename: string,
    metadata?: any
  ): ExportData => {
    return {
      filename,
      data: {
        chartData,
        metadata: {
          exportedAt: new Date().toISOString(),
          ...metadata
        }
      }
    };
  };

  return {
    prepareTableData,
    prepareChartData
  };
};