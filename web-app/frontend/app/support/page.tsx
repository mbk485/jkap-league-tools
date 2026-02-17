'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  createSupportTicket,
  getUserTickets,
  getTicketComments,
  addTicketComment,
  DBSupportTicket,
  DBTicketComment,
} from '@/lib/supabase';
import {
  ArrowLeft,
  Bug,
  Lightbulb,
  HelpCircle,
  User,
  MoreHorizontal,
  Send,
  Upload,
  X,
  Image as ImageIcon,
  Video,
  File,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Plus,
  ChevronDown,
  ChevronRight,
  Loader2,
  Paperclip,
  AlertTriangle,
  Inbox,
} from 'lucide-react';

const TICKET_TYPES = [
  { id: 'bug', label: 'Bug Report', icon: Bug, description: 'Something isn\'t working right', color: 'text-red-400' },
  { id: 'feature', label: 'Feature Request', icon: Lightbulb, description: 'Suggest a new feature', color: 'text-amber-400' },
  { id: 'question', label: 'Question', icon: HelpCircle, description: 'Need help with something', color: 'text-blue-400' },
  { id: 'account', label: 'Account Issue', icon: User, description: 'Login, profile, or team issues', color: 'text-purple-400' },
  { id: 'other', label: 'Other', icon: MoreHorizontal, description: 'Something else', color: 'text-slate-400' },
] as const;

const PRIORITY_OPTIONS = [
  { id: 'low', label: 'Low', description: 'Not urgent', color: 'text-slate-400 bg-slate-500/10' },
  { id: 'medium', label: 'Medium', description: 'Normal priority', color: 'text-blue-400 bg-blue-500/10' },
  { id: 'high', label: 'High', description: 'Important issue', color: 'text-amber-400 bg-amber-500/10' },
  { id: 'urgent', label: 'Urgent', description: 'Critical problem', color: 'text-red-400 bg-red-500/10' },
];

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  in_progress: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  waiting: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  resolved: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  closed: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  waiting: 'Waiting for Response',
  resolved: 'Resolved',
  closed: 'Closed',
};

interface FilePreview {
  file: File;
  preview: string;
  type: 'image' | 'video' | 'other';
}

export default function SupportPage() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'new' | 'tickets'>('new');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [ticketType, setTicketType] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [attachments, setAttachments] = useState<FilePreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Tickets state
  const [tickets, setTickets] = useState<DBSupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<DBSupportTicket | null>(null);
  const [ticketComments, setTicketComments] = useState<DBTicketComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Load user's tickets
  useEffect(() => {
    if (user?.id) {
      loadTickets();
    }
  }, [user?.id]);

  const loadTickets = async () => {
    if (!user?.id) return;
    setIsLoadingTickets(true);
    const userTickets = await getUserTickets(user.id);
    setTickets(userTickets);
    setIsLoadingTickets(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: FilePreview[] = [];
    Array.from(files).forEach(file => {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError(`File "${file.name}" is too large. Max size is 10MB.`);
        return;
      }

      const fileType = file.type.startsWith('image/') ? 'image' 
        : file.type.startsWith('video/') ? 'video' 
        : 'other';

      const preview = fileType === 'image' || fileType === 'video'
        ? URL.createObjectURL(file)
        : '';

      newAttachments.push({ file, preview, type: fileType });
    });

    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const updated = [...prev];
      if (updated[index].preview) {
        URL.revokeObjectURL(updated[index].preview);
      }
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketType || !subject || !description) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // For now, we'll store attachments as base64 or skip upload if no storage bucket
      // In production, you'd upload to Supabase storage first
      const attachmentUrls: string[] = [];
      
      // Create the ticket
      const result = await createSupportTicket({
        user_id: user?.id,
        username: user?.username || 'Anonymous',
        email: user?.email,
        ticket_type: ticketType as any,
        subject,
        description,
        priority: priority as any,
        attachments: attachmentUrls,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Success!
      setSubmitSuccess(true);
      setTicketType('');
      setSubject('');
      setDescription('');
      setPriority('medium');
      setAttachments([]);
      
      // Reload tickets
      loadTickets();

      // Reset success message after delay
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit ticket');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTicketComments = async (ticketId: string) => {
    const comments = await getTicketComments(ticketId);
    setTicketComments(comments);
  };

  const handleSelectTicket = async (ticket: DBSupportTicket) => {
    setSelectedTicket(ticket);
    await loadTicketComments(ticket.id);
  };

  const handleSubmitComment = async () => {
    if (!selectedTicket || !newComment.trim() || !user) return;
    
    setIsSubmittingComment(true);
    const result = await addTicketComment({
      ticket_id: selectedTicket.id,
      user_id: user.id,
      username: user.displayName || user.username,
      is_admin: false,
      comment: newComment,
    });

    if (result.success) {
      setNewComment('');
      await loadTicketComments(selectedTicket.id);
    }
    setIsSubmittingComment(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back</span>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-jkap-red-500 to-jkap-red-600 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-display text-xl text-foreground">SUPPORT CENTER</h1>
                  <p className="text-xs text-muted-foreground">Report bugs & request features</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('new')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'new'
                ? 'bg-jkap-red-500 text-white'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'tickets'
                ? 'bg-jkap-red-500 text-white'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Inbox className="w-4 h-4" />
            My Tickets
            {tickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-white/20">
                {tickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length}
              </span>
            )}
          </button>
        </div>

        {/* Success Message */}
        {submitSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <div>
              <p className="font-medium text-emerald-400">Ticket Submitted!</p>
              <p className="text-sm text-emerald-400/80">We'll get back to you as soon as possible.</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <div className="flex-1">
              <p className="text-red-400">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* New Ticket Form */}
        {activeTab === 'new' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Ticket Type Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                What type of issue is this? <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TICKET_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setTicketType(type.id)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        ticketType === type.id
                          ? 'border-jkap-red-500 bg-jkap-red-500/10'
                          : 'border-border bg-card hover:border-border/80 hover:bg-muted/50'
                      }`}
                    >
                      <Icon className={`w-6 h-6 mb-2 ${type.color}`} />
                      <p className="font-medium text-foreground text-sm">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Subject <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of the issue..."
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-jkap-red-500"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe the issue in detail. Include steps to reproduce if it's a bug..."
                rows={6}
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-jkap-red-500 resize-none"
                required
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Priority
              </label>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPriority(opt.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      priority === opt.id
                        ? opt.color + ' border border-current'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Attachments */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Attachments
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                Upload screenshots or screen recordings to help us understand the issue (max 10MB each)
              </p>
              
              {/* File Input */}
              <div className="flex items-center gap-3 mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4" />
                  Upload Files
                </Button>
                <span className="text-xs text-muted-foreground">
                  Supports images (PNG, JPG, GIF) and videos (MP4, WebM)
                </span>
              </div>

              {/* Attachment Previews */}
              {attachments.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {attachments.map((att, index) => (
                    <div key={index} className="relative group rounded-lg overflow-hidden bg-muted border border-border">
                      {att.type === 'image' ? (
                        <img src={att.preview} alt="" className="w-full h-32 object-cover" />
                      ) : att.type === 'video' ? (
                        <video src={att.preview} className="w-full h-32 object-cover" />
                      ) : (
                        <div className="w-full h-32 flex items-center justify-center">
                          <File className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="p-2 rounded-full bg-red-500 text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/70 text-xs text-white truncate">
                        {att.file.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-4">
              <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Ticket
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* My Tickets */}
        {activeTab === 'tickets' && (
          <div className="space-y-4">
            {isLoadingTickets ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : tickets.length === 0 ? (
              <Card className="p-8 text-center">
                <Inbox className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No support tickets yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Submit a ticket if you need help!
                </p>
              </Card>
            ) : selectedTicket ? (
              // Ticket Detail View
              <div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to tickets
                </button>

                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">{selectedTicket.subject}</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Submitted {formatDate(selectedTicket.created_at)}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[selectedTicket.status]}`}>
                        {STATUS_LABELS[selectedTicket.status]}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Original Description */}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                      <div className="p-4 rounded-lg bg-muted/50 text-foreground whitespace-pre-wrap">
                        {selectedTicket.description}
                      </div>
                    </div>

                    {/* Resolution (if resolved) */}
                    {selectedTicket.resolution && (
                      <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <p className="text-sm font-medium text-emerald-400 mb-2">Resolution</p>
                        <p className="text-foreground">{selectedTicket.resolution}</p>
                      </div>
                    )}

                    {/* Comments Thread */}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-3">Conversation</p>
                      <div className="space-y-3 mb-4">
                        {ticketComments.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No replies yet</p>
                        ) : (
                          ticketComments.map(comment => (
                            <div
                              key={comment.id}
                              className={`p-4 rounded-lg ${
                                comment.is_admin
                                  ? 'bg-jkap-red-500/10 border border-jkap-red-500/30'
                                  : 'bg-muted/50'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`font-medium text-sm ${comment.is_admin ? 'text-jkap-red-400' : 'text-foreground'}`}>
                                  {comment.username}
                                </span>
                                {comment.is_admin && (
                                  <span className="px-1.5 py-0.5 rounded text-xs bg-jkap-red-500/20 text-jkap-red-400">Staff</span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(comment.created_at)}
                                </span>
                              </div>
                              <p className="text-foreground whitespace-pre-wrap">{comment.comment}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add Comment (if not closed) */}
                      {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
                        <div className="flex gap-3">
                          <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a reply..."
                            rows={2}
                            className="flex-1 px-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-jkap-red-500 resize-none"
                          />
                          <Button
                            variant="primary"
                            onClick={handleSubmitComment}
                            disabled={!newComment.trim() || isSubmittingComment}
                          >
                            {isSubmittingComment ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              // Ticket List
              tickets.map(ticket => (
                <Card
                  key={ticket.id}
                  className="p-4 cursor-pointer hover:border-jkap-red-500/50 transition-colors"
                  onClick={() => handleSelectTicket(ticket)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[ticket.status]}`}>
                          {STATUS_LABELS[ticket.status]}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {ticket.ticket_type}
                        </span>
                      </div>
                      <h3 className="font-medium text-foreground truncate">{ticket.subject}</h3>
                      <p className="text-sm text-muted-foreground truncate">{ticket.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDate(ticket.created_at)}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
