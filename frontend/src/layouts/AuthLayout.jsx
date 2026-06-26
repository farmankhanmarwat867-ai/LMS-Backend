import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '../app/authSlice';
import { motion } from 'framer-motion';
import { Building2, Users, Server, Cloud } from 'lucide-react';

export default function AuthLayout() {
  const isAuthenticated = useSelector(selectIsAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const features = [
    { icon: <Building2 className="w-5 h-5 text-primary" />, title: '500+', desc: 'Schools' },
    { icon: <Users className="w-5 h-5 text-secondary" />, title: '50,000+', desc: 'Students' },
    { icon: <Server className="w-5 h-5 text-accent" />, title: '99.9%', desc: 'Uptime' },
    { icon: <Cloud className="w-5 h-5 text-success" />, title: 'Cloud', desc: 'Based' },
  ];

  return (
    <div className="min-h-screen bg-background flex relative overflow-x-hidden font-sans text-foreground">
      <div className="flex w-full z-10">
        
        {/* Left Side - Branding & Features (Hidden on mobile) */}
        <div className="hidden lg:flex flex-1 flex-col justify-between p-12 lg:p-20 relative bg-muted/30 border-r border-border">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center font-black text-primary-foreground text-2xl shadow-lg shadow-primary/30">
                E
              </div>
              <span className="text-3xl font-heading font-extrabold tracking-tight text-foreground">
                EduCore
              </span>
            </div>
            <h1 className="text-5xl font-heading font-black leading-tight mb-6 text-foreground">
              Next-Generation<br/>
              School Management.
            </h1>
            <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
              Experience the power of a modern ERP & LMS designed for the future of education. Seamless, scalable, and secure.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-lg mt-12">
            {features.map((f, idx) => (
              <div
                key={idx}
                className="bg-card border border-border p-4 rounded-2xl shadow-sm flex items-center gap-4 transition-all"
              >
                <div className="p-3 bg-muted rounded-xl">
                  {f.icon}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-card-foreground leading-none">{f.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 z-10">
             <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-black text-primary-foreground text-xl shadow-lg shadow-primary/30">
                E
              </div>
            <span className="text-2xl font-heading font-extrabold tracking-tight text-foreground">
              EduCore
            </span>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
}
