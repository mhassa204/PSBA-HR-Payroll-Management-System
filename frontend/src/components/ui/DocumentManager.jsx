import React, { useState, useEffect } from 'react';
import {
  getDocumentUrl,
  isImageFile,
  getFileTypeIcon,
  formatFileSize,
  getServerBaseUrl
} from '../../utils/imageUtils';
import PDFPreview from './PDFPreview';

/**
 * Simple file preview function (copied from working CreateEmployeeForm)
 * Uses a ref to track and cleanup blob URLs
 */
const renderFilePreview = (file, onRemove, documentType, documentId) => {
  if (!file) return null;

  const isImage = file.type && file.type.startsWith('image/');
  const isPDF = file.type === 'application/pdf' || (file.name && /\.pdf$/i.test(file.name));
  
  // Create blob URL for preview
  let previewUrl;
  try {
    previewUrl = URL.createObjectURL(file);
    // Store the URL so it can be cleaned up later (though React will handle cleanup on unmount)
  } catch (error) {
    console.error('Error creating blob URL for file preview:', error);
    return null;
  }
  
  console.log('📄 Rendering file preview:', { 
    fileName: file.name, 
    fileType: file.type, 
    isPDF, 
    isImage,
    previewUrl: previewUrl.substring(0, 50) + '...'
  });

  return (
    <div key={documentId} className="relative group">
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
        {/* Cross button positioned inside the image container */}
        <button
          type="button"
          onClick={() => {
            console.log('🗑️ Remove button clicked:', { documentId, documentType });
            onRemove(documentId, documentType);
          }}
          className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
          title="Remove file"
        >
          ×
        </button>

        {/* Document preview - same size as existing documents */}
        <div className="relative" style={{ height: '128px' }}>
          {isImage ? (
            <img
              src={previewUrl}
              alt={file.name}
              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(previewUrl, '_blank')}
            />
          ) : isPDF ? (
            <PDFPreview
              url={previewUrl}
              fileName={file.name}
              height="128px"
              showControls={false}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
              <i className="fas fa-file-pdf text-3xl text-red-500 mb-2"></i>
              <span className="text-xs text-gray-600 text-center px-2 truncate">{file.name}</span>
            </div>
          )}
        </div>

        {/* Document info */}
        <div className="p-2 bg-gray-50">
          <p className="text-xs text-gray-600 truncate">{file.name}</p>
          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * DocumentManager Component
 * 
 * Manages document display, upload, and removal for edit forms
 * Supports both single and multiple document types
 */
const DocumentManager = ({
  documents = [],
  documentType,
  title,
  accept = "image/jpeg,image/png,application/pdf",
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
  onDocumentAdd,
  onDocumentRemove,
  className = '',
  associatedId = null, // For education/experience specific documents
  associatedLabel = null // For display purposes
}) => {
  const [dragOver, setDragOver] = useState(false);

  // Filter documents by type and associated ID if provided
  const relevantDocuments = documents.filter(doc => {
    if (doc.file_type !== documentType) return false;

    // If associatedId is provided, filter by it
    if (associatedId !== null) {
      return doc.associated_id === associatedId;
    }

    return true;
  });

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);

    // For single document types, remove existing documents first
    const singleDocumentTypes = ['cnic_front', 'cnic_back', 'domicile', 'disability', 'education', 'experience', 'medical_fitness', 'police_character'];
    if (singleDocumentTypes.includes(documentType)) {
      // Remove existing documents of this type (for education/experience, only those with same associatedId)
      relevantDocuments.forEach(doc => {
        onDocumentRemove(doc.id, documentType);
      });
    }

    const filesToProcess = singleDocumentTypes.includes(documentType) ? files.slice(0, 1) : files;
    filesToProcess.forEach(file => {
      if (validateFile(file)) {
        onDocumentAdd(file, documentType, associatedId);
      }
    });
    e.target.value = ''; // Reset input
  };

  const validateFile = (file) => {
    // Check file size
    if (file.size > maxSize) {
      alert(`File size must be less than ${formatFileSize(maxSize)}`);
      return false;
    }

    // Check file type
    const allowedTypes = accept.split(',').map(type => type.trim());
    const isValidType = allowedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      } else {
        return file.type === type;
      }
    });

    if (!isValidType) {
              const allowedTypes = accept.includes('image/') && accept.includes('application/pdf') 
          ? 'JPG, PNG, and PDF'
          : accept.includes('image/') 
            ? 'JPG and PNG'
            : 'PDF';
        alert(`Only ${allowedTypes} files are allowed`);
      return false;
    }

    return true;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);

    // For single document types, remove existing documents first
    const singleDocumentTypes = ['cnic_front', 'cnic_back', 'domicile', 'disability', 'education', 'experience', 'medical_fitness', 'police_character'];
    if (singleDocumentTypes.includes(documentType)) {
      // Remove existing documents of this type (for education/experience, only those with same associatedId)
      relevantDocuments.forEach(doc => {
        onDocumentRemove(doc.id, documentType);
      });
    }

    const filesToProcess = singleDocumentTypes.includes(documentType) ? files.slice(0, 1) : files;
    filesToProcess.forEach(file => {
      if (validateFile(file)) {
        onDocumentAdd(file, documentType, associatedId);
      }
    });
  };

  const renderDocument = (document, index) => {
    // For new files, use simple preview like create form
    if (document.isNewFile && document.originalFile) {
      return renderFilePreview(document.originalFile, onDocumentRemove, documentType, document.id);
    }

    // For existing documents, use server URL
    let documentUrl;
    if (document.url) {
      const serverBaseUrl = getServerBaseUrl();
      documentUrl = document.url.startsWith('http')
        ? document.url
        : document.url.startsWith('/')
          ? `${serverBaseUrl}${document.url}`
          : `${serverBaseUrl}/${document.url}`;
    } else if (document.file_path) {
      documentUrl = getDocumentUrl(document);
    } else {
      documentUrl = null;
    }
    
    // Debug logging for PDF documents
    if (documentUrl && (document.file_path && /\.pdf$/i.test(document.file_path)) || 
        document.mime_type === 'application/pdf' ||
        (document.document_name && /\.pdf$/i.test(document.document_name))) {
      console.log('📄 PDF Document URL:', { 
        documentUrl, 
        file_path: document.file_path, 
        url: document.url,
        document_name: document.document_name 
      });
    }

    // Use enhanced metadata from backend if available
    const isImage = document.isImage !== undefined ? document.isImage : isImageFile(document.file_path || document.document_name);
    const isPDF = (document.file_path && /\.pdf$/i.test(document.file_path)) ||
                  document.mime_type === 'application/pdf' ||
                  (document.document_name && /\.pdf$/i.test(document.document_name));
    const fileIcon = getFileTypeIcon(document.file_path || document.document_name);

    // Don't render if no valid URL
    if (!documentUrl) {
      return (
        <div key={document.id || index} className="relative group">
          <div className="border border-red-200 rounded-lg overflow-hidden bg-red-50 shadow-sm">
            <div className="h-32 flex flex-col items-center justify-center">
              <i className="fas fa-exclamation-triangle text-2xl text-red-400 mb-2"></i>
              <span className="text-xs text-red-600 text-center px-2">
                Unable to load: {document.document_name || 'Document'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    // Render existing document
    return (
      <div key={document.id || index} className="relative group">
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
          {/* Remove button */}
          <button
            type="button"
            onClick={() => onDocumentRemove(document.id, documentType)}
            className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
            title="Remove document"
          >
            ×
          </button>

          {/* Document preview */}
          <div className="relative" style={{ height: '128px' }}>
            {isImage ? (
              <img
                src={documentUrl}
                alt={document.document_name || 'Document'}
                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => documentUrl && window.open(documentUrl, '_blank')}
              />
            ) : isPDF ? (
              <PDFPreview
                url={documentUrl}
                fileName={document.document_name || 'Document'}
                height="128px"
                showControls={false}
              />
            ) : (
              <div
                className="h-full flex flex-col items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => documentUrl && window.open(documentUrl, '_blank')}
              >
                <i className={`${fileIcon} text-3xl text-gray-400 mb-2`}></i>
                <span className="text-xs text-gray-600 text-center px-2">
                  {document.document_name || 'Document'}
                </span>
              </div>
            )}
          </div>

          {/* Document info */}
          <div className="p-2 bg-gray-50">
            <p className="text-xs font-medium text-gray-900 truncate" title={document.document_name}>
              {document.document_name}
            </p>
            {document.file_size && (
              <p className="text-xs text-gray-500">
                {formatFileSize(document.file_size)}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Title */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-900">
          {title}
          {associatedLabel && (
            <span className="ml-2 text-sm text-blue-600">
              - {associatedLabel}
            </span>
          )}
          {relevantDocuments.length > 0 && (
            <span className="ml-2 text-sm text-gray-500">
              ({relevantDocuments.length})
            </span>
          )}
        </h4>
      </div>

      {/* Existing documents */}
      {relevantDocuments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {relevantDocuments.map((document, index) => renderDocument(document, index))}
        </div>
      )}

      {/* Upload area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-2">
          <i className="fas fa-cloud-upload-alt text-3xl text-gray-400"></i>
          <div>
            <label className="cursor-pointer">
              <span className="text-blue-600 hover:text-blue-800 font-medium">
                Click to upload
              </span>
              <span className="text-gray-600"> or drag and drop</span>
              <input
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-xs text-gray-500">
            {accept.includes('image/') && accept.includes('application/pdf') 
              ? 'Only JPG, PNG, and PDF files are allowed'
              : accept.includes('image/') 
                ? 'Only JPG and PNG files are allowed'
                : 'Only PDF files are allowed'
            } (Max: {formatFileSize(maxSize)})
          </p>
        </div>
      </div>
    </div>
  );
};

export default DocumentManager;
