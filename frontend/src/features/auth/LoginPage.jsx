import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { setCredentials } from '../../app/authSlice';
import { useLoginMutation, useForgotPasswordMutation } from './authApiSlice';
import { toast } from 'react-hot-toast';
import { LockKeyhole, Mail, ChevronDown, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.string().min(1, 'Please select a role'),
  rememberMe: z.boolean().optional(),
});

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [login, { isLoading }] = useLoginMutation();
  const [forgotPassword] = useForgotPasswordMutation();

  const [forgotOpen, setForgotOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isForgotSending, setIsForgotSending] = useState(false);

  const rememberedEmail = localStorage.getItem('rememberedEmail') || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { 
      email: rememberedEmail, 
      password: '', 
      role: '',
      rememberMe: !!rememberedEmail 
    },
  });

  const onSubmit = async (data) => {
    try {
      const response = await login({ email: data.email, password: data.password, role: data.role }).unwrap();
      if (response.success) {
        if (data.rememberMe) {
          localStorage.setItem('rememberedEmail', data.email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        dispatch(
          setCredentials({
            user: response.data.user,
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken,
          })
        );
        toast.success(response.message || 'Login successful!');
        navigate('/dashboard', { replace: true });
      } else {
        toast.error(response.message || 'Login failed');
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Invalid email or password');
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    if (!z.string().email().safeParse(forgotEmail).success) {
      toast.error("Please enter a valid email address.");
      return;
    }
    
    try {
      setIsForgotSending(true);
      const res = await forgotPassword({ email: forgotEmail }).unwrap();
      toast.success(res.message || 'If an account with that email exists, a password reset link has been sent.');
      setForgotOpen(false);
      setForgotEmail('');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to send reset link');
    } finally {
      setIsForgotSending(false);
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="relative bg-card text-card-foreground border border-border p-8 sm:p-10 rounded-[2rem] shadow-xl">
          
          <div className="text-center mb-8">
            <h2 className="text-3xl font-heading font-bold mb-2">Welcome Back</h2>
            <p className="text-sm text-muted-foreground">Enter your credentials to access your account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="relative group">
              <label htmlFor="role" className="block text-sm font-medium text-foreground mb-1.5">
                Login As
              </label>
              <div className="relative">
                <select
                  id="role"
                  {...register('role')}
                  className={`w-full px-4 py-2.5 text-sm rounded-xl border bg-background text-foreground placeholder-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm appearance-none ${errors.role ? 'border-destructive' : 'border-border'}`}
                >
                  <option value="" disabled>Select your role</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="INSTITUTE_ADMIN">Institute Admin</option>
                  <option value="BRANCH_ADMIN">Branch Admin</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="STUDENT">Student</option>
                  <option value="PARENT">Parent</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              {errors.role && <span className="text-xs text-destructive mt-1.5 ml-1 block">{errors.role.message}</span>}
            </div>

            <Input
              id="email"
              label="Email Address"
              type="email"
              placeholder="name@educore.com"
              error={errors.email}
              {...register('email')}
            />

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-foreground">Password</label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-xs font-semibold text-primary hover:underline focus:outline-hidden"
                >
                  Forgot Password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                error={errors.password}
                {...register('password')}
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center w-5 h-5 rounded border border-border bg-background group-hover:border-primary transition-colors">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    {...register('rememberMe')}
                  />
                  <CheckCircle2 className="w-4 h-4 text-primary opacity-0 peer-checked:opacity-100 transition-opacity absolute" />
                </div>
                <span className="text-sm text-muted-foreground font-medium select-none group-hover:text-foreground transition-colors">
                  Remember me
                </span>
              </label>
            </div>

            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full py-3"
            >
              Sign In
            </Button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium">
            <ShieldCheck className="w-4 h-4 text-success" />
            <span>Secure SSL Encrypted Connection</span>
          </div>

          <div className="mt-6 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <button
              onClick={() => setTermsOpen(true)}
              className="text-primary hover:underline transition-colors focus:outline-hidden"
            >
              Terms & Conditions
            </button>{' '}
            and Privacy Policy.
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {forgotOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border p-6 relative"
            >
              <button
                onClick={() => setForgotOpen(false)}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Reset Password</h3>
                <p className="text-sm text-muted-foreground">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  id="forgot-email"
                  label="Email Address"
                  type="email"
                  placeholder="name@educore.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleForgotSubmit(e);
                  }}
                />
                <Button
                  onClick={handleForgotSubmit}
                  isLoading={isForgotSending}
                  className="w-full"
                >
                  Send Reset Link
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {termsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl shadow-xl border border-border relative"
            >
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h3 className="text-xl font-bold text-foreground">Terms & Conditions</h3>
                <button
                  onClick={() => setTermsOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto text-sm text-muted-foreground space-y-4">
                <p>Welcome to EduCore. By accessing our platform, you agree to these terms.</p>
                <p>1. <strong>Usage</strong>: The platform must only be used for educational and administrative purposes.</p>
                <p>2. <strong>Privacy</strong>: We value your privacy and comply with all applicable data protection laws. Your data will never be sold to third parties.</p>
                <p>3. <strong>Security</strong>: You are responsible for keeping your credentials secure.</p>
              </div>
              <div className="p-6 border-t border-border flex justify-end">
                <Button onClick={() => setTermsOpen(false)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
