'use client';

import { useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatDate, getInitials } from '@/lib/utils';
import { Download, CreditCard, Printer } from 'lucide-react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

export default function DigitalIdPage() {
  const { member } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    window.print();
    toast.success('Print dialog opened!');
  }

  function handleDownload() {
    toast.info('Save the page as PDF using your browser print dialog (Ctrl+P / Cmd+P).');
    window.print();
  }

  if (!member) return null;

  const qrValue = `TPAS-MEMBER:${member.employee_id}:${member.name}:${member.role}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Digital Member ID</h2>
        <p className="text-sm text-muted-foreground">Your official TPAS Kanniyakumari membership card</p>
      </div>

      {/* ID Card Preview */}
      <div className="flex justify-center">
        <div
          id="printable"
          ref={cardRef}
          className="w-96 rounded-2xl overflow-hidden shadow-xl border border-border relative bg-foreground"
        >
          {/* Header */}
          <div className="relative px-6 pt-6 pb-4 text-center border-b border-white/10">
            <div className="relative z-10 flex items-center justify-center gap-3 mb-2">
              <Image src="/images/logo.jpg" alt="TPAS Logo" width={36} height={36} className="rounded-lg" />
              <div className="text-left">
                <p className="text-white font-bold text-sm leading-tight">TPAS</p>
                <p className="text-white/60 text-xs">Kanniyakumari</p>
              </div>
            </div>
            <p className="text-white/50 text-xs font-medium tracking-widest uppercase">Member Identity Card</p>
          </div>

          {/* Body */}
          <div className="px-6 py-5 flex gap-5">
            {/* Photo */}
            <div className="shrink-0">
              <div className="w-20 h-24 rounded-xl bg-white/10 border-2 border-white/20 flex items-center justify-center text-white text-2xl font-bold overflow-hidden shadow-lg">
                {member.photo_url
                  ? <img src={member.photo_url} alt="" className="w-full h-full object-cover" />
                  : getInitials(member.name)}
              </div>
              <div className="mt-2 text-center">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/15 text-white/80">
                  {member.role}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-bold text-lg leading-tight truncate">{member.name}</h2>
              <p className="text-white/70 text-sm font-mono font-semibold mt-0.5">{member.employee_id}</p>
              <div className="mt-3 space-y-1.5">
                {[
                  { label: 'Division', value: member.division ?? '—' },
                  { label: 'Sub Division', value: member.sub_division ?? '—' },
                  { label: 'Member Since', value: formatDate(member.joining_date) },
                  { label: 'Status', value: member.status },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-1">
                    <span className="text-white/50 text-xs w-24 shrink-0">{label}:</span>
                    <span className="text-white text-xs font-medium truncate">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* QR Code + Footer */}
          <div className="px-6 pb-6 flex items-end justify-between">
            <div>
              <div className="bg-white p-1.5 rounded-lg inline-block shadow-lg">
                <QRCodeSVG
                  value={qrValue}
                  size={72}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#171717"
                />
              </div>
              <p className="text-white/40 text-xs mt-1.5 text-center">Scan to verify</p>
            </div>
            <div className="text-right">
              <p className="text-white/40 text-xs">Valid for</p>
              <p className="text-white text-sm font-bold">{new Date().getFullYear()}</p>
              <div className="mt-2 w-16 h-0.5 bg-white/20 ml-auto" />
              <p className="text-white/30 text-xs mt-1">Authorized Signature</p>
            </div>
          </div>

          {/* Bottom stripe */}
          <div className="h-1.5 bg-white/20" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center flex-wrap">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-3 bg-card border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-all"
        >
          <Printer className="w-4 h-4" />
          Print Card
        </button>
        <button
          onClick={handleDownload}
          className="btn-primary px-6 py-3"
        >
          <Download className="w-4 h-4" />
          Download as PDF
        </button>
      </div>

      {/* Info */}
      <div className="bg-muted border border-border rounded-xl p-4">
        <div className="flex items-start gap-2">
          <CreditCard className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">About your Digital ID</p>
            <p className="text-xs text-muted-foreground mt-1">
              This digital ID card is your official TPAS Kanniyakumari membership credential. 
              The QR code can be scanned to verify your membership details. 
              Use Ctrl+P (Cmd+P on Mac) to save as PDF for printing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
