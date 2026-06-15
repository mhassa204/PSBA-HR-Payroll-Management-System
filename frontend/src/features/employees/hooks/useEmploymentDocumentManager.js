import { useState, useCallback } from 'react';

/**
 * Hook for managing employment documents
 * Previously handled medical fitness and police character certificate uploads; now deprecated
 */
export const useEmploymentDocumentManager = (initialDocuments = []) => {
  const [documents, setDocuments] = useState(initialDocuments);
  const [newFiles, setNewFiles] = useState({});
  const [removedDocuments, setRemovedDocuments] = useState([]);

  // Add a new document (single selection only - one file per document type)
  const addDocument = useCallback((file, documentType) => {


    const newDoc = {
      id: `new_${Date.now()}_${Math.random()}`,
      originalFile: file,
      file_type: documentType,
      documentType,
      document_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      isNewFile: true
    };



    // Replace any existing document of the same type
    setDocuments(prev => {
      const otherDocs = prev.filter(doc => doc.file_type !== documentType);
      const updated = [...otherDocs, newDoc];

      return updated;
    });

    setNewFiles(prev => {
      const updated = {
        ...prev,
        [documentType]: [newDoc]
      };

      return updated;
    });
  }, [documents]);

  // Remove a document
  const removeDocument = useCallback((documentId, documentType) => {

    
    const docToRemove = documents.find(doc => doc.id === documentId);
    
    if (docToRemove) {
      if (docToRemove.isNewFile) {
        // Remove from new files
        setNewFiles(prev => {
          const updated = { ...prev };
          if (updated[documentType]) {
            updated[documentType] = updated[documentType].filter(doc => doc.id !== documentId);
            if (updated[documentType].length === 0) {
              delete updated[documentType];
            }
          }
          return updated;
        });
      } else {
        // Mark existing document for removal
        setRemovedDocuments(prev => [...prev, docToRemove]);
      }
      
      // Remove from documents list
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    } else {
      // Handle case where documentId might be 'new' for new files
      if (documentId === 'new') {
        // Remove all new files of this type
        setNewFiles(prev => {
          const updated = { ...prev };
          delete updated[documentType];
          return updated;
        });
        
        // Remove from documents list
        setDocuments(prev => prev.filter(doc => 
          !(doc.isNewFile && (doc.file_type === documentType || doc.documentType === documentType))
        ));
      }
    }
  }, [documents]);

  // Get files to upload
  const getFilesToUpload = useCallback(() => {
    const files = {};

    
    Object.entries(newFiles).forEach(([documentType, docs]) => {
      if (docs.length > 0) {
        // Map employment document types to field names
        const fieldNameMap = {
          'medical_fitness': 'medical_fitness_report_pdf',
          'police_character': 'police_character_certificate',
          'renewal_report': 'renewal_report'
        };
        
        const fieldName = fieldNameMap[documentType] || documentType;
        files[fieldName] = docs[0].originalFile;
        

      }
    });
    

    return files;
  }, [newFiles]);

  // Get document IDs to remove
  const getDocumentsToRemove = useCallback(() => {
    const ids = removedDocuments.map(doc => doc.id);

    return ids;
  }, [removedDocuments]);

  // Reset state
  const reset = useCallback((newInitialDocuments = []) => {
    setDocuments(newInitialDocuments);
    setNewFiles({});
    setRemovedDocuments([]);

  }, []);

  // Get form data for submission
  const getFormData = useCallback(() => {
    const formData = {};
    
    Object.entries(newFiles).forEach(([documentType, docs]) => {
      if (docs.length > 0) {
        // Map employment document types to field names
        const fieldNameMap = {
          'medical_fitness': 'medical_fitness_report_pdf',
          'police_character': 'police_character_certificate',
          'renewal_report': 'renewal_report'
        };
        
        const fieldName = fieldNameMap[documentType] || documentType;
        formData[fieldName] = docs[0].originalFile;
      }
    });


    return formData;
  }, [newFiles]);

  // Debug logging - removed to prevent infinite loops

  return {
    documents,
    newFiles,
    removedDocuments,
    addDocument,
    removeDocument,
    getFilesToUpload,
    getDocumentsToRemove,
    getFormData,
    reset
  };
};
