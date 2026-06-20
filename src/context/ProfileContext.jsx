import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  deleteDoc, 
  writeBatch
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "./AuthContext";

const ProfileContext = createContext();

export function useProfile() {
  return useContext(ProfileContext);
}

// Utility to generate SHA-256 hex string (browser native)
export async function hashPin(pin) {
  if (!pin) return null;
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function ProfileProvider({ children }) {
  const { currentUser } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load profiles on auth state change
  useEffect(() => {
    if (!currentUser) {
      setProfiles([]);
      setActiveProfile(null);
      setLoading(false);
      return;
    }

    fetchProfilesAndCheckMigration();
  }, [currentUser]);

  // Load active profile from localStorage if saved
  useEffect(() => {
    if (currentUser && profiles.length > 0) {
      const savedProfileId = localStorage.getItem(`active_profile_${currentUser.uid}`);
      if (savedProfileId) {
        const found = profiles.find(p => p.id === savedProfileId);
        if (found) {
          setActiveProfile(found);
        }
      }
    }
  }, [profiles, currentUser]);

  async function fetchProfilesAndCheckMigration() {
    setLoading(true);
    try {
      const uid = currentUser.uid;
      const profilesRef = collection(db, "users", uid, "profiles");
      const snap = await getDocs(profilesRef);

      let list = [];
      if (snap.empty) {
        list = await createDefaultProfileAndMigrate(uid);
      } else {
        list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProfiles(list);
      }

      // Sync active profile from localStorage before finishing loading
      const savedProfileId = localStorage.getItem(`active_profile_${uid}`);
      if (savedProfileId) {
        const found = list.find(p => p.id === savedProfileId);
        if (found) {
          setActiveProfile(found);
        }
      }
    } catch (e) {
      console.error("Error fetching profiles:", e);
    } finally {
      setLoading(false);
    }
  }

  async function createDefaultProfileAndMigrate(uid) {
    const defaultProfileId = crypto.randomUUID();
    const defaultName = currentUser.displayName || currentUser.email.split("@")[0] || "Boss";
    const defaultAvatar = "avatar_orange"; // Default orange theme avatar identifier

    const profileRef = doc(db, "users", uid, "profiles", defaultProfileId);
    const profileData = {
      id: defaultProfileId,
      name: defaultName,
      avatarUrl: defaultAvatar,
      pin: null
    };

    await setDoc(profileRef, profileData);

    // Now migrate legacy root Collections (watchlist, history, ratings) to default profile
    try {
      // 1. Migrate watchlist
      const watchlistRef = collection(db, "users", uid, "watchlist");
      const watchlistSnap = await getDocs(watchlistRef);
      for (const d of watchlistSnap.docs) {
        await setDoc(doc(db, "users", uid, "profiles", defaultProfileId, "watchlist", d.id), d.data());
        await deleteDoc(d.ref);
      }

      // 2. Migrate history
      const historyRef = collection(db, "users", uid, "history");
      const historySnap = await getDocs(historyRef);
      for (const d of historySnap.docs) {
        await setDoc(doc(db, "users", uid, "profiles", defaultProfileId, "history", d.id), d.data());
        await deleteDoc(d.ref);
      }

      // 3. Migrate ratings
      const ratingsRef = collection(db, "users", uid, "ratings");
      const ratingsSnap = await getDocs(ratingsRef);
      for (const d of ratingsSnap.docs) {
        await setDoc(doc(db, "users", uid, "profiles", defaultProfileId, "ratings", d.id), d.data());
        await deleteDoc(d.ref);
      }
    } catch (err) {
      console.warn("Migration warning:", err);
    }

    // Refetch profiles
    const profilesRef = collection(db, "users", uid, "profiles");
    const snap = await getDocs(profilesRef);
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setProfiles(list);
    return list;
  }

  function selectProfile(profile) {
    if (profile) {
      setActiveProfile(profile);
      localStorage.setItem(`active_profile_${currentUser.uid}`, profile.id);
    } else {
      setActiveProfile(null);
      localStorage.removeItem(`active_profile_${currentUser.uid}`);
    }
  }

  async function createProfile(name, avatarUrl, pinString, recoveryQuestion, recoveryAnswer) {
    if (profiles.length >= 4) {
      throw new Error("Maximum of 4 profiles allowed");
    }
    const uid = currentUser.uid;
    const profileId = crypto.randomUUID();
    const hashedPin = pinString ? await hashPin(pinString) : null;

    const profileData = {
      id: profileId,
      name,
      avatarUrl,
      pin: hashedPin,
      recoveryQuestion: hashedPin ? recoveryQuestion : null,
      recoveryAnswer: hashedPin ? recoveryAnswer : null
    };

    await setDoc(doc(db, "users", uid, "profiles", profileId), profileData);
    await fetchProfilesAndCheckMigration();
    return profileData;
  }

  async function updateProfile(profileId, name, avatarUrl, pinString, recoveryQuestion, recoveryAnswer) {
    const uid = currentUser.uid;
    const profileRef = doc(db, "users", uid, "profiles", profileId);
    
    const updateData = { name, avatarUrl };
    if (pinString === "REMOVE") {
      updateData.pin = null;
      updateData.recoveryQuestion = null;
      updateData.recoveryAnswer = null;
    } else if (pinString) {
      const hashedPin = await hashPin(pinString);
      updateData.pin = hashedPin;
      updateData.recoveryQuestion = recoveryQuestion;
      updateData.recoveryAnswer = recoveryAnswer;
    }

    await setDoc(profileRef, updateData, { merge: true });
    await fetchProfilesAndCheckMigration();
  }

  async function deleteProfile(profileId) {
    const uid = currentUser.uid;
    // 1. Delete profile doc
    await deleteDoc(doc(db, "users", uid, "profiles", profileId));

    // 2. Cleanup subcollections in the background (watchlist, history, ratings)
    try {
      const watchlistRef = collection(db, "users", uid, "profiles", profileId, "watchlist");
      const watchlistSnap = await getDocs(watchlistRef);
      for (const d of watchlistSnap.docs) await deleteDoc(d.ref);

      const historyRef = collection(db, "users", uid, "profiles", profileId, "history");
      const historySnap = await getDocs(historyRef);
      for (const d of historySnap.docs) await deleteDoc(d.ref);

      const ratingsRef = collection(db, "users", uid, "profiles", profileId, "ratings");
      const ratingsSnap = await getDocs(ratingsRef);
      for (const d of ratingsSnap.docs) await deleteDoc(d.ref);
    } catch (err) {
      console.warn("Clean up collections error:", err);
    }

    if (activeProfile && activeProfile.id === profileId) {
      selectProfile(null);
    }

    await fetchProfilesAndCheckMigration();
  }

  const value = {
    profiles,
    activeProfile,
    loading,
    selectProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    refreshProfiles: fetchProfilesAndCheckMigration
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}
