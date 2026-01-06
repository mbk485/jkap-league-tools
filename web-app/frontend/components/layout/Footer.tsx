'use client';

import React from 'react';
import Link from 'next/link';
import { externalLinks } from '@/types/league';
import { Twitter, Facebook, Instagram, MessageCircle } from 'lucide-react';

const footerLinks = {
  league: [
    { label: 'About', href: '/about' },
    { label: 'Rules', href: '/documents' },
    { label: 'Standings', href: '/standings' },
    { label: 'Free Agents', href: '/free-agents' },
    { label: 'Documents', href: '/documents' },
  ],
  owners: [
    { label: 'The Ballyard', href: '/dashboard' },
    { label: 'Join Our League', href: externalLinks.joinLeague, external: true },
    { label: 'Subscription', href: '/subscription' },
    { label: 'Support', href: '/support' },
  ],
  legal: [
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
  ],
};

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-jkap-red-500 to-jkap-red-600 flex items-center justify-center">
                <span className="font-display text-white text-lg">JK</span>
              </div>
              <div>
                <span className="font-display text-lg text-foreground">
                  JKAP MEMORIAL
                </span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              The premier MLB The Show online league experience. Compete, manage, and dominate.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              <a
                href={externalLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href={externalLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href={externalLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              {externalLinks.discord && (
                <a
                  href={externalLinks.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
                  aria-label="Discord"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* League Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">League</h4>
            <ul className="space-y-2">
              {footerLinks.league.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Owners Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">For Owners</h4>
            <ul className="space-y-2">
              {footerLinks.owners.map((link) => (
                <li key={link.href + link.label}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                    >
                      {link.label}
                      <span className="text-xs">↗</span>
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            
            {/* Contact CTA */}
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Have questions?</p>
              <a
                href={externalLinks.contactForm}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-jkap-red-500 hover:text-jkap-red-400 transition-colors font-medium"
              >
                Contact Us →
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} JKAP Memorial League. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground/60 text-center sm:text-right">
            Celebrating the legacy of Jason Kingsley & Anthony Perez.
            <br className="sm:hidden" />
            <span className="hidden sm:inline"> • </span>
            Not affiliated with San Diego Studio, Sony Interactive Entertainment, or MLB.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
