/**
 * Toast Notification Utilities
 * 
 * Centralized toast notification management using react-toastify
 * Provides functions for different notification types:
 * - Success, Error, Warning, Info, and Custom toasts
 * - Promise-based toasts for async operations
 * - Toast dismissal and management
 */

import { toast } from 'react-toastify';

// Default toast configuration applied to all notifications
const toastConfiguration = {
  position: "top-right",      // Position on screen
  autoClose: 5000,             // Auto-close after 5 seconds
  hideProgressBar: false,      // Show progress bar
  closeOnClick: true,          // Allow closing on click
  pauseOnHover: true,          // Pause timer on hover
  draggable: true,             // Allow dragging
};

/**
 * Display success notification toast
 * @param {string} message - Success message to display
 */
export const showSuccessToast = (message) => {
  toast.success(message, {
    ...toastConfiguration,
    className: 'success-toast',
  });
};

/**
 * Display error notification toast
 * @param {string} message - Error message to display
 */
export const showErrorToast = (message) => {
  toast.error(message, {
    ...toastConfiguration,
    className: 'error-toast',
  });
};

/**
 * Display warning notification toast
 * @param {string} message - Warning message to display
 */
export const showWarningToast = (message) => {
  toast.warning(message, {
    ...toastConfiguration,
    className: 'warning-toast',
  });
};

/**
 * Display info notification toast
 * @param {string} message - Info message to display
 */
export const showInfoToast = (message) => {
  toast.info(message, {
    ...toastConfiguration,
    className: 'info-toast',
  });
};

/**
 * Display custom styled notification toast
 * @param {string} message - Message to display
 * @param {Object} options - Custom toast options
 */
export const showCustomToast = (message, options = {}) => {
  toast(message, {
    ...toastConfiguration,
    ...options,
  });
};

/**
 * Display promise-based toast for async operations
 * Shows different messages for pending, success, and error states
 * @param {Promise} promise - Promise to track
 * @param {Object} messages - Messages object with pending, success, error
 * @returns {Promise} The original promise
 */
export const showPromiseToast = (promise, messages) => {
  return toast.promise(
    promise,
    {
      pending: messages.pending || 'Loading...',
      success: messages.success || 'Success!',
      error: messages.error || 'Something went wrong!',
    },
    toastConfiguration
  );
};

/**
 * Dismiss all active toast notifications
 */
export const dismissAllToasts = () => {
  toast.dismiss();
};

/**
 * Dismiss a specific toast notification
 * @param {string|number} toastId - ID of the toast to dismiss
 */
export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};
