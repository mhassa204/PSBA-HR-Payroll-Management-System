import React, { useState, useEffect } from 'react';
import {
  getDocumentUrl,
  isImageFile,
  getFileTypeIcon,
  formatFileSize,
  getServerBaseUrl
} from '../../utils/imageUtils';
import ZoomablePreview from './ZoomablePreview';

/**
 * Employment Document Manager Component
 * Handles medical fitness and police character certificate uploads and previews
 * Based on the working DocumentManager component from employee module
 * 
 * SINGLE SELECTION ONLY: Only one document per type is allowed.
 * New files automatically replace existing ones.
 */
const EmploymentDocumentManager = ({
  documents = [],
  documentType,
  title,
  accept = "application/pdf",
  maxSize = 50 * 1024 * 1024, // 50MB
  onDocumentAdd,
  onDocumentRemove,
  isEditMode = false,
  existingDocuments = []
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  // Filter documents by type - handle both file_type and documentType
  const relevantDocuments = documents.filter(doc => 
    doc.file_type === documentType || doc.documentType === documentType
  );

  // Debug logging - removed to prevent infinite loops

  // Validate file
  const validateFile = (file) => {
    setError('');

    // Check file size
    if (file.size > maxSize) {
      const errorMsg = `File size must be less than ${formatFileSize(maxSize)}`;
      setError(errorMsg);
      return false;
    }

    // Check file type
    const allowedTypes = accept.split(',');
    const isValidType = allowedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type);
      }
      return file.type === type;
    });

    if (!isValidType) {
      const errorMsg = `File type not allowed. Allowed types: ${accept}`;
      setError(errorMsg);
      return false;
    }

    return true;
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // For employment documents, only allow one file per type
    if (files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        // Remove existing documents of this type first (like employee module)
        relevantDocuments.forEach(doc => {
          onDocumentRemove(doc.id, documentType);
        });
        
        // Add the new file
        onDocumentAdd(file, documentType);
      }
    }
    
    // Clear the input
    e.target.value = '';
  };

  // Handle drag and drop
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
    
    if (files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        // Remove existing documents of this type first (consistent with file selection)
        relevantDocuments.forEach(doc => {
          onDocumentRemove(doc.id, documentType);
        });
        
        // Add the new file
        onDocumentAdd(file, documentType);
      }
    }
  };

  // Render existing document
  const renderExistingDocument = (document) => {
    let documentUrl;
    if (document.url) {
      const serverBaseUrl = getServerBaseUrl();
      documentUrl = document.url.startsWith('http')
        ? document.url
        : `${serverBaseUrl}${document.url}`;
    } else if (document.file_path) {
      documentUrl = getDocumentUrl(document);
    } else {
      documentUrl = null;
    }

    if (!documentUrl) {
      return (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <p className="text-sm text-gray-500">Document not available</p>
        </div>
      );
    }

    const isImage = document.isImage !== undefined ? document.isImage : isImageFile(document.file_path || document.document_name);
    const fileIcon = getFileTypeIcon(document.file_path || document.document_name);

    return (
      <div className="relative group">
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

          {/* Document preview (small thumbnail + click-to-enlarge) */}
          <ZoomablePreview
            src={documentUrl}
            fileName={document.document_name || 'Document'}
            className="w-full h-32"
          />

          {/* Document info */}
          <div className="p-2 bg-gray-50">
            <p className="text-xs text-gray-600 truncate">
              {document.document_name || 'Document'}
            </p>
            <p className="text-xs text-gray-500">
              {document.file_size ? formatFileSize(document.file_size) : 'Unknown size'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Render new file preview
  const renderNewFilePreview = (file) => {
    if (!file) {
      console.log('❌ renderNewFilePreview: No file provided');
      return null;
    }

    console.log('📄 renderNewFilePreview:', { fileName: file.name, fileType: file.type, fileSize: file.size });
    const isImage = file.type.startsWith('image/');
    const previewUrl = URL.createObjectURL(file);

    return (
      <div className="relative group">
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
          {/* Remove button */}
          <button
            type="button"
            onClick={() => onDocumentRemove('new', documentType)}
            className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
            title="Remove file"
          >
            ×
          </button>

          {/* Document preview (small thumbnail + click-to-enlarge) */}
          <ZoomablePreview
            src={previewUrl}
            fileName={file.name}
            mimeType={file.type}
            className="w-full h-32"
          />

          {/* Document info */}
          <div className="p-2 bg-gray-50">
            <p className="text-xs text-gray-600 truncate">{file.name}</p>
            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {title}
        </label>
        
        {/* File input */}
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
          <input
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
            id={`employment-${documentType}-input`}
          />
          
                     <div className="space-y-2">
             <i className="fas fa-cloud-upload-alt text-3xl text-gray-400"></i>
             <p className="text-sm text-gray-600">
               Drag and drop a file here, or{' '}
               <button
                 type="button"
                 onClick={() => document.getElementById(`employment-${documentType}-input`).click()}
                 className="text-blue-600 hover:text-blue-500 font-medium"
               >
                 browse
               </button>
             </p>
             <p className="text-xs text-gray-500">
               Accepted formats: {accept.replace(/image\//g, '').replace(/application\//g, '').toUpperCase()}
             </p>
             <p className="text-xs text-gray-500">
               Max size: {formatFileSize(maxSize)}
             </p>
             <p className="text-xs text-blue-600 font-medium">
               <i className="fas fa-info-circle mr-1"></i>
               Single document only - new file will replace existing one
             </p>
           </div>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}
      </div>

      {/* Document previews */}
      <div className="space-y-3">
        {/* All relevant documents (existing + new) */}
        {relevantDocuments.map((doc, index) => {
          console.log(`📄 Rendering document ${index}:`, { 
            id: doc.id, 
            isNewFile: doc.isNewFile, 
            hasUrl: !!doc.url,
            hasFilePath: !!doc.file_path,
            hasDocumentName: !!doc.document_name,
            file_type: doc.file_type,
            documentType: doc.documentType
          });
          
          // For new files, show preview
          if (doc.isNewFile && doc.originalFile) {
            return (
              <div key={doc.id || index}>
                <p className="text-xs text-gray-500 mb-1">New document:</p>
                {renderNewFilePreview(doc.originalFile)}
              </div>
            );
          }
          
          // For existing documents, show with server URL
          return (
            <div key={doc.id || index}>
              <p className="text-xs text-gray-500 mb-1">Current document:</p>
              {renderExistingDocument(doc)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EmploymentDocumentManager;
