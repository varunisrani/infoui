/**
 * Announces messages to screen readers via ARIA live regions
 */
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcer = document.getElementById(
    priority === 'assertive' ? 'alert-announcements' : 'status-announcements'
  );
  
  if (announcer) {
    announcer.textContent = message;
    
    // Clear the announcement after a short delay to allow for re-announcements
    setTimeout(() => {
      announcer.textContent = '';
    }, 1000);
  }
};

/**
 * Announces status updates (non-urgent)
 */
export const announceStatus = (message: string) => {
  announceToScreenReader(message, 'polite');
};

/**
 * Announces alerts (urgent)
 */
export const announceAlert = (message: string) => {
  announceToScreenReader(message, 'assertive');
};