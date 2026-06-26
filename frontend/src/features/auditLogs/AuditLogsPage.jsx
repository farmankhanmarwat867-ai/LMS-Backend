import React, { useState } from 'react';
import Table from '../../components/common/Table';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { History, ShieldAlert, KeyRound, Globe } from 'lucide-react';
import dayjs from 'dayjs';

// Simulated Audit Trail logs for demo purposes
const MOCK_AUDIT_LOGS = [
  { _id: '1', userId: { name: 'Farman Khan' }, action: 'LOGIN', resource: 'User', ipAddress: '192.168.1.1', createdAt: new Date() },
  { _id: '2', userId: { name: 'Admin User' }, action: 'UPDATE_PLAN', resource: 'Plan', ipAddress: '12.45.67.89', createdAt: new Date(Date.now() - 3600000) },
  { _id: '3', userId: { name: 'Super Admin' }, action: 'ACTIVATE_INSTITUTE', resource: 'Institute', ipAddress: '98.76.54.32', createdAt: new Date(Date.now() - 7200000) },
  { _id: '4', userId: { name: 'Branch Admin A' }, action: 'CREATE_USER', resource: 'User', ipAddress: '192.168.10.15', createdAt: new Date(Date.now() - 86400000) },
  { _id: '5', userId: { name: 'Teacher John' }, action: 'MARK_ATTENDANCE', resource: 'Attendance', ipAddress: '192.168.12.4', createdAt: new Date(Date.now() - 172800000) },
];

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const filteredLogs = MOCK_AUDIT_LOGS.filter((log) => {
    const matchesSearch = log.userId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || log.ipAddress?.includes(searchQuery);
    const matchesAction = actionFilter ? log.action === actionFilter : true;
    return matchesSearch && matchesAction;
  });

  const columns = [
    { header: 'Actor', accessorKey: 'userId.name', cell: ({ getValue }) => <span className="font-semibold">{getValue()}</span> },
    {
      header: 'Action Event',
      accessorKey: 'action',
      cell: ({ getValue }) => {
        const val = getValue();
        const colors = {
          LOGIN: 'bg-emerald-100 text-emerald-800',
          UPDATE_PLAN: 'bg-indigo-100 text-indigo-800',
          ACTIVATE_INSTITUTE: 'bg-blue-100 text-blue-800',
          CREATE_USER: 'bg-violet-100 text-violet-800',
          MARK_ATTENDANCE: 'bg-slate-100 text-[var(--color-text-secondary)]',
        };
        return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${colors[val] || 'bg-slate-100'}`}>{val}</span>;
      },
    },
    { header: 'Resource Target', accessorKey: 'resource' },
    { header: 'IP Address', accessorKey: 'ipAddress', cell: ({ getValue }) => <span className="font-mono text-xs">{getValue()}</span> },
    { header: 'Timestamp', accessorKey: 'createdAt', cell: ({ getValue }) => dayjs(getValue()).format('MMM DD, YYYY [at] hh:mm A') },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 pb-3">
        <History className="w-8 h-8 text-[var(--color-primary-pink)]" />
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-[var(--color-primary-pink)])]">Audit Trail logs</h2>
          <p className="text-xs text-slate-400 font-medium">Platform compliance and security access records</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 glass-card p-4 rounded-xl shadow-xs">
        <Input
          id="auditSearch"
          label="Search Actor / IP"
          placeholder="e.g. Farman..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Select
          id="actionFilter"
          label="Filter Action"
          options={[
            { value: 'LOGIN', label: 'Login' },
            { value: 'UPDATE_PLAN', label: 'Update Plan' },
            { value: 'ACTIVATE_INSTITUTE', label: 'Activate Institute' },
            { value: 'CREATE_USER', label: 'Create User' },
            { value: 'MARK_ATTENDANCE', label: 'Mark Attendance' },
          ]}
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        />
      </div>

      <Table columns={columns} data={filteredLogs} />
    </div>
  );
}
