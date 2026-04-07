import { toast } from 'react-toastify';

// Custom toast configurations
const toastConfig = {
  position: "top-right",
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

// Success toast
export const showSuccessToast = (message) => {
  toast.success(message, {
    ...toastConfig,
    className: 'success-toast',
  });
};

// Error toast
export const showErrorToast = (message) => {
  toast.error(message, {
    ...toastConfig,
    className: 'error-toast',
  });
};

// Warning toast
export const showWarningToast = (message) => {
  toast.warning(message, {
    ...toastConfig,
    className: 'warning-toast',
  });
};

// Info toast
export const showInfoToast = (message) => {
  toast.info(message, {
    ...toastConfig,
    className: 'info-toast',
  });
};

// Custom toast with custom styling
export const showCustomToast = (message, options = {}) => {
  toast(message, {
    ...toastConfig,
    ...options,
  });
};

// Promise toast for async operations
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

// Dismiss all toasts
export const dismissAllToasts = () => {
  toast.dismiss();
};

// Dismiss specific toast
export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};
