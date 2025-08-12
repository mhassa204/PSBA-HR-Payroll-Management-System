// Utility functions for managing scroll behavior

/**
 * Force restore body scroll
 * This is a safety mechanism to ensure scroll is always restored
 */
export const forceRestoreScroll = () => {
  try {
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    
    // Also check for any other elements that might be preventing scroll
    const html = document.documentElement;
    html.style.overflow = "";
    html.style.position = "";
    

  } catch (error) {
    console.error("❌ ScrollUtils: Error restoring scroll:", error);
  }
};

/**
 * Prevent body scroll (for modals)
 * @param {boolean} prevent - Whether to prevent scroll
 */
export const preventBodyScroll = (prevent = true) => {
  try {
    if (prevent) {
      // Store current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    }
  } catch (error) {
    console.error("❌ ScrollUtils: Error managing scroll:", error);
    // Fallback to simple method
    document.body.style.overflow = prevent ? "hidden" : "";
  }
};

/**
 * Check if scroll is currently disabled
 */
export const isScrollDisabled = () => {
  return document.body.style.overflow === "hidden" || 
         document.body.style.position === "fixed";
};

/**
 * Emergency scroll restore - call this if page becomes unscrollable
 */
export const emergencyScrollRestore = () => {
  console.warn("🚨 ScrollUtils: Emergency scroll restore triggered");
  
  // Force restore all possible scroll-blocking styles
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.width = "";
  document.body.style.height = "";
  document.body.style.maxHeight = "";
  
  document.documentElement.style.overflow = "";
  document.documentElement.style.position = "";
  document.documentElement.style.height = "";
  
  // Remove any modal backdrop classes that might be preventing scroll
  document.body.classList.remove("modal-open", "overflow-hidden");
  document.documentElement.classList.remove("modal-open", "overflow-hidden");
  
  
};

// Auto-restore scroll on page visibility change (when user switches tabs)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && isScrollDisabled()) {

    // Small delay to allow any modals to properly close
    setTimeout(() => {
      if (isScrollDisabled()) {
        console.warn("⚠️ ScrollUtils: Scroll still disabled after visibility change, restoring...");
        forceRestoreScroll();
      }
    }, 100);
  }
});

// Auto-restore scroll on page focus (when user clicks back to page)
window.addEventListener("focus", () => {
  if (isScrollDisabled()) {

    setTimeout(() => {
      if (isScrollDisabled()) {
        console.warn("⚠️ ScrollUtils: Scroll still disabled after focus, restoring...");
        forceRestoreScroll();
      }
    }, 100);
  }
});
