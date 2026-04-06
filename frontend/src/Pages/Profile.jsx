import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaMapMarkerAlt, FaCalendarAlt, FaEdit, FaSave, FaTimes, FaCamera, FaUpload, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/apiService';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../CSS/profile.css';
import Footer from '../Components/Footer';
import Loader from "../Components/loader";

const Profile = () => {
  const { isAuthenticated, logout, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const [profileData, setProfileData] = useState({
    _id: '',
    username: '',
    email: '',
    location: '',
    dob: '',
    profilePic: '',
    targetScore: 7.0,
    isAdmin: false,
    createdAt: ''
  });

  const [editData, setEditData] = useState({ ...profileData });
  // Certificates state
  const [certificates, setCertificates] = useState([]);
  const [certsOpen, setCertsOpen] = useState(false);
  const [certsLoading, setCertsLoading] = useState(false);
  const [certsError, setCertsError] = useState('');

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const loadCertificates = async () => {
    if (!profileData._id) return;
    setCertsLoading(true); setCertsError('');
    try {
      const { data } = await apiService.getUserCertificates(profileData._id);
      if (data.success) setCertificates(data.certificates || []); else setCertsError(data.message || 'Failed to load certificates');
    } catch (e) {
      setCertsError(e.response?.data?.message || 'Failed to load certificates');
    } finally { setCertsLoading(false); }
  };

  const toggleCertificates = () => {
    const next = !certsOpen;
    setCertsOpen(next);
    if (next && certificates.length === 0) loadCertificates();
  };

  const handleDownloadCert = async (registrationId, eventTitle) => {
    try {
      const res = await apiService.downloadCertificate(registrationId);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = (eventTitle || 'certificate').replace(/[^a-z0-9]/gi,'_');
      a.download = `Certificate_${safeTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Download failed');
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      fetchProfile();
    }
  }, [isAuthenticated, navigate]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await apiService.getProfile();
      if (response.data.success) {
        const userData = response.data.user;
        setProfileData({
          _id: userData._id || '',
          username: userData.username || '',
          email: userData.email || '',
          location: userData.location || '',
          dob: userData.dob ? new Date(userData.dob).toISOString().split('T')[0] : '',
          profilePic: userData.profilePic || '',
          targetScore: userData.targetScore || 7.0,
          isAdmin: userData.isAdmin || false,
          createdAt: userData.createdAt || ''
        });
      } else {
        toast.error('Failed to load profile data');
      }
    } catch (error) {
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({ ...profileData });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({ ...profileData });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await apiService.updateProfile(editData);
      if (response.data.success) {
        const updatedUser = response.data.user;
        setProfileData({
          _id: updatedUser._id || profileData._id,
          username: updatedUser.username || '',
          email: updatedUser.email || '',
          location: updatedUser.location || '',
          dob: updatedUser.dob ? new Date(updatedUser.dob).toISOString().split('T')[0] : '',
          profilePic: updatedUser.profilePic || profileData.profilePic,
          targetScore: updatedUser.targetScore || 7.0,
          isAdmin: updatedUser.isAdmin || false,
          createdAt: updatedUser.createdAt || ''
        });
        setIsEditing(false);
        toast.success('Profile updated successfully!');
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to update profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setEditData({
      ...editData,
      [e.target.name]: e.target.value
    });
  };

  // Password change functions
  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field]
    });
  };

  const handlePasswordSubmit = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    try {
      setPasswordLoading(true);
      const response = await apiService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.data.success) {
        toast.success('Password changed successfully!');
        setShowPasswordModal(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        toast.error(response.data.message || 'Failed to change password');
      }
    } catch (error) {
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to change password');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setShowPasswords({
      current: false,
      new: false,
      confirm: false
    });
  };

  // Image upload functions
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxSize = 3 * 1024 * 1024; // 3MB
    if (file.size > maxSize) {
      toast.error(`File size is ${(file.size / (1024 * 1024)).toFixed(2)}MB. Please select a file smaller than 3MB.`);
      e.target.value = '';
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      e.target.value = '';
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('photo', file);

      const response = await apiService.uploadProfilePhoto(profileData._id, formData);
      if (response.data.success) {
        setProfileData({
          ...profileData,
          profilePic: response.data.url
        });
        await refreshUserData();
        toast.success('Profile photo updated successfully!');
      } else {
        toast.error(response.data.message || 'Failed to upload image');
      }
    } catch (error) {
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.response?.status === 413) {
        toast.error('File is too large. Please select a smaller image.');
      } else {
        toast.error('Failed to upload image. Please try again.');
      }
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const getInitials = (username) => {
    if (!username) return 'U';
    return username.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!isAuthenticated) {
    return (
      <div className="profile-container">
        <Loader color={document.documentElement.getAttribute("data-theme") === "dark" ? "#ffffff" : "#000000"} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="profile-container">
        <Loader color={document.documentElement.getAttribute("data-theme") === "dark" ? "#ffffff" : "#000000"} />
      </div>
    );
  }

  return (
    <div className="profile-container">
      {loading && <Loader color={document.documentElement.getAttribute("data-theme") === "dark" ? "#ffffff" : "#000000"} />}
      {/* Header */}
      <header className="profile-header">
        <div className="header-content">
          <Link to="/" className="back-link">← Back to Home</Link>
          <h1>My Profile</h1>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="profile-content">
        {/* Left Side - Avatar & Name */}
        <div className="profile-left">
          <div className="profile-card">
            <div className="profile-avatar" onClick={!isEditing ? handleImageClick : undefined}>
              {profileData.profilePic ? (
                <img src={profileData.profilePic} alt="Profile"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : (
                <span>{getInitials(profileData.username)}</span>
              )}
              {!isEditing && (
                <div className="upload-overlay">
                  <FaCamera size={16} />
                  <span>Change Photo</span>
                </div>
              )}
              {uploadingImage && (
                <div className="upload-spinner">
                  <div className="spinner"></div>
                  <span>Uploading...</span>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              style={{ display: 'none' }}
            />
            <h2>{profileData.username}</h2>
            <p className="user-role">{profileData.isAdmin ? "Admin User" : "Student"}</p>
          </div>
        </div>

        {/* Right Side - Details */}
        <div className="profile-right">
          <div className="details-card">
            {!isEditing ? (
              <>
                <h3>Profile Details</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <div className="detail-icon">
                      <FaEnvelope />
                    </div>
                    <div className="detail-content">
                      <div className="detail-label">Email</div>
                      <div className="detail-value">{profileData.email}</div>
                    </div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-icon">
                      <FaMapMarkerAlt />
                    </div>
                    <div className="detail-content">
                      <div className="detail-label">Location</div>
                      <div className="detail-value">{profileData.location || "Not provided"}</div>
                    </div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-icon">
                      <FaCalendarAlt />
                    </div>
                    <div className="detail-content">
                      <div className="detail-label">Date of Birth</div>
                      <div className="detail-value">{profileData.dob ? new Date(profileData.dob).toLocaleDateString() : "Not provided"}</div>
                    </div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-icon">
                      <FaUser />
                    </div>
                    <div className="detail-content">
                      <div className="detail-label">Status</div>
                      <div className="detail-value">{profileData.isAdmin ? "Admin" : "Student"}</div>
                    </div>
                  </div>
                </div>
                <div className="action-buttons">
                  <button onClick={handleEdit} className="edit-btn">
                    <FaEdit /> Edit Profile
                  </button>
                  <button onClick={() => setShowPasswordModal(true)} className="password-btn">
                    <FaLock /> Change Password
                  </button>
                </div>
                {!profileData.isAdmin && (
                  <button onClick={toggleCertificates} className="edit-btn" style={{ marginTop:'1rem', background: certsOpen ? 'var(--accent-color)' : undefined }}>
                    {certsOpen ? 'Hide Certificates' : 'View Certificates'}
                  </button>
                )}
              </>
            ) : (
              <div className="edit-form">
                <div className="upload-photo-section">
                  <button type="button" onClick={handleImageClick} className="upload-photo-btn" disabled={uploadingImage}>
                    <FaUpload /> {uploadingImage ? 'Uploading...' : 'Change Photo'}
                  </button>
                  <small>Accepted formats: JPEG, PNG, GIF, WebP (Max: 3MB)</small>
                </div>
                <div className="form-group">
                  <input type="text" name="username" value={editData.username} onChange={handleChange} className="edit-input" placeholder="Username" />
                </div>
                <div className="form-group">
                  <input type="email" name="email" value={editData.email} onChange={handleChange} className="edit-input" placeholder="Email" />
                </div>
                <div className="form-group">
                  <input type="text" name="location" value={editData.location} onChange={handleChange} className="edit-input" placeholder="Location" />
                </div>
                <div className="form-group">
                  <input type="date" name="dob" value={editData.dob} onChange={handleChange} className="edit-input" />
                </div>
                <div className="edit-actions">
                  <button onClick={handleSave} className="save-btn"><FaSave /> Save</button>
                  <button onClick={handleCancel} className="cancel-btn"><FaTimes /> Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {certsOpen && !profileData.isAdmin && (
        <div className="profile-certificates" style={{ margin:'2rem auto', maxWidth:800, width:'100%', background:'var(--bg-card)', border:'1px solid var(--border-light)', borderRadius:16, padding:'1.25rem 1.5rem' }}>
          <h2 style={{ marginTop:0 }}>Certificates</h2>
          {certsLoading && <p>Loading certificates...</p>}
          {certsError && <p style={{ color:'var(--accent-color)' }}>{certsError}</p>}
          {!certsLoading && !certsError && certificates.length === 0 && <p>No certificates available yet. They appear after events end.</p>}
          {!certsLoading && certificates.length > 0 && (
            <div style={{ overflowX:'auto' }}>
              <table className="certificates-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Event Date</th>
                    <th>Registered</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map(c => (
                    <tr key={c.registrationId}>
                      <td>{c.eventTitle}</td>
                      <td>{new Date(c.eventDate).toLocaleDateString()}</td>
                      <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button className="download-btn" onClick={() => handleDownloadCert(c.registrationId, c.eventTitle)}>Download</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="password-modal-overlay" onClick={closePasswordModal}>
          {passwordLoading && <Loader color={document.documentElement.getAttribute("data-theme") === "dark" ? "#ffffff" : "#000000"} />}
          <div className="password-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Change Password</h3>
            <div className="password-form">
              <div className="form-group" style={{ position: 'relative' }}>
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="edit-input"
                  placeholder="Current Password"
                  disabled={passwordLoading}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  disabled={passwordLoading}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: passwordLoading ? 'not-allowed' : 'pointer',
                    opacity: passwordLoading ? 0.5 : 1
                  }}
                >
                  {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <div className="form-group" style={{ position: 'relative' }}>
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="edit-input"
                  placeholder="New Password"
                  disabled={passwordLoading}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  disabled={passwordLoading}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: passwordLoading ? 'not-allowed' : 'pointer',
                    opacity: passwordLoading ? 0.5 : 1
                  }}
                >
                  {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <div className="form-group" style={{ position: 'relative' }}>
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="edit-input"
                  placeholder="Confirm New Password"
                  disabled={passwordLoading}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  disabled={passwordLoading}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: passwordLoading ? 'not-allowed' : 'pointer',
                    opacity: passwordLoading ? 0.5 : 1
                  }}
                >
                  {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
            <div className="password-actions">
              <button onClick={closePasswordModal} className="cancel-btn" disabled={passwordLoading}>
                Cancel
              </button>
              <button onClick={handlePasswordSubmit} className="save-btn" disabled={passwordLoading}>
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}
      <Footer />
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      
    </div>
  );
};

export default Profile;
