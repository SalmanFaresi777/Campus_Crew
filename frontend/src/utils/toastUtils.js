// Notification utility wrapper for react-toastify
import { toast } from 'react-toastify';

// Default toast settings for all notifications
const toastConfiguration = {
  position: "top-right",
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

// Success notification
export const showSuccessToast = (message) => {
  toast.success(message, { ...toastConfiguration, className: 'success-toast' });
};

// Error notification
export const showErrorToast = (message) => {
  toast.error(message, { ...toastConfiguration, className: 'error-toast' });
};

// Warning notification
export const showWarningToast = (message) => {
  toast.warning(message, { ...toastConfiguration, className: 'warning-toast' });
};

// Info notification
export const showInfoToast = (message) => {
  toast.info(message, { ...toastConfiguration, className: 'info-toast' });
};

// Custom notification with user-defined options
export const showCustomToast = (message, options = {}) => {
  toast(message, { ...toastConfiguration, ...options });
};

// Promise-based notification for async operations
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
