'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MessageSquare, X, Bug, Lightbulb, HelpCircle, Send } from 'lucide-react';

export default function SupportButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Quick Menu (when open) */}
        {isOpen && (
          <div className="absolute bottom-16 right-0 mb-2 animate-slide-in-up">
            <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 w-72">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg text-foreground">NEED HELP?</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              
              <div className="space-y-2">
                <Link
                  href="/support?type=bug"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Bug className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm group-hover:text-jkap-red-400 transition-colors">Report a Bug</p>
                    <p className="text-xs text-muted-foreground">Something not working?</p>
                  </div>
                </Link>

                <Link
                  href="/support?type=feature"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm group-hover:text-jkap-red-400 transition-colors">Suggest a Feature</p>
                    <p className="text-xs text-muted-foreground">Have an idea?</p>
                  </div>
                </Link>

                <Link
                  href="/support?type=question"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm group-hover:text-jkap-red-400 transition-colors">Ask a Question</p>
                    <p className="text-xs text-muted-foreground">Need help?</p>
                  </div>
                </Link>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <Link
                  href="/support"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-jkap-red-400 hover:text-jkap-red-300 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  View All Support Options
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Main Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all transform hover:scale-110 ${
            isOpen
              ? 'bg-muted text-foreground rotate-0'
              : 'bg-gradient-to-br from-jkap-red-500 to-jkap-red-600 text-white'
          }`}
          aria-label="Support"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <MessageSquare className="w-6 h-6" />
          )}
        </button>
        
        {/* Pulse animation when closed */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-jkap-red-500 animate-ping opacity-20 pointer-events-none" />
        )}
      </div>
    </>
  );
}
