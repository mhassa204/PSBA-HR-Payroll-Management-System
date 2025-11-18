import { useState, useCallback } from 'react';

/**
 * Custom hook for managing document state in edit forms
 * Handles document addition, removal, and state tracking
 */
export const useDocumentManager = (initialDocuments = []) => {
  const [documents, setDocuments] = useState(initialDocuments);
  const [newFiles, setNewFiles] = useState({}); // Files to be uploaded
  const [removedDocuments, setRemovedDocuments] = useState([]); // Documents to be deleted

  // Add a new file for upload
  const addDocument = useCallback((file, documentType, associatedId = null) => {

    const fileId = `new_${Date.now()}_${Math.random()}`;

    // Create a unique key for associated documents
    const key = associatedId ? `${documentType}_${associatedId}` : documentType;

    // Store file directly
    const fileItem = { id: fileId, file, documentType, associatedId };

    setNewFiles(prev => {
      const updated = {
        ...prev,
        [key]: prev[key] ? [...prev[key], fileItem] : [fileItem]
      };

      return updated;
    });
  }, []);


  const removeDocument = useCallback((documentId, documentType) => {
    // Determine if this is an existing document (numeric id) or a newly added file (string id)
    const parsedId =
      typeof documentId === 'number' && Number.isInteger(documentId) && documentId > 0
        ? documentId
        : (typeof documentId === 'string' && /^\d+$/.test(documentId) ? parseInt(documentId, 10) : null);

    const existingDoc = parsedId ? documents.find(doc => doc.id === parsedId) : null;

    if (existingDoc) {
      // Mark existing document for removal and remove from view
      setRemovedDocuments(prev => (prev.some(doc => doc.id === existingDoc.id) ? prev : [...prev, existingDoc]));
      setDocuments(prev => prev.filter(doc => doc.id !== existingDoc.id));
      return;
    }

    // Otherwise, remove from new files by temporary ID
    setNewFiles(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        if (updated[key]) {
          updated[key] = updated[key].filter(item => item.id !== documentId);
          if (updated[key].length === 0) delete updated[key];
        }
      });
      return updated;
    });
  }, [documents]);
  // Get all documents for display (existing + new files as preview)
  const getAllDocuments = useCallback(() => {
    const displayDocuments = [...documents];

    // Add new files as simple preview documents
    Object.entries(newFiles).forEach(([key, files]) => {
      files.forEach(fileItem => {
        displayDocuments.push({
          id: fileItem.id,
          file_type: fileItem.documentType,
          document_name: fileItem.file.name,
          file_size: fileItem.file.size,
          associated_id: fileItem.associatedId,
          isNewFile: true,
          isPreview: true,
          originalFile: fileItem.file
        });
      });
    });

    // Filter out removed documents
    const filteredDocuments = displayDocuments.filter(
      doc => !removedDocuments.some(removed => removed.id === doc.id)
    );
    console.log('📄 getAllDocuments:', JSON.stringify(filteredDocuments, null, 2));
    return filteredDocuments;
  }, [documents, newFiles, removedDocuments]);

  // Get documents by type
  const getDocumentsByType = useCallback((documentType) => {
    const filtered = getAllDocuments().filter(doc => doc.file_type === documentType);
    console.log(`📄 getDocumentsByType (${documentType}):`, JSON.stringify(filtered, null, 2));
    return filtered;
  }, [getAllDocuments]);

  // Get files to upload
  const getFilesToUpload = useCallback(() => {
    const filesToUpload = {};

    Object.entries(newFiles).forEach(([documentType, files]) => {
      if (files.length > 0) {
        filesToUpload[documentType] = files.map(item => item.file);
      }
    });

    console.log('📁 getFilesToUpload:', JSON.stringify(Object.keys(filesToUpload), null, 2));
    return filesToUpload;
  }, [newFiles]);

  // Get form data for submission
  const getFormData = useCallback(() => {
    const formData = {};

    // Map document types to proper field names for backend
    const documentTypeToFieldName = {
      'profile_picture': 'profile_picture_file',
      'cnic_front': 'cnic_front',
      'cnic_back': 'cnic_back',
      'domicile': 'domicile_certificate',
      'disability': 'disability_document',
      'education': 'education_documents',
      'experience': 'experience_documents',
      'other': 'other_documents'
    };

    Object.entries(newFiles).forEach(([key, files]) => {
      if (files.length > 0) {
        const documentType = files[0].documentType;
        const associatedId = files[0].associatedId;

        let fieldName = documentTypeToFieldName[documentType] || documentType;

        if (associatedId !== null && associatedId !== undefined && (documentType === 'education' || documentType === 'experience')) {
          // Ensure associatedId is converted to string for consistent field naming
          const idString = String(associatedId);
          fieldName = `${fieldName}_${idString}`;
          console.log(`📎 Document field name: ${fieldName} for ${documentType} with associatedId: ${idString}`);
        }

        if (files.length === 1) {
          formData[fieldName] = files[0].file;
        } else {
          formData[fieldName] = files.map(item => item.file);
        }
      }
    });

    console.log('📁 getFormData:', JSON.stringify(Object.keys(formData), null, 2));
    return formData;
  }, [newFiles]);

  // Get document IDs to remove
  const getDocumentsToRemove = useCallback(() => {
    const ids = removedDocuments.map(doc => doc.id);
    console.log('🗑️ getDocumentsToRemove:', JSON.stringify(ids, null, 2));
    return ids;
  }, [removedDocuments]);

  // Reset state
  const reset = useCallback((newInitialDocuments = []) => {
    setDocuments(newInitialDocuments);
    setNewFiles({});
    setRemovedDocuments([]);
    console.log('🗑️ reset called, new initial documents:', JSON.stringify(newInitialDocuments, null, 2));
  }, []);

  // Check if there are any changes
  const hasChanges = useCallback(() => {
    const hasNewFiles = Object.keys(newFiles).length > 0;
    const hasRemovedDocs = removedDocuments.length > 0;
    console.log('📄 hasChanges:', { hasNewFiles, hasRemovedDocs });
    return hasNewFiles || hasRemovedDocs;
  }, [newFiles, removedDocuments]);

  return {
    documents: getAllDocuments(),
    addDocument,
    removeDocument,
    getDocumentsByType,
    getFilesToUpload,
    getFormData,
    getDocumentsToRemove,
    reset,
    hasChanges,
    _rawState: {
      originalDocuments: documents,
      newFiles,
      removedDocuments
    }
  };
};

export default useDocumentManager;