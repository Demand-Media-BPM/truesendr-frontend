// src/utils/showAppToast.js
import React from "react";
import { toast } from "react-toastify";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import InfoIcon from "@mui/icons-material/Info";

import "./showAppToast.css";

function ToastMessage({
  type = "success",
  title = "",
  message = "",
  onClose,
  detailed = false,
}) {
  const iconMap = {
    success: <CheckCircleIcon className="app-toast__icon-svg" />,
    error: <ErrorIcon className="app-toast__icon-svg" />,
    warning: <WarningAmberIcon className="app-toast__icon-svg" />,
    info: <InfoIcon className="app-toast__icon-svg" />,
  };

  return (
    <div
      className={`app-toast app-toast--${type} ${
        detailed ? "is-detailed" : "is-short"
      }`}
    >
      <div className="app-toast__icon">{iconMap[type]}</div>

      <div className="app-toast__content">
        {!!title && <div className="app-toast__title">{title}</div>}
        {!!message && <div className="app-toast__message">{message}</div>}
      </div>

      <button
        type="button"
        className="app-toast__close"
        onClick={onClose}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}

export function showAppToast({
  type = "success",
  title = "",
  message = "",
  detailed = false,
  autoClose = 2500,
  position,
}) {
  return toast(
    ({ closeToast }) => (
      <ToastMessage
        type={type}
        title={title}
        message={message}
        detailed={detailed}
        onClose={closeToast}
      />
    ),
    {
      icon: false,
      closeButton: false,
      hideProgressBar: true,
      autoClose,
      pauseOnHover: true,
      closeOnClick: false,
      draggable: false,
      position,
    }
  );
}

export const toastSuccess = (title, options = {}) =>
  showAppToast({
    type: "success",
    title,
    ...options,
  });

export const toastError = (title, options = {}) =>
  showAppToast({
    type: "error",
    title,
    ...options,
  });

export const toastWarning = (title, options = {}) =>
  showAppToast({
    type: "warning",
    title,
    ...options,
  });

export const toastInfo = (title, options = {}) =>
  showAppToast({
    type: "info",
    title,
    ...options,
  });