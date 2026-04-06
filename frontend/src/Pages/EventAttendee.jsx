import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "../CSS/EventAttendee.css";
import Header from "../Components/Header";
import Footer from "../Components/Footer";
import Loader from "../Components/loader";
import defaultavator from "../assets/img/defaultavator.png";
import { showErrorToast, showSuccessToast } from "../utils/toastUtils";

function EventAttendee() {
  const { id } = useParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [userToBan, setUserToBan] = useState(null);
  const backend = import.meta.env.VITE_BACKEND_LINK;
  const fetchData = async () => {
    try {
      const { data } = await axios.get(
        `${backend}/api/registrations/event/${id}`
      );
      if (data.success) {
        setUsers(data.registration);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, [id]);

  const handleBanClick = (user) => {
    setUserToBan(user);
    setShowConfirmModal(true);
  };

  const confirmBan = async () => {
    if (!userToBan) return;
    
    try {
      const { data } = await axios.put(`${backend}/api/unregister`, {
        userId: userToBan.userId._id,
        eventId: id,
      });
      if (data.success) {
        console.log(data);
        showSuccessToast(`${userToBan.userId.username} has been banned successfully.`);
        fetchData();
      }
    } catch (error) {
      showErrorToast("Failed to ban user.");
    } finally {
      setShowConfirmModal(false);
      setUserToBan(null);
    }
  };

  const cancelBan = () => {
    setShowConfirmModal(false);
    setUserToBan(null);
  };

  const BanUser = async (userid) => {
    try {
      const { data } = await axios.put(`${backend}/api/unregister`, {
        userId: userid,
        eventId: id,
      });
      if (data.success) {
        console.log(data);
        showSuccessToast("Unregistered successfully. ");
        fetchData();
      }
    } catch (error) {
      showErrorToast("Unregistration failed.");
    }
  };
  return (
    <div className="page-wrapper">
      {loading && <Loader color={document.documentElement.getAttribute("data-theme") === "dark" ? "#ffffff" : "#000000"} />}
      <Header />
      <div className="content-wrapper">
        <div className="attendees-container">
          <h2>Event Attendees</h2>
          {users.length === 0 ? (
            <p>No attendees found.</p>
          ) : (
            <div className="attendees-grid">
              {users.map((user) => (
                <div className="attendee-card" key={user._id}>
                  <div className="profile-pic-container">
                    <img
                      src={user.userId.profilePic || defaultavator}
                      alt={user.userId.username}
                      className="profile-pic"
                    />
                  </div>
                  <h3>{user.userId.username}</h3>
                  <p>
                    <strong>Email:</strong> {user.userId.email}
                  </p>
                  <p>
                    <strong>Location:</strong> {user.userId.location}
                  </p>
                  <p>
                    <strong>Date of Birth:</strong>{" "}
                    {new Date(user.userId.dob).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Registration Status:</strong>{" "}
                    {user.is_registered ? "Registered" : "Not Registered"}
                  </p>
                  <p>
                    <strong>Payment Status:</strong> {user.payment_status}
                  </p>
                  <p>
                    <strong>Registered At:</strong>{" "}
                    {new Date(user.createdAt).toLocaleString()}
                  </p>
                  <button
                    className="attendee-button"
                    onClick={() => handleBanClick(user)}
                  >
                    Ban user
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <div className="modal-header">
              <h3>Confirm Ban User</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to ban <strong>{userToBan?.userId?.username}</strong> from this event?</p>
              <p className="warning-text">This action will remove the user from the event and cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={cancelBan}>
                Cancel
              </button>
              <button className="confirm-btn" onClick={confirmBan}>
                Yes, Ban User
              </button>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
}

export default EventAttendee;
