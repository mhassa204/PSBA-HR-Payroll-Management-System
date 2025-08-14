import React from 'react';
import DocumentViewer from './DocumentViewer';
import { getDocumentUrl } from '../../utils/imageUtils';

/**
 * OrganizedDocumentGrid Component
 * 
 * Displays documents organized into categorized sections
 * Only shows sections when documents are present
 */
const OrganizedDocumentGrid = ({ 
  documents = [], 
  profilePicture = null,
  className = '' 
}) => {
  // Check if there are any documents or profile picture
  const hasDocuments = documents && documents.length > 0;
  const hasProfilePicture = profilePicture;
  
  // Also check if profile picture exists in documents
  const profilePictureDoc = documents?.find(doc => doc.file_type === 'profile_picture' && !doc.is_deleted);
  const hasProfilePictureInDocs = !!profilePictureDoc;
  
  if (!hasDocuments && !hasProfilePicture && !hasProfilePictureInDocs) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <i className="fas fa-folder-open text-4xl text-gray-300 mb-4"></i>
        <p className="text-gray-500">No documents have been uploaded for this employee</p>
        <p className="text-sm text-gray-400 mt-2">
          Documents will appear here once they are uploaded through the employee form
        </p>
      </div>
    );
  }

  // Group documents by type (excluding profile pictures as they have their own section)
  const groupedDocuments = documents.reduce((acc, doc) => {
    if (!doc || !doc.file_type || doc.file_type === 'profile_picture') return acc;
    
    const type = doc.file_type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(doc);
    return acc;
  }, {});

  // Define document categories with their display names and icons
  const documentCategories = {
    cnic_front: {
      label: 'CNIC Front',
      icon: 'fas fa-id-card',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    cnic_back: {
      label: 'CNIC Back',
      icon: 'fas fa-id-card',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    cnic_documents: {
      label: 'CNIC Documents',
      icon: 'fas fa-id-card',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    domicile_certificate: {
      label: 'Domicile Certificate',
      icon: 'fas fa-certificate',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    disability_document: {
      label: 'Disability Document',
      icon: 'fas fa-wheelchair',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    certificates: {
      label: 'Certificates',
      icon: 'fas fa-certificate',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    education_document: {
      label: 'Education Documents',
      icon: 'fas fa-graduation-cap',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    },
    experience_document: {
      label: 'Experience Documents',
      icon: 'fas fa-briefcase',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200'
    },
    other_documents: {
      label: 'Other Documents',
      icon: 'fas fa-file-alt',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    },
    // Employment-related documents
    medical_fitness: {
      label: 'Medical Fitness Report',
      icon: 'fas fa-heartbeat',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    police_character: {
      label: 'Police Character Certificate',
      icon: 'fas fa-shield-alt',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    renewal_report: {
      label: 'Contract Renewal Report',
      icon: 'fas fa-file-contract',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    }
  };

  // Helper function to get category info
  const getCategoryInfo = (type) => {
    return documentCategories[type] || {
      label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      icon: 'fas fa-file',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    };
  };

  // Render a document section
  const renderDocumentSection = (type, docs) => {
    const categoryInfo = getCategoryInfo(type);
    
    return (
      <div key={type} className={`${categoryInfo.bgColor} rounded-lg border ${categoryInfo.borderColor} p-6 mb-6`}>
        <h4 className={`text-lg font-semibold text-gray-900 mb-4`}>
          <i className={`${categoryInfo.icon} mr-2 ${categoryInfo.color}`}></i>
          {categoryInfo.label} ({docs.length})
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((document, index) => (
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

  // Render profile picture section if present
  const renderProfilePictureSection = () => {
    // Check for profile picture in both employee field and documents
    const profilePictureDoc = documents?.find(doc => doc.file_type === 'profile_picture' && !doc.is_deleted);
    const profilePictureUrl = profilePicture || (profilePictureDoc ? getDocumentUrl(profilePictureDoc) : null);
    
    if (!profilePictureUrl) return null;

    return (
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mb-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          <i className="fas fa-user-circle mr-2 text-blue-600"></i>
          Profile Picture
        </h4>
        <div className="flex items-center space-x-4">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-blue-200">
            <img
              src={profilePictureUrl}
              alt="Profile Picture"
              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(profilePictureUrl, '_blank')}
              onError={(e) => {
                console.warn('Failed to load profile picture:', profilePictureUrl);
                e.target.style.display = 'none';
              }}
            />
          </div>
          <div>
            <p className="text-sm text-gray-600">
              Profile picture uploaded successfully
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Click to view full size
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={className}>
      {/* Profile Picture Section */}
      {renderProfilePictureSection()}
      
      {/* Document Sections - Ordered by priority */}
      {(() => {
        // Define the order in which sections should appear
        const sectionOrder = [
          'cnic_front',
          'cnic_back', 
          'cnic_documents',
          'domicile_certificate',
          'disability_document',
          'education_document',
          'experience_document',
          'certificates',
          'medical_fitness',
          'police_character',
          'renewal_report',
          'other_documents'
        ];
        
        // Sort sections according to the defined order
        const sortedSections = Object.entries(groupedDocuments).sort(([a], [b]) => {
          const aIndex = sectionOrder.indexOf(a);
          const bIndex = sectionOrder.indexOf(b);
          
          // If both are in the order list, sort by their position
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
          }
          
          // If only one is in the order list, prioritize it
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          
          // If neither is in the order list, sort alphabetically
          return a.localeCompare(b);
        });
        
        return sortedSections.map(([type, docs]) => 
          renderDocumentSection(type, docs)
        );
      })()}
    </div>
  );
};

export default OrganizedDocumentGrid;
