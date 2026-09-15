import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background dot-grid">
      {/* Main content — centered */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center animate-fade-up max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="p-3 rounded-2xl border border-border bg-card shadow-sm">
              <Image
                src="/logo.jpg"
                alt="TPAS Logo"
                width={56}
                height={56}
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            TPAS
          </h1>
          <p className="text-lg text-muted-foreground mt-1 font-medium">
            Kanniyakumari
          </p>

          {/* Divider */}
          <div className="w-8 h-px bg-border mx-auto my-6" />

          {/* Subtitle */}
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground mb-3">
            Digital Portal
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            A secure platform for members and administrators.
          </p>

          {/* CTA */}
          <div className="mt-10">
            <Link
              href="/login"
              className="btn-primary text-sm px-8 py-3"
            >
              Enter Portal
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="pb-8 pt-4 px-6 text-center">
        <p className="text-xs text-muted-foreground/60">
          Member Access{' '}
          <span className="mx-2 text-border">·</span>
          {' '}Administration{' '}
          <span className="mx-2 text-border">·</span>
          {' '}Support
        </p>
        <p className="text-xs text-muted-foreground/40 mt-2">
          © {new Date().getFullYear()} TPAS Kanniyakumari
        </p>
      </footer>
    </div>
  );
}
