import React, { useState, useEffect, useRef } from 'react';

/**
 * PDFPreview Component
 * 
 * Displays a PDF preview in an iframe with loading state and error handling
 */
const PDFPreview = ({ 
  url, 
  fileName = 'Document',
  className = '',
  height = '200px',
  showControls = true
}) => {
  // For blob URLs, don't show loader initially since they load instantly
  const isBlobUrlInitial = url && url.startsWith('blob:');
  const [loading, setLoading] = useState(!isBlobUrlInitial);
  const [error, setError] = useState(false);
  const iframeRef = useRef(null);
  const objectRef = useRef(null);
  const loadTimeoutRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!url) {
      setError(true);
      setLoading(false);
      return;
    }

    // Reset states when URL changes
    setError(false);
    setLoading(true); // Start with loading state

    // Clear any existing timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    const isBlobUrl = url && url.startsWith('blob:');
    
    // For blob URLs, set a very short delay to prevent blinking
    // For regular URLs, show loader for longer
    const delay = isBlobUrl ? 100 : 1000;
    
    loadTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setLoading(false);
      }
    }, delay);

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [url]);

  const handleLoad = () => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    if (mountedRef.current) {
      setLoading(false);
    }
  };

  const handleError = () => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    if (mountedRef.current) {
      setError(true);
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-50 border border-gray-200 rounded ${className}`} style={{ height }}>
        <i className="fas fa-exclamation-triangle text-2xl text-yellow-500 mb-2"></i>
        <p className="text-xs text-gray-600 text-center px-2">Unable to preview PDF</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
          onClick={(e) => e.stopPropagation()}
        >
          Open in new tab
        </a>
      </div>
    );
  }

  const isBlobUrl = url && url.startsWith('blob:');
  const pdfUrl = `${url}#toolbar=${showControls ? 1 : 0}&navpanes=0&scrollbar=1`;

  return (
    <div className={`relative border border-gray-200 rounded overflow-hidden bg-gray-50 ${className}`} style={{ height }}>
      {/* For blob URLs, use object tag which is more reliable for local files */}
      {isBlobUrl ? (
        <object
          ref={objectRef}
          data={url}
          type="application/pdf"
          className="w-full h-full"
          onLoad={handleLoad}
          onError={handleError}
        >
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
            <i className="fas fa-file-pdf text-2xl text-red-500 mb-2"></i>
            <p className="text-xs text-gray-600">PDF Preview</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
              onClick={(e) => e.stopPropagation()}
            >
              Open PDF
            </a>
          </div>
        </object>
      ) : (
        <iframe
          ref={iframeRef}
          src={pdfUrl}
          title={fileName}
          className="w-full h-full border-0"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
      
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10 pointer-events-none">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-xs text-gray-500">Loading PDF...</p>
        </div>
      )}
      
      {!loading && (
        <div className="absolute top-2 right-2 z-20">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
            title="Open in new tab"
            onClick={(e) => e.stopPropagation()}
          >
            <i className="fas fa-external-link-alt text-sm"></i>
          </a>
        </div>
      )}
    </div>
  );
};

export default PDFPreview;

