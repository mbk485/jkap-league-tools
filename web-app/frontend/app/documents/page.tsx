'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { leagueDocuments, DocumentCategory } from '@/types/league';
import {
  FileText,
  Download,
  ExternalLink,
  Eye,
  Filter,
  BookOpen,
  ArrowLeftRight,
  DollarSign,
  Calendar,
  Users,
  Shield,
  Sparkles,
} from 'lucide-react';

const categoryConfig: Record<DocumentCategory, { label: string; icon: React.ReactNode; color: string }> = {
  rules: { label: 'Rules', icon: <BookOpen className="w-4 h-4" />, color: 'text-blue-400' },
  trading: { label: 'Trading', icon: <ArrowLeftRight className="w-4 h-4" />, color: 'text-purple-400' },
  finance: { label: 'Finance', icon: <DollarSign className="w-4 h-4" />, color: 'text-green-400' },
  schedule: { label: 'Schedule', icon: <Calendar className="w-4 h-4" />, color: 'text-amber-400' },
  roster: { label: 'Roster', icon: <Users className="w-4 h-4" />, color: 'text-cyan-400' },
  administration: { label: 'Administration', icon: <Shield className="w-4 h-4" />, color: 'text-jkap-red-400' },
  offseason: { label: 'Off-Season', icon: <Sparkles className="w-4 h-4" />, color: 'text-orange-400' },
};

export default function DocumentsPage() {
  const [activeCategory, setActiveCategory] = useState<DocumentCategory | 'all'>('all');
  
  const filteredDocuments = activeCategory === 'all' 
    ? leagueDocuments 
    : leagueDocuments.filter(doc => doc.category === activeCategory);

  const categories: (DocumentCategory | 'all')[] = ['all', 'rules', 'trading', 'finance', 'schedule', 'roster', 'administration', 'offseason'];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-4xl sm:text-5xl text-foreground mb-2">
            LEAGUE DOCUMENTS
          </h1>
          <p className="text-muted-foreground text-lg">
            Official documents, rules, and resources for the JKAP Memorial League
          </p>
        </div>

        {/* Layout: Sidebar + Content */}
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar - Categories */}
          <div className="lg:col-span-1">
            <Card className="p-4 sticky top-24">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Categories
              </h3>
              <div className="space-y-1">
                {categories.map((category) => {
                  const isActive = activeCategory === category;
                  const config = category === 'all' 
                    ? { label: 'All Documents', icon: <FileText className="w-4 h-4" />, color: 'text-foreground' }
                    : categoryConfig[category];
                  
                  return (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-all
                        ${isActive 
                          ? 'bg-jkap-navy-500/20 text-foreground border border-jkap-navy-500/30' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }
                      `}
                    >
                      <span className={isActive ? config.color : 'text-muted-foreground'}>
                        {config.icon}
                      </span>
                      {config.label}
                      {category !== 'all' && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {leagueDocuments.filter(d => d.category === category).length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Documents Grid */}
          <div className="lg:col-span-3">
            <div className="space-y-4">
              {filteredDocuments.length === 0 ? (
                <Card className="p-8 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No documents found in this category.</p>
                </Card>
              ) : (
                filteredDocuments.map((doc) => {
                  const config = categoryConfig[doc.category];
                  
                  return (
                    <Card key={doc.id} className="p-5 hover:border-border/80">
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`p-3 rounded-xl bg-muted ${config.color}`}>
                          <FileText className="w-6 h-6" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground text-lg">
                              {doc.title}
                            </h3>
                            {doc.isNew && (
                              <Badge variant="delinquent" className="text-[10px]">NEW</Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground text-sm mb-3">
                            {doc.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <Badge variant="default" className="text-[10px]" icon={config.icon}>
                              {config.label}
                            </Badge>
                            <span>Updated: {doc.updatedAt}</span>
                            {doc.fileSize && <span>{doc.fileSize}</span>}
                            <span className="uppercase">{doc.type}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            as="link"
                            href={doc.url}
                            variant="secondary"
                            size="sm"
                            icon={<Eye className="w-4 h-4" />}
                          >
                            View
                          </Button>
                          {doc.type === 'pdf' && (
                            <Button
                              as="link"
                              href={doc.url}
                              variant="primary"
                              size="sm"
                              icon={<Download className="w-4 h-4" />}
                            >
                              Download
                            </Button>
                          )}
                          {doc.type === 'form' && (
                            <Button
                              as="link"
                              href={doc.url}
                              variant="primary"
                              size="sm"
                              icon={<ExternalLink className="w-4 h-4" />}
                            >
                              Open Form
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

