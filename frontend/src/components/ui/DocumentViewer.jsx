import React, { useState } from 'react';
import { 
  getDocumentUrl, 
  isImageFile, 
  getFileTypeIcon, 
  formatFileSize 
} from '../../utils/imageUtils';

/**
 * DocumentViewer Component
 * 
 * Displays documents with preview for images and download links for other files
 */
const DocumentViewer = ({ 
  document, 
  showPreview = true, 
  showDetails = true,
  className = '' 
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  if (!document || !document.file_path) {
    return (
      <div className={`p-4 border border-gray-200 rounded-lg bg-gray-50 ${className}`}>
        <div className="text-center text-gray-500">
          <i className="fas fa-file-slash text-2xl mb-2"></i>
          <p className="text-sm">No document available</p>
        </div>
      </div>
    );
  }

  const documentUrl = getDocumentUrl(document);
  const isImage = isImageFile(document.file_path);
  const fileIcon = getFileTypeIcon(document.file_path);
  const fileSize = formatFileSize(document.file_size);

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
    console.warn('Failed to load document image:', documentUrl);
  };

  const handleDownload = () => {
    if (documentUrl) {
      window.open(documentUrl, '_blank');
    }
  };

  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden bg-white ${className}`}>
      {/* Document Preview */}
      {showPreview && (
        <div className="relative">
          {isImage && !imageError ? (
            <div className="relative">
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}
              <img
                src={documentUrl}
                alt={document.document_name || 'Document'}
                onLoad={handleImageLoad}
                onError={handleImageError}
                className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={handleDownload}
              />
              <div className="absolute top-2 right-2">
                <button
                  onClick={handleDownload}
                  className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                  title="View full size"
                >
                  <i className="fas fa-expand-alt text-sm"></i>
                </button>
              </div>
            </div>
          ) : (
            <div 
              className="h-48 flex flex-col items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={handleDownload}
            >
              <i className={`${fileIcon} text-4xl text-gray-400 mb-2`}></i>
              <p className="text-sm text-gray-600 text-center px-4">
                {document.document_name || 'Document'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Click to view</p>
            </div>
          )}
        </div>
      )}

      {/* Document Details */}
      {showDetails && (
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {document.document_name || 'Untitled Document'}
              </h4>
              <div className="mt-1 space-y-1">
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Type:</span> {document.file_type || 'Unknown'}
                </p>
                {document.file_size && (
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Size:</span> {fileSize}
                  </p>
                )}
                {document.mime_type && (
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Format:</span> {document.mime_type}
                  </p>
                )}
                {document.createdAt && (
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Uploaded:</span> {new Date(document.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={handleDownload}
                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                title="Download document"
              >
                <i className="fas fa-download mr-1"></i>
                View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * DocumentGrid Component
 * 
 * Displays multiple documents in a grid layout
 */
export const DocumentGrid = ({ 
  documents = [], 
  title = "Documents",
  emptyMessage = "No documents available",
  className = '' 
}) => {
  if (!documents || documents.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <i className="fas fa-folder-open text-4xl text-gray-300 mb-4"></i>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        <i className="fas fa-folder mr-2 text-blue-600"></i>
        {title} ({documents.length})
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((document, index) => (
          <DocumentViewer
            key={document.id || index}
            document={document}
            showPreview={true}
            showDetails={true}
          />
        ))}
      </div>
    </div>
  );
};

export default DocumentViewer;
