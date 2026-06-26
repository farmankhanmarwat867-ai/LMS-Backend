import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser, setCredentials } from '../../app/authSlice';
import { useChangePasswordMutation, useGetMeQuery } from '../auth/authApiSlice';
import { useUpdateUserMutation } from '../../app/api/coreApiSlice';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { toast } from 'react-hot-toast';
import { User, Phone, Mail, ShieldAlert, Camera, X } from 'lucide-react';
import { uploadSingleFile } from '../../services/uploadHelper';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  phone: z.string().optional(),
});

export default function ProfilePage() {
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();

  // Queries & Mutations
  const { data: meResponse } = useGetMeQuery();
  const [updateUser, { isLoading: isUpdatingProfile }] = useUpdateUserMutation();
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();

  const profileUser = meResponse?.data || user;

  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (profileUser) {
      setAvatarUrl(profileUser.avatar || '');
    }
  }, [profileUser]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const res = await uploadSingleFile(file);
      if (res.success) {
        // Save to database immediately
        const response = await updateUser({
          id: profileUser.id || profileUser._id,
          avatar: res.data.fileUrl,
          name: profileUser.name,
          phone: profileUser.phone || '',
        }).unwrap();
        
        if (response.success) {
          setAvatarUrl(res.data.fileUrl);
          dispatch(setCredentials({ user: response.data, accessToken: localStorage.getItem('accessToken') }));
          toast.success('Profile picture updated successfully!');
        } else {
          toast.error(response.message || 'Failed to save profile picture');
        }
      } else {
        toast.error('Failed to upload image');
      }
    } catch (err) {
      console.error('Error updating profile picture:', err);
      toast.error(err?.data?.message || err?.response?.data?.message || err?.message || 'Error updating profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    try {
      setIsUploading(true);
      const response = await updateUser({
        id: profileUser.id || profileUser._id,
        avatar: '',
        name: profileUser.name,
        phone: profileUser.phone || '',
      }).unwrap();
      
      if (response.success) {
        setAvatarUrl('');
        dispatch(setCredentials({ user: response.data, accessToken: localStorage.getItem('accessToken') }));
        toast.success('Profile picture removed successfully!');
      } else {
        toast.error(response.message || 'Failed to remove profile picture');
      }
    } catch (err) {
      console.error('Error removing profile picture:', err);
      toast.error(err?.data?.message || err?.response?.data?.message || err?.message || 'Error removing profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  // Forms
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    values: {
      name: profileUser?.name || '',
      email: profileUser?.email || '',
      phone: profileUser?.phone || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const onUpdateProfile = async (data) => {
    try {
      const response = await updateUser({ id: profileUser.id || profileUser._id, avatar: avatarUrl, ...data }).unwrap();
      if (response.success) {
        dispatch(setCredentials({ user: response.data, accessToken: localStorage.getItem('accessToken') }));
        toast.success('Profile updated successfully!');
      } else {
        toast.error(response.message || 'Update failed');
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast.error(err?.data?.message || err?.response?.data?.message || err?.message || 'Failed to update profile');
    }
  };

  const onChangePassword = async (data) => {
    try {
      const response = await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }).unwrap();
      
      if (response.success) {
        toast.success('Password changed successfully! Please log in again.');
        resetPasswordForm();
      } else {
        toast.error(response.message || 'Password change failed');
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to change password. Double check current password.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-[var(--color-text-[var(--color-primary-pink)])]">My Profile</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="glass-card p-6 rounded-xl flex flex-col items-center text-center shadow-xs">
          <div className="relative w-24 h-24 mb-2">
            <div className="relative group w-full h-full rounded-full bg-[var(--color-primary-pink)]/5 dark:bg-slate-950 border border-black/5 dark:border-white/5 flex items-center justify-center overflow-hidden shrink-0 shadow-sm cursor-pointer">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-extrabold text-[var(--color-primary-pink)] select-none">
                  {profileUser?.name?.charAt(0).toUpperCase()}
                </span>
              )}
              
              {/* Upload Overlay */}
              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity duration-200 text-[10px] font-bold uppercase select-none">
                <Camera className="w-5 h-5 mb-1 text-white" />
                <span>{isUploading ? 'Uploading...' : 'Change'}</span>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={isUploading} />
              </label>
            </div>
            
            {avatarUrl && (
              <button
                type="button"
                onClick={handleAvatarRemove}
                className="absolute -top-1 -right-1 p-1 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md transition-colors"
                title="Remove Photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <h3 className="text-lg font-bold text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200 mt-4">{profileUser?.name}</h3>
          <span className="text-xs font-mono font-bold tracking-wider bg-slate-100 dark:bg-slate-800 text-[var(--color-text-secondary)] px-2.5 py-0.5 rounded-md mt-2">
            {profileUser?.role}
          </span>
          <div className="w-full border-t border-black/5 dark:border-white/5 my-4"></div>
          <div className="w-full text-left space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">{profileUser?.email}</span>
            </p>
            {profileUser?.phone && (
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{profileUser.phone}</span>
              </p>
            )}
          </div>
        </div>

        {/* Edit Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile Form */}
          <div className="glass-card p-6 rounded-xl shadow-xs">
            <h3 className="text-sm font-bold text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200 uppercase tracking-wider mb-4">Personal Details</h3>
            <form onSubmit={handleProfileSubmit(onUpdateProfile)} className="space-y-4">
              <Input
                id="name"
                label="Full Name"
                error={profileErrors.name}
                {...registerProfile('name')}
              />
              <Input
                id="email"
                label="Email Address"
                error={profileErrors.email}
                {...registerProfile('email')}
              />
              <Input
                id="phone"
                label="Phone Number"
                error={profileErrors.phone}
                {...registerProfile('phone')}
              />
              <div className="flex justify-end">
                <Button type="submit" isLoading={isUpdatingProfile}>Save Changes</Button>
              </div>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="glass-card p-6 rounded-xl shadow-xs">
            <h3 className="text-sm font-bold text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200 uppercase tracking-wider mb-4">Security Settings</h3>
            <form onSubmit={handlePasswordSubmit(onChangePassword)} className="space-y-4">
              <Input
                id="currentPassword"
                label="Current Password"
                type="password"
                error={passwordErrors.currentPassword}
                {...registerPassword('currentPassword')}
              />
              <Input
                id="newPassword"
                label="New Password"
                type="password"
                error={passwordErrors.newPassword}
                {...registerPassword('newPassword')}
              />
              <Input
                id="confirmPassword"
                label="Confirm New Password"
                type="password"
                error={passwordErrors.confirmPassword}
                {...registerPassword('confirmPassword')}
              />
              <div className="flex justify-end">
                <Button type="submit" variant="danger" isLoading={isChangingPassword}>Change Password</Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
