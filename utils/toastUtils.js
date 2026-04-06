import { toast } from 'react-toastify';

// Global toast notification settings
const toastConfig = {
  position: "top-right",
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

// Displays success notification message
export const showSuccessToast = (message) => {
  toast.success(message, {
    ...toastConfig,
    className: 'success-toast',
  });
};

// Displays error notification message
export const showErrorToast = (message) => {
  toast.error(message, {
    ...toastConfig,
    className: 'error-toast',
  });
};

// Displays warning notification message
export const showWarningToast = (message) => {
  toast.warning(message, {
    ...toastConfig,
    className: 'warning-toast',
  });
};

// Displays informational notification message
export const showInfoToast = (message) => {
  toast.info(message, {
    ...toastConfig,
    className: 'info-toast',
  });
};

// Creates toast with custom options and styling
export const showCustomToast = (message, options = {}) => {
  toast(message, {
    ...toastConfig,
    ...options,
  });
};

// Shows toast states for asynchronous operations
export const showPromiseToast = (promise, messages) => {
  return toast.promise(
    promise,
    {
      pending: messages.pending || 'Loading...',
      success: messages.success || 'Success!',
      error: messages.error || 'Something went wrong!',
    },
    toastConfig
  );
};

// Removes all active notifications
export const dismissAllToasts = () => {
  toast.dismiss();
};

// Removes a specific notification by ID
export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};
