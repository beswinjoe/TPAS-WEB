'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { formatDate, getInitials } from '@/lib/utils';
import { User, Phone, Mail, Lock, Camera, Save, Loader2, Eye, EyeOff, Briefcase, Building2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { DIVISIONS } from '@/lib/constants';

const ROLES = ['President', 'Secretary', 'Treasurer', 'Member', 'Admin'];

export default function ProfilePage() {
  const { member, updateMember } = useAuth();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: member?.name ?? '',
    employee_id: member?.employee_id ?? '',
    division: member?.division ?? '',
    role: member?.role ?? '',
    phone: member?.phone ?? '',
    email: member?.email ?? '',
  });
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const updateData: any = { phone: form.phone, email: form.email };
    if (member?.role === 'Admin') {
      updateData.name = form.name;
      updateData.employee_id = form.employee_id;
      updateData.division = form.division;
      updateData.role = form.role;
    }

    const { data, error } = await supabase
      .from('members')
      .update(updateData)
      .eq('id', member!.id)
      .select()
      .single();
    if (error) {
      toast.error('Failed to update profile.');
    } else {
      updateMember(updateData);
      toast.success('Profile updated successfully!');
    }
    setSaving(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!passwords.current || !passwords.newPass || !passwords.confirm) {
      toast.error('Please fill all password fields.');
      return;
    }
    if (passwords.newPass !== passwords.confirm) {
      toast.error('New passwords do not match.');
      return;
    }
    if (passwords.newPass.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setSavingPw(true);

    // Check current password
    const { data: authData } = await supabase
      .from('member_auth')
      .select('password_hash')
      .eq('member_id', member!.id)
      .single();

    if (authData?.password_hash !== passwords.current) {
      toast.error('Current password is incorrect.');
      setSavingPw(false);
      return;
    }

    const { error } = await supabase
      .from('member_auth')
      .update({ password_hash: passwords.newPass })
      .eq('member_id', member!.id);

    if (error) {
      toast.error('Failed to update password.');
    } else {
      toast.success('Password changed successfully!');
      setPasswords({ current: '', newPass: '', confirm: '' });
    }
    setSavingPw(false);
  }

  if (!member) return null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Profile Header */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="h-24 gradient-primary relative">
          <div className="absolute -bottom-10 left-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl border-4 border-card gradient-primary flex items-center justify-center text-white text-2xl font-bold shadow-xl overflow-hidden">
                {member.photo_url
                  ? <img src={member.photo_url} alt="" className="w-full h-full object-cover" />
                  : getInitials(member.name)}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-white shadow-md hover:bg-primary/90 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={() => toast.info('Photo upload requires Supabase Storage configuration.')} />
            </div>
          </div>
        </div>
        <div className="pt-14 pb-5 px-6">
          <h2 className="text-xl font-bold text-foreground">{member.name}</h2>
          <p className="text-muted-foreground text-sm">{member.employee_id} · {member.role}</p>
          <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
            {member.division && <span>📍 {member.division}</span>}
            <span>📅 Since {formatDate(member.joining_date)}</span>
            <span className={`font-medium ${member.status === 'Active' ? 'text-emerald-600' : 'text-amber-600'}`}>
              ● {member.status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <User className="w-4.5 h-4.5 text-primary" />
            <h3 className="font-semibold text-foreground">Contact Information</h3>
          </div>
          <form onSubmit={handleProfileSave} className="p-5 space-y-4">
            {/* Editable for Admin, Read-only for others */}
            {member.role === 'Admin' ? (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    <User className="w-3.5 h-3.5 inline mr-1" />Full Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    <CreditCard className="w-3.5 h-3.5 inline mr-1" />Employee ID
                  </label>
                  <input
                    type="text"
                    value={form.employee_id}
                    onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    <Building2 className="w-3.5 h-3.5 inline mr-1" />Division
                  </label>
                  <select
                    value={form.division}
                    onChange={e => setForm(f => ({ ...f, division: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  >
                    <option value="">Select Division</option>
                    {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    <Briefcase className="w-3.5 h-3.5 inline mr-1" />Role
                  </label>
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </>
            ) : (
              [
                { label: 'Full Name', value: member.name },
                { label: 'Employee ID', value: member.employee_id },
                { label: 'Division', value: member.division ?? '—' },
                { label: 'Role', value: member.role },
              ].map(({ label, value }) => (
                <div key={label}>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
                  <div className="px-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm text-foreground opacity-70">
                    {value}
                  </div>
                </div>
              ))
            )}

            {/* Editable fields */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                <Phone className="w-3.5 h-3.5 inline mr-1" />Phone Number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="Enter phone number"
                className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                <Mail className="w-3.5 h-3.5 inline mr-1" />Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="Enter email address"
                className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-primary/20 disabled:opacity-70"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <Lock className="w-4.5 h-4.5 text-primary" />
            <h3 className="font-semibold text-foreground">Change Password</h3>
          </div>
          <form onSubmit={handlePasswordChange} className="p-5 space-y-4">
            {[
              { label: 'Current Password', key: 'current', showKey: 'current' as const },
              { label: 'New Password', key: 'newPass', showKey: 'new' as const },
              { label: 'Confirm New Password', key: 'confirm', showKey: 'confirm' as const },
            ].map(({ label, key, showKey }) => (
              <div key={key}>
                <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
                <div className="relative">
                  <input
                    type={showPw[showKey] ? 'text' : 'password'}
                    value={passwords[key as keyof typeof passwords]}
                    onChange={e => setPasswords(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    className="w-full px-3 py-2.5 pr-10 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => ({ ...p, [showKey]: !p[showKey] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw[showKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}

            <div className="text-xs text-muted-foreground bg-muted/30 rounded-xl p-3 border border-border">
              Password requirements: minimum 6 characters
            </div>

            <button
              type="submit"
              disabled={savingPw}
              className="w-full flex items-center justify-center gap-2 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-primary/20 disabled:opacity-70"
            >
              {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-4 h-4" /> Update Password</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
