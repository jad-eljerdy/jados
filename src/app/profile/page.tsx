"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, changePassword, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const token = getAuthToken();

  const profile = useQuery(api.users.getProfile, token ? { token } : "skip");
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const saveAvatar = useMutation(api.users.saveAvatar);

  const [name, setName] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (profile?.name) {
      setName(profile.name);
    }
  }, [profile?.name]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setProfileLoading(true);
    setProfileSuccess(false);

    try {
      await updateProfile({ token, name });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    setPasswordLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Failed to change password"
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setAvatarLoading(true);

    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await saveAvatar({ token, storageId });
    } catch (err) {
      console.error(err);
    } finally {
      setAvatarLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold text-white mb-8">
            Profile Settings
          </h1>

          {/* Avatar Section */}
          <section className="bg-zinc-900 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Profile Photo
            </h2>
            <div className="flex items-center gap-6">
              <div className="relative">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt="Avatar"
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                    {profile?.name?.charAt(0) ?? user?.name?.charAt(0) ?? "?"}
                  </div>
                )}
                {avatarLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarLoading}
                >
                  Change Photo
                </Button>
                <p className="mt-2 text-sm text-zinc-400">
                  JPG, PNG or GIF. Max 5MB.
                </p>
              </div>
            </div>
          </section>

          {/* Profile Info Section */}
          <section className="bg-zinc-900 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Profile Information
            </h2>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <Input
                id="name"
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
              <Input
                id="email"
                label="Email"
                value={profile?.email ?? user?.email ?? ""}
                disabled
                className="bg-zinc-800"
              />
              <div className="flex items-center gap-3">
                <Button type="submit" loading={profileLoading}>
                  Save Changes
                </Button>
                {profileSuccess && (
                  <span className="text-sm text-green-400">
                    ✓ Profile updated
                  </span>
                )}
              </div>
            </form>
          </section>

          {/* Password Section */}
          <section className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Change Password
            </h2>

            {passwordError && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
                {passwordError}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <Input
                id="currentPassword"
                type="password"
                label="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
              <Input
                id="newPassword"
                type="password"
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
              <Input
                id="confirmPassword"
                type="password"
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
              <div className="flex items-center gap-3">
                <Button type="submit" loading={passwordLoading}>
                  Update Password
                </Button>
                {passwordSuccess && (
                  <span className="text-sm text-green-400">
                    ✓ Password updated
                  </span>
                )}
              </div>
            </form>
          </section>

          {/* Account Info */}
          <section className="mt-6 text-sm text-zinc-500">
            <p>
              Member since{" "}
              {profile?.createdAt
                ? new Date(profile.createdAt).toLocaleDateString()
                : "..."}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
