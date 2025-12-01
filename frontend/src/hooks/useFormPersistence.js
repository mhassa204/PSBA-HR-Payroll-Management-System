import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";

/**
 * Custom hook for persisting form data to localStorage
 * Handles form fields, arrays (experiences, educations), and file uploads
 *
 * @param {string} storageKey - Unique key for localStorage
 * @param {object} formData - React Hook Form form object
 * @param {object} additionalState - Additional state to persist (experiences, educations, uploadedFiles, etc.)
 * @param {boolean} enabled - Whether persistence is enabled (default: true)
 * @param {function} onRestore - Callback when data is restored
 */
export const useFormPersistence = ({
  storageKey,
  formData,
  additionalState = {},
  enabled = true,
  onRestore = null,
}) => {
  const location = useLocation();
  const isRestoringRef = useRef(false);
  const saveTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const isNavigatingRef = useRef(false);
  const saveAbortRef = useRef(false);
  const lastHeavySaveTsRef = useRef(0);
  const lastSavedFilesRef = useRef({});
  const lastSavedProfilePicRef = useRef(null);
  const currentLocationRef = useRef(location.pathname);

  // Quick, synchronous snapshot (no file processing) used during navigation/unmount
  const quickSnapshotSave = useCallback(() => {
    if (!enabled) return;
    try {
      const formValues = formData.getValues();

      // Minimal dropdown labels for better UX on restore
      const dropdownLabels = {};
      if (additionalState.districtMap && formValues.district_id) {
        dropdownLabels.district_label =
          additionalState.districtMap[String(formValues.district_id)] || "";
      }
      if (additionalState.cityMap && formValues.city_id) {
        dropdownLabels.city_label =
          additionalState.cityMap[String(formValues.city_id)] || "";
      }

      const dataToSave = {
        formValues,
        experiences: additionalState.experiences || [],
        educations: additionalState.educations || [],
        // Reuse last processed files and profile picture snapshot (if any)
        uploadedFiles: lastSavedFilesRef.current || {},
        profilePicturePreview: additionalState.profilePicturePreview || null,
        profilePictureData: lastSavedProfilePicRef.current || null,
        dropdownLabels,
        timestamp: Date.now(),
      };

      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    } catch (_) {
      // Intentionally ignore snapshot errors to avoid blocking navigation
    }
  }, [enabled, storageKey, formData, additionalState]);

  // Convert File object to base64 string for storage
  const fileToBase64 = useCallback((file) => {
    return new Promise((resolve, reject) => {
      if (!file || !(file instanceof File)) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result;
        resolve({
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
          data: base64,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  // Convert base64 string back to File object
  const base64ToFile = useCallback((fileData) => {
    if (!fileData || !fileData.data) return null;

    try {
      // Extract base64 data and mime type
      const base64Data = fileData.data;
      const mimeMatch = base64Data.match(/^data:([^;]+);base64,(.+)$/);

      if (!mimeMatch) return null;

      const mimeType = mimeMatch[1];
      const base64Content = mimeMatch[2];

      // Convert base64 to binary
      const byteCharacters = atob(base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      // Create File object
      const blob = new Blob([byteArray], { type: mimeType });
      const file = new File([blob], fileData.name, {
        type: mimeType,
        lastModified: fileData.lastModified || Date.now(),
      });

      return file;
    } catch (error) {
      console.error("Error converting base64 to file:", error);
      return null;
    }
  }, []);

  // Track mount/unmount state
  useEffect(() => {
    isMountedRef.current = true;
    isNavigatingRef.current = false;
    saveAbortRef.current = false;
    currentLocationRef.current = location.pathname;
    return () => {
      // Take a quick snapshot before unmount so we don't lose recent edits
      quickSnapshotSave();
      isMountedRef.current = false;
      isNavigatingRef.current = true; // Mark as navigating on unmount
      saveAbortRef.current = true; // Abort any ongoing save immediately
      // Clear any pending saves on unmount
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [quickSnapshotSave]);

  // Track location changes to detect navigation (only after initial mount)
  useEffect(() => {
    // Only detect navigation if component is mounted and location actually changed
    if (
      isMountedRef.current &&
      currentLocationRef.current !== location.pathname
    ) {
      isNavigatingRef.current = true;
      saveAbortRef.current = true; // signal any in-flight save to stop as soon as possible
      // Persist a minimal snapshot immediately so return navigation can restore
      quickSnapshotSave();
      // Clear any pending saves immediately
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      currentLocationRef.current = location.pathname;
      // Reset navigation flag after a short delay (navigation should complete by then)
      // This allows the new route component to mount and initialize properly
      const resetTimeout = setTimeout(() => {
        isNavigatingRef.current = false;
        saveAbortRef.current = false; // allow saves again after navigation settles
      }, 100);

      return () => {
        clearTimeout(resetTimeout);
      };
    } else {
      // Update current location ref even if we're not navigating (e.g., on initial mount)
      currentLocationRef.current = location.pathname;
    }
  }, [location.pathname, quickSnapshotSave]);

  // Save form data to localStorage (debounced)
  const saveFormData = useCallback(
    async (options = { includeFiles: false }) => {
      if (
        !enabled ||
        isRestoringRef.current ||
        !isMountedRef.current ||
        isNavigatingRef.current
      )
        return;

      try {
        // Use a small delay to ensure all state updates are complete
        // This is especially important for file uploads where state updates might be batched
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (
          saveAbortRef.current ||
          isNavigatingRef.current ||
          !isMountedRef.current
        )
          return;

        const formValues = formData.getValues();

        // Store labels for dropdowns that depend on async data loading
        // This ensures dropdowns can display selected values even if options haven't loaded yet
        const dropdownLabels = {};
        if (additionalState.districtMap && formValues.district_id) {
          dropdownLabels.district_label =
            additionalState.districtMap[String(formValues.district_id)] || "";
        }
        if (additionalState.cityMap && formValues.city_id) {
          dropdownLabels.city_label =
            additionalState.cityMap[String(formValues.city_id)] || "";
        }
        if (additionalState.levelMap) {
          // Store education level labels
          dropdownLabels.education_level_labels = {};
          if (
            additionalState.educations &&
            Array.isArray(additionalState.educations)
          ) {
            additionalState.educations.forEach((edu) => {
              if (edu.education_level_id) {
                dropdownLabels.education_level_labels[edu.id] = {
                  id: edu.education_level_id,
                  label:
                    edu.education_level ||
                    additionalState.levelMap[String(edu.education_level_id)] ||
                    "",
                };
              }
            });
          }
        }

        // Process files in uploadedFiles
        const includeFiles = !!options.includeFiles;
        let processedFiles = lastSavedFilesRef.current;
        if (includeFiles) {
          const now = performance.now();
          const currentFiles = additionalState.uploadedFiles || {};
          const cachedFiles = lastSavedFilesRef.current || {};

          const fileMetaEquals = (fData, fileObj) => {
            if (!fData || !fileObj) return false;
            if (Array.isArray(fData) || Array.isArray(fileObj)) return false;
            const name = fData.name || fData?.file?.name;
            const size = fData.size || fData?.file?.size;
            const lm = fData.lastModified || fData?.file?.lastModified;
            return (
              name === fileObj.name &&
              size === fileObj.size &&
              lm === fileObj.lastModified
            );
          };

          const hasNewOrChanged = (() => {
            for (const [key, value] of Object.entries(currentFiles)) {
              const cached = cachedFiles[key];
              if (value == null && cached == null) continue;
              if (value == null || cached == null) return true;
              if (value instanceof File) {
                if (!fileMetaEquals(cached, value)) return true;
              } else if (Array.isArray(value)) {
                if (!Array.isArray(cached) || cached.length !== value.length)
                  return true;
                for (let i = 0; i < value.length; i++) {
                  const v = value[i];
                  const c = cached[i];
                  if (!c || !fileMetaEquals(c, v)) return true;
                }
              } else if (typeof value === "object") {
                // object map
                const vKeys = Object.keys(value);
                const cKeys = Object.keys(cached || {});
                if (vKeys.length !== cKeys.length) return true;
                for (const id of vKeys) {
                  const v = value[id];
                  const c = cached[id];
                  if (v instanceof File) {
                    if (!fileMetaEquals(c, v)) return true;
                  } else if (v !== c) {
                    return true;
                  }
                }
              }
            }
            return false;
          })();

          const shouldProcessNow =
            hasNewOrChanged || now - lastHeavySaveTsRef.current >= 1500;
          if (shouldProcessNow) {
            processedFiles = {};
            if (additionalState.uploadedFiles) {
              const startTime = performance.now();
              for (const [key, value] of Object.entries(
                additionalState.uploadedFiles
              )) {
                if (saveAbortRef.current || isNavigatingRef.current) break;
                // Avoid long work during navigation; cap processing time per save slice
                if (performance.now() - startTime > 80) break;
                if (value === null || value === undefined) {
                  processedFiles[key] = null;
                } else if (value instanceof File) {
                  const fileData = await fileToBase64(value);
                  if (saveAbortRef.current || isNavigatingRef.current) break;
                  processedFiles[key] = fileData;
                } else if (Array.isArray(value)) {
                  const fileArray = [];
                  for (const file of value) {
                    if (saveAbortRef.current || isNavigatingRef.current) break;
                    const fileData = await fileToBase64(file);
                    if (saveAbortRef.current || isNavigatingRef.current) break;
                    fileArray.push(fileData);
                    if (performance.now() - startTime > 80) break;
                  }
                  processedFiles[key] = fileArray;
                } else if (typeof value === "object") {
                  const processedObject = {};
                  for (const [objKey, objValue] of Object.entries(value)) {
                    if (saveAbortRef.current || isNavigatingRef.current) break;
                    if (objValue instanceof File) {
                      processedObject[objKey] = await fileToBase64(objValue);
                    } else {
                      processedObject[objKey] = objValue;
                    }
                  }
                  processedFiles[key] = processedObject;
                } else {
                  processedFiles[key] = value;
                }
              }
            }
            lastSavedFilesRef.current = processedFiles;
            lastHeavySaveTsRef.current = performance.now();
          } else {
            processedFiles = lastSavedFilesRef.current;
          }
        }

        // Process profile picture if it exists separately
        let profilePictureData = includeFiles
          ? null
          : lastSavedProfilePicRef.current;
        if (includeFiles && additionalState.profilePicturePreview) {
          // Try to get the file from form values
          const profilePictureFile = formValues.profile_picture_file;
          if (profilePictureFile instanceof File) {
            profilePictureData = await fileToBase64(profilePictureFile);
            if (saveAbortRef.current || isNavigatingRef.current) return;
          } else {
            // Store the preview URL as fallback
            profilePictureData = {
              preview: additionalState.profilePicturePreview,
              isUrl: true,
            };
          }
          lastSavedProfilePicRef.current = profilePictureData;
        }

        // Prepare data to save
        const dataToSave = {
          formValues,
          experiences: additionalState.experiences || [],
          educations: additionalState.educations || [],
          uploadedFiles: includeFiles
            ? processedFiles
            : lastSavedFilesRef.current,
          profilePicturePreview: additionalState.profilePicturePreview || null,
          profilePictureData,
          dropdownLabels, // Store labels for dropdowns
          timestamp: Date.now(),
        };

        // Save to localStorage
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      } catch (error) {
        console.error("Error saving form data:", error);
        // If storage quota exceeded, try to save without files
        try {
          if (saveAbortRef.current || isNavigatingRef.current) return;
          const formValues = formData.getValues();
          const dataToSave = {
            formValues,
            experiences: additionalState.experiences || [],
            educations: additionalState.educations || [],
            uploadedFiles: {}, // Skip files if quota exceeded
            timestamp: Date.now(),
            error: "Files could not be saved due to storage limit",
          };
          localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        } catch (e) {
          console.error("Error saving form data without files:", e);
        }
      }
    },
    [enabled, storageKey, formData, additionalState, fileToBase64]
  );

  // Restore form data from localStorage
  const restoreFormData = useCallback(
    async (options = {}) => {
      if (!enabled) return false;

      try {
        const savedData = localStorage.getItem(storageKey);
        if (!savedData) return false;

        const parsed = JSON.parse(savedData);
        if (!parsed || !parsed.formValues) return false;

        // Check if saved data is too old (older than 24 hours) - optional check
        const maxAge = options.maxAge || 24 * 60 * 60 * 1000; // 24 hours default
        if (parsed.timestamp && Date.now() - parsed.timestamp > maxAge) {
          // Data is too old, don't restore
          localStorage.removeItem(storageKey);
          return false;
        }

        // If skipIfFormHasData is true and form already has data, don't restore
        if (options.skipIfFormHasData) {
          const currentValues = formData.getValues();
          const hasData = Object.values(currentValues).some((value) => {
            if (value === null || value === undefined || value === "")
              return false;
            if (Array.isArray(value) && value.length === 0) return false;
            if (typeof value === "object" && Object.keys(value).length === 0)
              return false;
            return true;
          });
          if (hasData) {
            // Form already has data, don't restore
            return false;
          }
        }

        isRestoringRef.current = true;

        // IMPORTANT: Restore dropdown labels BEFORE restoring form values
        // This ensures labels are available when dropdowns render
        if (parsed.dropdownLabels) {
          if (
            parsed.dropdownLabels.district_label &&
            additionalState.setDistrictMap
          ) {
            const districtId = parsed.formValues.district_id;
            if (districtId) {
              additionalState.setDistrictMap((prev) => ({
                ...prev,
                [String(districtId)]: parsed.dropdownLabels.district_label,
              }));
            }
          }
          if (parsed.dropdownLabels.city_label && additionalState.setCityMap) {
            const cityId = parsed.formValues.city_id;
            if (cityId) {
              // Set city label IMMEDIATELY before form values are restored
              // This ensures the label is available when city dropdown renders
              // and prevents the city loading effect from clearing it
              additionalState.setCityMap((prev) => ({
                ...prev,
                [String(cityId)]: parsed.dropdownLabels.city_label,
              }));
            }
          }
          if (
            parsed.dropdownLabels.education_level_labels &&
            additionalState.setLevelMap
          ) {
            const levelLabels = parsed.dropdownLabels.education_level_labels;
            Object.values(levelLabels).forEach(({ id, label }) => {
              if (id && label) {
                additionalState.setLevelMap((prev) => ({
                  ...prev,
                  [String(id)]: label,
                }));
              }
            });
          }
        }

        // Restore form values AFTER labels are set
        formData.reset(parsed.formValues);

        // Restore experiences
        if (
          parsed.experiences &&
          Array.isArray(parsed.experiences) &&
          additionalState.setExperiences
        ) {
          additionalState.setExperiences(parsed.experiences);
        }

        // Restore educations (after levelMap is updated so labels are available)
        if (
          parsed.educations &&
          Array.isArray(parsed.educations) &&
          additionalState.setEducations
        ) {
          // Update education labels from saved dropdown labels if available
          const updatedEducations = parsed.educations.map((edu) => {
            if (parsed.dropdownLabels?.education_level_labels?.[edu.id]) {
              const savedLabel =
                parsed.dropdownLabels.education_level_labels[edu.id];
              if (savedLabel.id === edu.education_level_id) {
                return { ...edu, education_level: savedLabel.label };
              }
            }
            return edu;
          });
          additionalState.setEducations(updatedEducations);
        }

        // Restore uploaded files
        if (parsed.uploadedFiles && additionalState.setUploadedFiles) {
          try {
            // Get current uploadedFiles to merge with restored files
            // This prevents overwriting files that were uploaded after the last save
            const currentFiles = additionalState.uploadedFiles || {};
            const restoredFiles = { ...currentFiles }; // Start with current files

            for (const [key, value] of Object.entries(parsed.uploadedFiles)) {
              try {
                // Only restore if current file is null/undefined or if restoring on mount
                // This prevents overwriting newly uploaded files
                const shouldRestore =
                  !currentFiles[key] || options.forceRestore;

                if (!shouldRestore) {
                  // Keep current file, skip restoration for this key
                  continue;
                }

                if (value === null || value === undefined) {
                  restoredFiles[key] = null;
                } else if (Array.isArray(value)) {
                  // Array of files - merge with existing if any
                  const existingArray = Array.isArray(currentFiles[key])
                    ? currentFiles[key]
                    : [];
                  const fileArray = value
                    .map((fileData) => {
                      try {
                        return base64ToFile(fileData);
                      } catch (e) {
                        console.warn(
                          `Failed to restore file in array ${key}:`,
                          e
                        );
                        return null;
                      }
                    })
                    .filter((f) => f !== null);
                  // Merge arrays, avoiding duplicates
                  const mergedArray = [...existingArray];
                  fileArray.forEach((newFile) => {
                    const exists = mergedArray.some(
                      (existingFile) =>
                        existingFile instanceof File &&
                        newFile instanceof File &&
                        existingFile.name === newFile.name &&
                        existingFile.size === newFile.size &&
                        existingFile.lastModified === newFile.lastModified
                    );
                    if (!exists) {
                      mergedArray.push(newFile);
                    }
                  });
                  restoredFiles[key] = mergedArray;
                } else if (typeof value === "object" && value.data) {
                  // Single file
                  const file = base64ToFile(value);
                  if (file) {
                    restoredFiles[key] = file;
                  }
                } else if (typeof value === "object") {
                  // Object with file values - merge with existing
                  const existingObject =
                    typeof currentFiles[key] === "object" &&
                    currentFiles[key] !== null
                      ? currentFiles[key]
                      : {};
                  const restoredObject = { ...existingObject };
                  for (const [objKey, objValue] of Object.entries(value)) {
                    try {
                      if (
                        objValue &&
                        typeof objValue === "object" &&
                        objValue.data
                      ) {
                        const file = base64ToFile(objValue);
                        if (file) {
                          restoredObject[objKey] = file;
                        }
                      } else {
                        restoredObject[objKey] = objValue;
                      }
                    } catch (e) {
                      console.warn(
                        `Failed to restore file in object ${key}.${objKey}:`,
                        e
                      );
                    }
                  }
                  restoredFiles[key] = restoredObject;
                } else {
                  restoredFiles[key] = value;
                }
              } catch (e) {
                console.warn(`Failed to restore file ${key}:`, e);
                // Continue with other files
              }
            }
            additionalState.setUploadedFiles(restoredFiles);
          } catch (e) {
            console.error("Error restoring uploaded files:", e);
            // Continue with form restoration even if files fail
          }
        }

        // Restore profile picture
        if (
          parsed.profilePictureData &&
          additionalState.setProfilePicturePreview
        ) {
          if (
            parsed.profilePictureData.isUrl &&
            parsed.profilePictureData.preview
          ) {
            // Restore from URL
            additionalState.setProfilePicturePreview(
              parsed.profilePictureData.preview
            );
          } else if (parsed.profilePictureData.data) {
            // Restore from file
            const file = base64ToFile(parsed.profilePictureData);
            if (file) {
              formData.setValue("profile_picture_file", file);
              const reader = new FileReader();
              reader.onload = (e) => {
                additionalState.setProfilePicturePreview(e.target.result);
              };
              reader.readAsDataURL(file);
            }
          }
        } else if (
          parsed.profilePicturePreview &&
          additionalState.setProfilePicturePreview
        ) {
          additionalState.setProfilePicturePreview(
            parsed.profilePicturePreview
          );
        }

        // Call onRestore callback if provided
        if (onRestore) {
          onRestore(parsed);
        }

        // Reset restoring flag after a delay to allow state updates and city loading to complete
        // Increased delay to ensure city loading effect doesn't run during restoration
        setTimeout(() => {
          isRestoringRef.current = false;
          // After restoration, trigger city loading by updating district_id (if it exists)
          // This ensures cities are loaded and the restored city can be displayed
          const districtId = parsed.formValues.district_id;
          if (districtId) {
            // Small delay to ensure state is settled
            setTimeout(() => {
              const currentDistrictId = formData.getValues("district_id");
              if (currentDistrictId === districtId) {
                // District is already set, trigger city loading by setting it again
                // This will cause the city loading effect to run, but now the city label is already in cityMap
                formData.setValue("district_id", districtId, {
                  shouldDirty: false,
                });
              }
            }, 100);
          }
        }, 500);

        return true;
      } catch (error) {
        console.error("Error restoring form data:", error);
        isRestoringRef.current = false;
        return false;
      }
    },
    [enabled, storageKey, formData, additionalState, base64ToFile, onRestore]
  );

  // Clear saved form data
  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error("Error clearing saved form data:", error);
    }
  }, [storageKey]);

  // Watch form values and save on change (debounced)
  useEffect(() => {
    if (!enabled || isRestoringRef.current) return;

    const subscription = formData.watch(() => {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce save operation
      saveTimeoutRef.current = setTimeout(() => {
        // Only save if component is still mounted, not restoring, and not navigating
        if (
          isMountedRef.current &&
          !isRestoringRef.current &&
          !isNavigatingRef.current
        ) {
          // Light save: do not reprocess files on every keystroke
          saveFormData({ includeFiles: false });
        }
      }, 400); // Slightly faster light saves for smoother typing
    });

    return () => {
      subscription.unsubscribe();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [enabled, formData, saveFormData]);

  // Watch additional state and save on change (debounced)
  // Use a ref to track the previous uploadedFiles to detect actual changes
  const prevUploadedFilesRef = useRef(null);

  useEffect(() => {
    if (!enabled || isRestoringRef.current) return;

    // Check if uploadedFiles actually changed (deep comparison for objects)
    const currentFiles = additionalState.uploadedFiles;
    const prevFiles = prevUploadedFilesRef.current;

    // Only save if files actually changed
    const filesChanged =
      prevFiles === null ||
      JSON.stringify(Object.keys(currentFiles || {}).sort()) !==
        JSON.stringify(Object.keys(prevFiles || {}).sort()) ||
      Object.keys(currentFiles || {}).some((key) => {
        const current = currentFiles[key];
        const prev = prevFiles?.[key];

        // Compare file objects by name and size
        if (current instanceof File && prev instanceof File) {
          return (
            current.name !== prev.name ||
            current.size !== prev.size ||
            current.lastModified !== prev.lastModified
          );
        }
        if (Array.isArray(current) && Array.isArray(prev)) {
          return (
            current.length !== prev.length ||
            current.some((file, idx) => {
              const prevFile = prev[idx];
              if (file instanceof File && prevFile instanceof File) {
                return (
                  file.name !== prevFile.name ||
                  file.size !== prevFile.size ||
                  file.lastModified !== prevFile.lastModified
                );
              }
              return file !== prevFile;
            })
          );
        }
        return current !== prev;
      });

    if (filesChanged) {
      prevUploadedFilesRef.current = currentFiles;

      const timeoutId = setTimeout(() => {
        // Only save if component is still mounted, not restoring, and not navigating
        if (
          isMountedRef.current &&
          !isRestoringRef.current &&
          !isNavigatingRef.current
        ) {
          // Heavy save: include files only when uploadedFiles actually changed
          saveFormData({ includeFiles: true });
        }
      }, 250); // Faster debounce so files are processed soon after upload

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [
    enabled,
    additionalState.experiences,
    additionalState.educations,
    additionalState.uploadedFiles,
    additionalState.profilePicturePreview,
    saveFormData,
  ]);

  // Restore on mount
  useEffect(() => {
    if (enabled) {
      // For edit forms, delay restoration slightly to allow initial data to load first
      // If saved data exists, it means user was editing and we should restore their changes
      const isEditForm = storageKey.includes("editEmployeeForm");

      if (isEditForm) {
        // Delay restoration for edit forms to allow initial data to load
        const timeoutId = setTimeout(() => {
          restoreFormData({
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
          });
        }, 100);

        return () => clearTimeout(timeoutId);
      } else {
        // For create forms, restore immediately with forceRestore flag
        restoreFormData({
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          forceRestore: true, // On mount, we want to restore all files
        });
      }
    }
  }, []); // Only run on mount

  // Save before page unload (only for actual page unload, not navigation)
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e) => {
      // Only save if component is still mounted and not navigating
      // This prevents saving during React Router navigation
      if (
        isMountedRef.current &&
        !isRestoringRef.current &&
        !isNavigatingRef.current
      ) {
        // Use synchronous localStorage write for beforeunload
        try {
          const formValues = formData.getValues();
          const dataToSave = {
            formValues,
            experiences: additionalState.experiences || [],
            educations: additionalState.educations || [],
            uploadedFiles: {}, // Skip files on beforeunload (too slow)
            timestamp: Date.now(),
          };
          localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        } catch (error) {
          // Ignore errors during unload
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled, storageKey, formData, additionalState]);

  return {
    restoreFormData,
    clearSavedData,
    saveFormData,
    isRestoring: () => isRestoringRef.current,
  };
};

export default useFormPersistence;
