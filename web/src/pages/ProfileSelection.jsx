import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile, hashPin } from "../context/ProfileContext";
import { Plus, Edit2, Trash2, ShieldAlert, X } from "lucide-react";

export default function ProfileSelection() {
  const { profiles, selectProfile, createProfile, updateProfile, deleteProfile } = useProfile();
  const [isManaging, setIsManaging] = useState(false);
  
  // Modals / states
  const [pinModalProfile, setPinModalProfile] = useState(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState("");

  const [editProfileData, setEditProfileData] = useState(null); // { id?, name, avatarUrl, pinString, isNew }
  
  const navigate = useNavigate();

  const handleProfileClick = (profile) => {
    if (isManaging) {
      // Edit mode
      setEditProfileData({
        id: profile.id,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        pinString: "",
        hasPin: !!profile.pin,
        isNew: false
      });
    } else {
      // Direct select or pin entry
      if (profile.pin) {
        setPinModalProfile(profile);
        setEnteredPin("");
        setPinError("");
      } else {
        selectProfile(profile);
        navigate("/");
      }
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setPinError("");
    if (enteredPin.length !== 4) {
      setPinError("PIN must be 4 digits.");
      return;
    }

    try {
      const hashed = await hashPin(enteredPin);
      if (hashed === pinModalProfile.pin) {
        selectProfile(pinModalProfile);
        setPinModalProfile(null);
        navigate("/");
      } else {
        setPinError("Incorrect PIN. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setPinError("Error validating PIN.");
    }
  };

  const handleCreateNewClick = () => {
    setEditProfileData({
      name: "",
      avatarUrl: "avatar_orange",
      pinString: "",
      isNew: true
    });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editProfileData.name.trim()) return;

    try {
      if (editProfileData.isNew) {
        await createProfile(
          editProfileData.name,
          editProfileData.avatarUrl,
          editProfileData.pinString || null
        );
      } else {
        await updateProfile(
          editProfileData.id,
          editProfileData.name,
          editProfileData.avatarUrl,
          editProfileData.pinString || null
        );
      }
      setEditProfileData(null);
    } catch (err) {
      alert(err.message || "Failed to save profile.");
    }
  };

  const handleDeleteClick = async (profileId) => {
    if (window.confirm("Are you sure you want to delete this profile? This will wipe its watch history and watchlist.")) {
      try {
        await deleteProfile(profileId);
        setEditProfileData(null);
      } catch (err) {
        alert("Failed to delete profile.");
      }
    }
  };

  const avatars = ["avatar_orange", "avatar_blue", "avatar_green", "avatar_pink", "avatar_purple"];

  return (
    <div className="profiles-page flex-center">
      <div className="profiles-container text-center fade-in">
        <h1 className="profiles-title">
          {isManaging ? "Manage Profiles" : "Who's watching?"}
        </h1>

        <div className="profiles-grid">
          {profiles.map((profile) => (
            <div 
              key={profile.id} 
              className={`profile-card ${isManaging ? "managing" : ""}`}
              onClick={() => handleProfileClick(profile)}
            >
              <div className={`profile-avatar ${profile.avatarUrl}`}>
                {profile.name.charAt(0).toUpperCase()}
                {isManaging && (
                  <div className="edit-overlay flex-center">
                    <Edit2 size={24} />
                  </div>
                )}
              </div>
              <span className="profile-name">{profile.name}</span>
            </div>
          ))}

          {profiles.length < 4 && (
            <div className="profile-card new" onClick={handleCreateNewClick}>
              <div className="profile-avatar add flex-center">
                <Plus size={32} />
              </div>
              <span className="profile-name">Add Profile</span>
            </div>
          )}
        </div>

        <button 
          className="btn btn-secondary manage-profiles-btn"
          onClick={() => setIsManaging(!isManaging)}
        >
          {isManaging ? "Done" : "Manage Profiles"}
        </button>
      </div>

      {/* PIN entry Modal */}
      {pinModalProfile && (
        <div className="modal-backdrop flex-center">
          <div className="modal-card text-center fade-in">
            <h2>Profile Lock</h2>
            <p>Enter your 4-digit PIN to access {pinModalProfile.name}.</p>
            {pinError && <div className="pin-error-msg">{pinError}</div>}
            
            <form onSubmit={handlePinSubmit}>
              <input 
                type="password" 
                maxLength={4}
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="pin-input"
                autoFocus
              />
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setPinModalProfile(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Profile Modal */}
      {editProfileData && (
        <div className="modal-backdrop flex-center">
          <div className="modal-card fade-in">
            <div className="modal-header">
              <h2>{editProfileData.isNew ? "Add Profile" : "Edit Profile"}</h2>
              <button className="close-modal" onClick={() => setEditProfileData(null)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveProfile} className="profile-form">
              <div className="form-group">
                <label className="form-label">Profile Name</label>
                <input 
                  type="text" 
                  className="form-control"
                  value={editProfileData.name}
                  onChange={(e) => setEditProfileData({...editProfileData, name: e.target.value})}
                  required
                  placeholder="Enter name"
                  maxLength={15}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Choose Avatar</label>
                <div className="avatar-selection-row">
                  {avatars.map((av) => (
                    <button
                      key={av}
                      type="button"
                      className={`avatar-choice ${av} ${editProfileData.avatarUrl === av ? "selected" : ""}`}
                      onClick={() => setEditProfileData({...editProfileData, avatarUrl: av})}
                    ></button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Profile PIN (Optional 4 digits)</label>
                <input 
                  type="password" 
                  maxLength={4}
                  className="form-control"
                  value={editProfileData.pinString}
                  onChange={(e) => setEditProfileData({...editProfileData, pinString: e.target.value.replace(/\D/g, "")})}
                  placeholder={editProfileData.hasPin ? "Enter new PIN (or leave blank to keep)" : "Enter PIN"}
                />
                {!editProfileData.isNew && editProfileData.hasPin && (
                  <button 
                    type="button"
                    className="remove-pin-btn"
                    onClick={() => setEditProfileData({...editProfileData, pinString: "REMOVE", hasPin: false})}
                  >
                    Remove PIN Lock
                  </button>
                )}
              </div>

              <div className="modal-actions-space">
                {!editProfileData.isNew && (
                  <button 
                    type="button" 
                    className="btn btn-secondary delete-p-btn"
                    onClick={() => handleDeleteClick(editProfileData.id)}
                  >
                    <Trash2 size={16} /> Delete Profile
                  </button>
                )}
                <div className="right-actions-modal">
                  <button type="button" className="btn btn-secondary" onClick={() => setEditProfileData(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .profiles-page {
          min-height: 100vh;
          width: 100vw;
          background-color: var(--bg);
          padding: 40px 20px;
        }
        .profiles-container {
          max-width: 800px;
        }
        .profiles-title {
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 700;
          margin-bottom: 3rem;
          color: white;
        }
        .profiles-grid {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 2rem;
          margin-bottom: 4rem;
        }
        .profile-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          cursor: pointer;
          width: 120px;
          transition: var(--transition);
        }
        .profile-card:hover {
          transform: translateY(-5px);
        }
        .profile-card:hover .profile-name {
          color: white;
        }
        .profile-avatar {
          width: 110px;
          height: 110px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          font-weight: 800;
          color: white;
          position: relative;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
        }
        .profile-avatar.avatar_orange { background: linear-gradient(135deg, #FF9900, #FF5E00); }
        .profile-avatar.avatar_blue { background: linear-gradient(135deg, #0070F3, #00C6FF); }
        .profile-avatar.avatar_green { background: linear-gradient(135deg, #00C851, #00E676); }
        .profile-avatar.avatar_pink { background: linear-gradient(135deg, #FF4081, #FF80AB); }
        .profile-avatar.avatar_purple { background: linear-gradient(135deg, #AA00FF, #E040FB); }
        .profile-avatar.add {
          background-color: #1A1A1A;
          border: 2px dashed #444;
          color: #777;
          transition: var(--transition);
        }
        .profile-card:hover .profile-avatar.add {
          border-color: white;
          color: white;
          background-color: #2A2A2A;
        }
        
        .profile-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-secondary);
          transition: var(--transition);
        }
        
        .edit-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 8px;
          color: white;
          opacity: 0;
          transition: var(--transition);
        }
        .profile-card.managing:hover .edit-overlay {
          opacity: 1;
        }

        .manage-profiles-btn {
          border: 1px solid var(--text-secondary);
          letter-spacing: 0.05em;
          padding: 0.6rem 1.8rem;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        .manage-profiles-btn:hover {
          border-color: white;
          color: white;
          background: rgba(255,255,255,0.05);
        }

        /* Modal styling */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          z-index: 200;
          padding: 20px;
        }
        .modal-card {
          background: #141414;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 2.5rem;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.7);
        }
        .modal-card h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: white;
        }
        .modal-card p {
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
        }
        .pin-input {
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 1rem;
          width: 120px;
          font-size: 1.8rem;
          letter-spacing: 0.8rem;
          text-align: center;
          color: white;
          display: block;
          margin: 0 auto 1.5rem;
        }
        .pin-input:focus {
          outline: none;
          border-color: var(--primary);
        }
        .pin-error-msg {
          color: #ff8080;
          background: rgba(229, 9, 20, 0.1);
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 0.8rem;
          margin-bottom: 1rem;
        }
        .modal-actions {
          display: flex;
          justify-content: center;
          gap: 1rem;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border);
          padding-bottom: 10px;
        }
        .close-modal {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
        }
        .close-modal:hover {
          color: white;
        }
        
        .avatar-selection-row {
          display: flex;
          gap: 0.8rem;
          margin-top: 0.5rem;
        }
        .avatar-choice {
          width: 48px;
          height: 48px;
          border-radius: 6px;
          border: 2px solid transparent;
          cursor: pointer;
          transition: var(--transition);
        }
        .avatar-choice.avatar_orange { background: linear-gradient(135deg, #FF9900, #FF5E00); }
        .avatar-choice.avatar_blue { background: linear-gradient(135deg, #0070F3, #00C6FF); }
        .avatar-choice.avatar_green { background: linear-gradient(135deg, #00C851, #00E676); }
        .avatar-choice.avatar_pink { background: linear-gradient(135deg, #FF4081, #FF80AB); }
        .avatar-choice.avatar_purple { background: linear-gradient(135deg, #AA00FF, #E040FB); }
        .avatar-choice.selected {
          border-color: white;
          transform: scale(1.1);
          box-shadow: 0 0 10px rgba(255,255,255,0.4);
        }
        
        .remove-pin-btn {
          background: none;
          border: none;
          color: #ff8080;
          font-size: 0.8rem;
          cursor: pointer;
          margin-top: 6px;
          text-decoration: underline;
        }
        .modal-actions-space {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 2rem;
        }
        .right-actions-modal {
          display: flex;
          gap: 0.8rem;
        }
        .delete-p-btn {
          color: #ff8080;
          border: 1px solid rgba(255, 128, 128, 0.2);
        }
        .delete-p-btn:hover {
          background: rgba(229, 9, 20, 0.1);
          border-color: rgba(229, 9, 20, 0.3);
        }
      `}</style>
    </div>
  );
}
