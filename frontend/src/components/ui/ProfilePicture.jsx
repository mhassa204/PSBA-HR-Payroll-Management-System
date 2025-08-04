import React, { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { getProfilePictureUrl, getAvatarFallback } from '../../utils/imageUtils';

/**
 * ProfilePicture Component
 * 
 * Displays employee profile picture with fallback to initials
 * Handles image loading errors gracefully
 */
const ProfilePicture = ({ 
  employee, 
  size = 'md', 
  className = '',
  showFallback = true,
  onClick = null 
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Size configurations
  const sizeClasses = {
    xs: 'size-6',
    sm: 'size-8', 
    md: 'size-12',
    lg: 'size-16',
    xl: 'size-24',
    '2xl': 'size-32'
  };

  const profilePictureUrl = getProfilePictureUrl(employee);
  const fallbackInitials = getAvatarFallback(employee?.full_name);
  const shouldShowImage = profilePictureUrl && !imageError;

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
    console.warn('Failed to load profile picture:', profilePictureUrl);
  };

  const avatarClasses = `${sizeClasses[size]} ${className} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`;

  return (
    <Avatar className={avatarClasses} onClick={onClick}>
      {shouldShowImage && (
        <AvatarImage
          src={profilePictureUrl}
          alt={`${employee?.full_name || 'Employee'} profile picture`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className="object-cover"
        />
      )}
      
      {showFallback && (
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
          {imageLoading && shouldShowImage ? (
            <div className="animate-pulse">
              <div className="w-full h-full bg-gray-300 rounded-full"></div>
            </div>
          ) : (
            fallbackInitials
          )}
        </AvatarFallback>
      )}
    </Avatar>
  );
};

export default ProfilePicture;
