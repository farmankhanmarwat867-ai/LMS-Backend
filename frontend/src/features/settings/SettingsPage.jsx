import React from 'react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Settings, Save, ShieldCheck } from 'lucide-react';

export default function SettingsPage() {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      institutionName: 'EduEnterprise Academy',
      contactEmail: 'admin@eduenterprise.com',
      timeZone: 'GMT+5',
      enableNotifications: true,
      enableSmsAlerts: false,
    },
  });

  const onSubmit = (data) => {
    toast.success('System configuration parameters saved!');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-3">
        <Settings className="w-8 h-8 text-[var(--color-primary-pink)]" />
        <div>
          <h2 className="text-xl font-bold text-slate-805 dark:text-slate-100">Global Settings</h2>
          <p className="text-xs text-slate-400 font-medium">Control institution configurations and notifications settings</p>
        </div>
      </div>

      <div className="glass-card p-6 rounded-xl shadow-xs">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200 uppercase tracking-wider">General Configurations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input id="institutionName" label="Institution Title Name" required {...register('institutionName')} />
              <Input id="contactEmail" label="Administrative Contact Email" required type="email" {...register('contactEmail')} />
            </div>
            <Select
              id="timeZone"
              label="Default Timezone"
              options={[
                { value: 'GMT', label: 'Greenwich Mean Time (GMT)' },
                { value: 'GMT+1', label: 'Central European Time (GMT+1)' },
                { value: 'GMT+5', label: 'Pakistan Standard Time (GMT+5)' },
                { value: 'GMT+8', label: 'Singapore Standard Time (GMT+8)' },
              ]}
              {...register('timeZone')}
            />
          </div>

          <div className="border-t border-black/5 dark:border-white/5 pt-6 space-y-4">
            <h3 className="text-sm font-bold text-[var(--color-text-[var(--color-primary-pink)])] dark:text-slate-200 uppercase tracking-wider">Alerts & Transmissions</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded bg-slate-100 dark:bg-slate-950 border-slate-300 text-[var(--color-primary-pink)] focus:ring-primary/50"
                  {...register('enableNotifications')}
                />
                Enable real-time inbox alerts
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded bg-slate-100 dark:bg-slate-950 border-slate-300 text-[var(--color-primary-pink)] focus:ring-primary/50"
                  {...register('enableSmsAlerts')}
                />
                Enable SMS updates (gateway charges apply)
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-black/5 dark:border-white/5">
            <Button type="submit" className="gap-2">
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
