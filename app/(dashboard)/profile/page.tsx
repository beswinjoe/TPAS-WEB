'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase/client';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { formatDate, getInitials } from '@/lib/utils';
import { User, Phone, Mail, Lock, Camera, Save, Loader2, Eye, EyeOff, Briefcase, Building2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import type { Division, SubDivision } from '@/types';

const ROLES = ['President', 'Secretary', 'Treasurer', 'Member', 'Admin'];

export default function ProfilePage() {
  const { member, updateMember } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: member?.name ?? '',
    employee_id: member?.employee_id ?? '',
    division_id: member?.division_id ?? '',
    sub_division_id: member?.sub_division_id ?? '',
    role: member?.role ?? '',
    phone: member?.phone ?? '',
    email: member?.email ?? '',
  });
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [subDivisions, setSubDivisions] = useState<SubDivision[]>([]);

  // Load divisions for Admin
  useEffect(() => {
    if (member?.role === 'Admin') {
      getDocs(collection(db, 'divisions')).then(snap => {
        setDivisions(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Division[]);
      });
      getDocs(collection(db, 'sub_divisions')).then(snap => {
        setSubDivisions(snap.docs.map(d => ({ id: d.id, ...d.data() })) as SubDivision[]);
      });
    }
  }, [member?.role]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const updateData: any = { phone: form.phone, email: form.email };
    if (member?.role === 'Admin') {
      updateData.name = form.name;
      updateData.employee_id = form.employee_id;
      updateData.division_id = form.division_id || null;
      updateData.sub_division_id = form.sub_division_id || null;
      updateData.role = form.role;
    }

    try {
      await updateDoc(doc(db, 'members', member!.id), updateData);
      updateMember(updateData);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile.');
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

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user || !user.email) {
      toast.error('Not authenticated.');
      setSavingPw(false);
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, passwords.current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwords.newPass);
      toast.success('Password changed successfully!');
      setPasswords({ current: '', newPass: '', confirm: '' });
    } catch (error: any) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Current password is incorrect.');
      } else {
        toast.error('Failed to update password.');
      }
    }
    setSavingPw(false);
  }

  if (!member) return null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Profile Header */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="h-20 bg-muted relative">
          <div className="absolute -bottom-10 left-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl border-4 border-card bg-foreground flex items-center justify-center text-background text-2xl font-bold shadow-lg overflow-hidden">
                {member.photo_url
                  ? <img src={member.photo_url} alt="" className="w-full h-full object-cover" />
                  : getInitials(member.name)}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-foreground rounded-lg flex items-center justify-center text-background shadow-md hover:opacity-80 transition-all"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={() => toast.info('Photo upload requires Firebase Storage configuration.')} />
            </div>
          </div>
        </div>
        <div className="pt-14 pb-5 px-6">
          <h2 className="text-xl font-bold text-foreground">{member.name}</h2>
          <p className="text-muted-foreground text-sm">{member.employee_id} · {member.role}</p>
          <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
            {member.division && <span>📍 {member.division}</span>}
            <span>📅 Since {formatDate(member.joining_date)}</span>
            <span className={`font-medium ${member.status === 'Active' ? 'text-foreground' : 'text-muted-foreground'}`}>
              ● {member.status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <User className="w-4 h-4 text-muted-foreground" />
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
                    value={form.division_id}
                    onChange={e => setForm(f => ({ ...f, division_id: e.target.value, sub_division_id: '' }))}
                    className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  >
                    <option value="">Select Division</option>
                    {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    <Building2 className="w-3.5 h-3.5 inline mr-1" />Sub Division
                  </label>
                  <select
                    value={form.sub_division_id}
                    onChange={e => setForm(f => ({ ...f, sub_division_id: e.target.value }))}
                    disabled={!form.division_id}
                    className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
                  >
                    <option value="">Select Sub Division</option>
                    {subDivisions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary w-full py-2.5 disabled:opacity-70"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <Lock className="w-4 h-4 text-muted-foreground" />
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
                    className="w-full px-3 py-2.5 pr-10 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-all"
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
              className="btn-primary w-full py-2.5 disabled:opacity-70"
            >
              {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-4 h-4" /> Update Password</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
