import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useResetPasswordMutation } from './authApiSlice';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { toast } from 'react-hot-toast';

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&#]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      const response = await resetPassword({ token, password: data.password }).unwrap();
      if (response.success) {
        toast.success(response.message || 'Password reset successfully! Please login with your new password.');
        navigate('/login', { replace: true });
      } else {
        toast.error(response.message || 'Failed to reset password');
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Invalid or expired password reset token');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h3 className="text-xl font-bold text-white">Reset Password</h3>
        <p className="text-xs text-slate-400">Choose a strong, secure new password below</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="password"
          label="New Password"
          type="password"
          placeholder="••••••••"
          required
          error={errors.password}
          {...register('password')}
        />

        <Input
          id="confirmPassword"
          label="Confirm New Password"
          type="password"
          placeholder="••••••••"
          required
          error={errors.confirmPassword}
          {...register('confirmPassword')}
        />

        <div className="pt-2">
          <Button
            type="submit"
            className="w-full text-center"
            isLoading={isLoading}
          >
            Reset Password
          </Button>
        </div>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="text-xs text-slate-400 hover:text-slate-300 hover:underline transition-colors focus:outline-hidden"
          >
            Back to Sign In
          </button>
        </div>
      </form>
    </div>
  );
}
