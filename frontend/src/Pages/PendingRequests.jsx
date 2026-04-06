import React, { useEffect, useState } from "react";
import Header from "../Components/Header";
import Footer from "../Components/Footer";
import Loader from "../Components/loader";
import "../CSS/pendingRequests.css";
import { apiService } from "../utils/apiService";
import { showErrorToast, showSuccessToast } from "../utils/toastUtils";

function PendingRequests() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [actionLoadingKey, setActionLoadingKey] = useState("");

  const loadPendingRequests = async () => {
    try {
      setLoading(true);
      const res = await apiService.getPendingRequests();
      if (res?.data?.success) {
        setRequests(res.data.requests || []);
      } else {
        throw new Error("Failed to load pending requests");
      }
    } catch (error) {
      console.error(error);
      showErrorToast("Failed to load pending requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingRequests();
  }, []);

  const handleApprove = async (requestId) => {
    try {
      setActionLoadingKey(`${requestId}-approve`);
      const res = await apiService.approvePendingRequest(requestId);
      if (res?.data?.success) {
        setRequests((prev) => prev.filter((req) => req._id !== requestId));
        showSuccessToast("Request approved successfully.");
      } else {
        throw new Error("Approve failed");
      }
    } catch (error) {
      console.error(error);
      showErrorToast("Failed to approve request.");
    } finally {
      setActionLoadingKey("");
    }
  };

  const handleApproveEmail = async (requestId) => {
    try {
      setActionLoadingKey(`${requestId}-approve-email`);
      const res = await apiService.approvePendingEmail(requestId);
      if (res?.data?.success) {
        setRequests((prev) =>
          prev.map((req) =>
            req._id === requestId ? { ...req, isVerified: true } : req
          )
        );
        showSuccessToast("Email approved successfully.");
      } else {
        throw new Error("Approve email failed");
      }
    } catch (error) {
      console.error(error);
      showErrorToast("Failed to approve email.");
    } finally {
      setActionLoadingKey("");
    }
  };

  const handleReject = async (requestId) => {
    try {
      setActionLoadingKey(`${requestId}-reject`);
      const res = await apiService.rejectPendingRequest(requestId);
      if (res?.data?.success) {
        setRequests((prev) => prev.filter((req) => req._id !== requestId));
        showSuccessToast("Request rejected.");
      } else {
        throw new Error("Reject failed");
      }
    } catch (error) {
      console.error(error);
      showErrorToast("Failed to reject request.");
    } finally {
      setActionLoadingKey("");
    }
  };

  return (
    <>
      {loading && (
        <Loader
          color={
            document.documentElement.getAttribute("data-theme") === "dark"
              ? "#ffffff"
              : "#000000"
          }
        />
      )}
      <Header />

      <main className="pending-page">
        <section className="pending-header">
          <h1>Pending Signup Requests</h1>
          <p>Approve email, approve account, or reject newly registered users and admins.</p>
        </section>

        {requests.length === 0 && !loading && (
          <div className="pending-empty">No pending requests at the moment.</div>
        )}

        {requests.length > 0 && (
          <div className="pending-grid">
            {requests.map((req) => (
              <article key={req._id} className="pending-card">
                <h2>{req.username}</h2>
                <p>
                  <span>Email:</span> {req.email}
                </p>
                <p>
                  <span>Type:</span> {req.isAdmin ? "Admin" : "User"}
                </p>
                <p>
                  <span>Email Verified:</span> {req.isVerified ? "Yes" : "No"}
                </p>
                <p>
                  <span>Location:</span> {req.location || "N/A"}
                </p>

                <div className="pending-actions">
                  <button
                    type="button"
                    className="approve-email-btn"
                    disabled={actionLoadingKey === `${req._id}-approve-email` || req.isVerified}
                    onClick={() => handleApproveEmail(req._id)}
                  >
                    {req.isVerified
                      ? "Email Approved"
                      : actionLoadingKey === `${req._id}-approve-email`
                      ? "Processing..."
                      : "Approve Email"}
                  </button>
                  <button
                    type="button"
                    className="approve-btn"
                    disabled={
                      actionLoadingKey === `${req._id}-approve` ||
                      actionLoadingKey === `${req._id}-reject` ||
                      actionLoadingKey === `${req._id}-approve-email`
                    }
                    onClick={() => handleApprove(req._id)}
                  >
                    {actionLoadingKey === `${req._id}-approve` ? "Processing..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    className="reject-btn"
                    disabled={
                      actionLoadingKey === `${req._id}-reject` ||
                      actionLoadingKey === `${req._id}-approve` ||
                      actionLoadingKey === `${req._id}-approve-email`
                    }
                    onClick={() => handleReject(req._id)}
                  >
                    {actionLoadingKey === `${req._id}-reject` ? "Processing..." : "Reject"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}

export default PendingRequests;
