import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Headphones,
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  PhoneForwarded,
  PhoneOff,
  Send,
  UserCheck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  SUPPORT_CALL_TOPICS,
  SUPPORT_REPRESENTATIVES,
} from '../data/supportData';
import { PhoneAudioEngine } from '../utils/phoneAudio';
import type {
  AuthenticatedUser,
  CameraPreset,
  SupportCallMessage,
  SupportRepresentative,
  ThemeMode,
} from '../types';

interface SupportHandoverModalProps {
  open: boolean;
  onClose: () => void;
  user: AuthenticatedUser;
  theme: ThemeMode;
  cameraPreset: CameraPreset;
  initialTopic?: string;
  sourceContext?: 'scholar-modal' | 'sidebar' | 'desk' | 'general';
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function SupportHandoverModal({
  open,
  onClose,
  user,
  theme,
  cameraPreset,
  initialTopic = '',
  sourceContext = 'general',
}: SupportHandoverModalProps) {
  const [selectedRep, setSelectedRep] = useState<SupportRepresentative>(
    SUPPORT_REPRESENTATIVES[0],
  );
  const [callStatus, setCallStatus] = useState<
    'idle' | 'initiating' | 'ringing' | 'connected' | 'ended'
  >('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [userSpeechInput, setUserSpeechInput] = useState('');
  const [isRepSpeaking, setIsRepSpeaking] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const [callMessages, setCallMessages] = useState<SupportCallMessage[]>([]);
  const [selectedTopic, setSelectedTopic] = useState(
    initialTopic || SUPPORT_CALL_TOPICS[0],
  );

  const phoneAudioRef = useRef<PhoneAudioEngine | null>(null);
  const durationTimerRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const speechInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize Web Audio telephone engine
  useEffect(() => {
    const engine = new PhoneAudioEngine();
    phoneAudioRef.current = engine;
    return () => {
      engine.dispose();
      phoneAudioRef.current = null;
    };
  }, []);

  // Sync initial topic when reopened
  useEffect(() => {
    if (initialTopic) {
      setSelectedTopic(initialTopic);
    }
  }, [initialTopic]);

  // Clean up duration timer on unmount
  useEffect(() => {
    return () => {
      if (durationTimerRef.current) {
        window.clearInterval(durationTimerRef.current);
      }
    };
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [callMessages, isRepSpeaking]);

  // Call timer interval when connected
  useEffect(() => {
    if (callStatus === 'connected') {
      durationTimerRef.current = window.setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        window.clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
    return () => {
      if (durationTimerRef.current) {
        window.clearInterval(durationTimerRef.current);
      }
    };
  }, [callStatus]);

  // Start real audio handover phone call
  const handleStartCall = async (rep: SupportRepresentative) => {
    setSelectedRep(rep);
    setErrorNotice(null);
    setCallStatus('initiating');
    setCallDuration(0);
    setIsMuted(false);

    // Initial system notice
    const callerFirstName = user.name ? user.name.split(' ')[0] : 'friend';
    setCallMessages([
      {
        id: `sys-${Date.now()}`,
        sender: 'system',
        text: `Calling ${rep.name} (${rep.directPhone} ${rep.extension}). Handing over from Sylva Sanctuary study session...`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    // Play ringing tone
    window.setTimeout(() => {
      setCallStatus('ringing');
      if (isSpeakerOn) {
        phoneAudioRef.current?.startRinging();
      }
    }, 600);

    // Representative answers after realistic 2-ring cadence (~3.2 seconds)
    window.setTimeout(() => {
      phoneAudioRef.current?.stopRinging();
      if (isSpeakerOn) {
        phoneAudioRef.current?.playConnectChime();
      }
      setCallStatus('connected');

      const welcomeGreeting =
        sourceContext === 'scholar-modal'
          ? `Hello ${callerFirstName}! This is ${rep.name} at Sylva Sanctuary. Professor Linnea let me know you requested human support. I can see you're currently in the study room—how can I help with your inquiry today?`
          : `Hello ${callerFirstName}, thank you for calling Sylva Sanctuary. My name is ${rep.name}. I'm here at our conservatory desk and ready to assist you. How can I help you today?`;

      setIsRepSpeaking(true);
      window.setTimeout(() => {
        setCallMessages((prev) => [
          ...prev,
          {
            id: `rep-${Date.now()}`,
            sender: 'agent',
            text: welcomeGreeting,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setIsRepSpeaking(false);
        speechInputRef.current?.focus();
      }, 700);
    }, 3800);
  };

  // User speaks / sends message on the live call
  const handleSendMessage = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || isRepSpeaking || callStatus !== 'connected') return;

    if (isMuted) {
      setErrorNotice('Your microphone is currently muted. Unmute to speak with the representative.');
      return;
    }

    setErrorNotice(null);
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: SupportCallMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: nowTime,
    };

    setCallMessages((prev) => [...prev, userMsg]);
    setUserSpeechInput('');
    setIsRepSpeaking(true);

    try {
      const response = await fetch('/api/support-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: callMessages.slice(-6).map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
          representative: selectedRep,
          userName: user.name,
          theme,
          cameraPreset,
        }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };

      if (!response.ok || !data.reply) {
        throw new Error(data.error || 'Audio link crackled. Please try repeating.');
      }

      const replyString: string = data.reply;

      setCallMessages((prev) => [
        ...prev,
        {
          id: `rep-${Date.now()}`,
          sender: 'agent',
          text: replyString,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Audio connection issue.';
      setErrorNotice(msg);
    } finally {
      setIsRepSpeaking(false);
    }
  };

  // Hang up the live call
  const handleEndCall = () => {
    phoneAudioRef.current?.stopRinging();
    if (isSpeakerOn && callStatus === 'connected') {
      phoneAudioRef.current?.playDisconnectTone();
    }
    setCallStatus('ended');
    setCallMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        sender: 'system',
        text: `Call ended · Duration: ${formatDuration(callDuration)}. Thank you for contacting Sylva Sanctuary support.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Reset to initiate new call
  const handleResetToCallMenu = () => {
    phoneAudioRef.current?.stopRinging();
    setCallStatus('idle');
    setCallDuration(0);
    setErrorNotice(null);
  };

  const handleCloseModal = () => {
    if (callStatus === 'ringing' || callStatus === 'connected') {
      handleEndCall();
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="handover-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-md pointer-events-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 14 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="glass-card-surface relative w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col max-h-[92vh] border shadow-2xl"
            style={{
              borderColor: 'var(--border-glass)',
            }}
          >
            {/* Specular hairline top accent */}
            <div
              aria-hidden="true"
              className="chat-header-specular pointer-events-none absolute inset-x-8 top-0 h-px"
            />

            {/* Header */}
            <div className="chat-divider-subtle border-b px-6 py-4 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: 'var(--bg-glass-subtle)',
                    border: '1px solid var(--border-glass)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="handover-title"
                    className="font-display text-lg font-semibold tracking-tight truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Human Support Handover
                  </h2>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    Direct Audio Call with Sylva Sanctuary Curators &amp; Specialists
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {callStatus === 'connected' && (
                  <div
                    className="px-3 py-1 rounded-full text-xs font-mono font-medium flex items-center gap-2 border"
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      borderColor: 'rgba(16, 185, 129, 0.35)',
                      color: '#10b981',
                    }}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{formatDuration(callDuration)}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCloseModal}
                  aria-label="Close support handover modal"
                  className="p-2 rounded-xl cursor-pointer opacity-75 hover:opacity-100 transition-opacity"
                  style={{
                    backgroundColor: 'var(--bg-glass-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            {callStatus === 'idle' ? (
              /* ==================== SELECT SPECIALIST & INITIATE CALL ==================== */
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Intro banner */}
                <div
                  className="rounded-2xl p-4 border flex items-start gap-3.5"
                  style={{
                    backgroundColor: 'var(--bg-glass-subtle)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <Headphones
                    className="w-5 h-5 shrink-0 mt-0.5"
                    style={{ color: 'var(--accent-primary)' }}
                  />
                  <div className="space-y-1 text-xs leading-relaxed">
                    <p
                      className="font-semibold text-sm"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Need direct human assistance?
                    </p>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      Place an instant voice call to our sanctuary curators. We can guide
                      you through the 1753 botanical folios, assist with featured books,
                      troubleshoot 3D scene controls, or answer any research questions.
                    </p>
                  </div>
                </div>

                {/* Topic selection */}
                <div className="space-y-2">
                  <label
                    htmlFor="support-topic-select"
                    className="text-xs font-semibold px-1 block"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    What would you like assistance with?
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {SUPPORT_CALL_TOPICS.map((topic) => {
                      const active = selectedTopic === topic;
                      return (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => setSelectedTopic(topic)}
                          className="px-3.5 py-2.5 rounded-xl text-left text-xs font-medium transition-all flex items-center justify-between gap-3 cursor-pointer"
                          style={{
                            backgroundColor: active
                              ? 'var(--accent-primary)'
                              : 'var(--bg-glass-subtle)',
                            color: active ? 'var(--text-on-accent)' : 'var(--text-primary)',
                            border: active
                              ? '1px solid transparent'
                              : '1px solid var(--border-subtle)',
                          }}
                        >
                          <span className="truncate">{topic}</span>
                          {active && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Available Specialists */}
                <div className="space-y-2.5">
                  <p
                    className="text-xs font-semibold px-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Select Available Specialist to Call
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {SUPPORT_REPRESENTATIVES.map((rep) => {
                      const active = selectedRep.id === rep.id;
                      return (
                        <div
                          key={rep.id}
                          className="rounded-2xl p-4 border flex flex-col justify-between transition-all"
                          style={{
                            backgroundColor: active
                              ? 'rgba(27, 107, 80, 0.08)'
                              : 'var(--bg-glass-subtle)',
                            borderColor: active
                              ? 'var(--accent-primary)'
                              : 'var(--border-subtle)',
                          }}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs"
                                style={{
                                  backgroundColor: 'var(--accent-primary)',
                                  color: 'var(--text-on-accent)',
                                }}
                              >
                                {rep.avatarInitials}
                              </div>
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-medium"
                                style={{ color: '#10b981' }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Available</span>
                              </span>
                            </div>

                            <div>
                              <p
                                className="font-semibold text-xs tracking-tight"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {rep.name}
                              </p>
                              <p
                                className="text-[11px] leading-tight"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                {rep.title}
                              </p>
                            </div>

                            <p
                              className="text-[11px] leading-relaxed pt-1"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {rep.specialty}
                            </p>
                          </div>

                          <div className="pt-3 mt-3 border-t flex flex-col gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
                            <div className="text-[10px] font-mono-tabular" style={{ color: 'var(--text-muted)' }}>
                              {rep.directPhone} · {rep.extension}
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleStartCall(rep)}
                              className="btn-primary-theme w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>Call {rep.name.split(' ')[0]}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* ==================== ACTIVE LIVE PHONE CALL SCREEN ==================== */
              <div className="flex-1 flex flex-col min-h-0">
                {/* Caller & Status Bar */}
                <div
                  className="px-6 py-4 border-b flex items-center justify-between gap-4 shrink-0"
                  style={{
                    backgroundColor: 'rgba(27, 107, 80, 0.05)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-sm"
                      style={{
                        backgroundColor: 'var(--accent-primary)',
                        color: 'var(--text-on-accent)',
                      }}
                    >
                      {selectedRep.avatarInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-semibold text-sm"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {selectedRep.name}
                        </span>
                        <span
                          className="text-[11px] px-2 py-0.5 rounded-full border font-medium"
                          style={{
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {selectedRep.title}
                        </span>
                      </div>
                      <p
                        className="text-xs flex items-center gap-2 mt-0.5"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {callStatus === 'initiating' && 'Initiating handover channel...'}
                        {callStatus === 'ringing' && 'Ringing specialist line...'}
                        {callStatus === 'connected' && (
                          <>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Live Voice Call Connected
                            </span>
                            <span>·</span>
                            <span>{selectedRep.directPhone}</span>
                          </>
                        )}
                        {callStatus === 'ended' && 'Call Completed'}
                      </p>
                    </div>
                  </div>

                  {/* Audio Controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {callStatus === 'connected' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsMuted((m) => !m)}
                          aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                          className="p-2.5 rounded-xl cursor-pointer transition-colors border"
                          style={{
                            backgroundColor: isMuted
                              ? 'rgba(239, 68, 68, 0.15)'
                              : 'var(--bg-glass-subtle)',
                            borderColor: isMuted
                              ? 'rgba(239, 68, 68, 0.4)'
                              : 'var(--border-subtle)',
                            color: isMuted ? '#ef4444' : 'var(--text-secondary)',
                          }}
                        >
                          {isMuted ? (
                            <MicOff className="w-4 h-4" />
                          ) : (
                            <Mic className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsSpeakerOn((s) => !s)}
                          aria-label={isSpeakerOn ? 'Mute speaker' : 'Enable speaker'}
                          title={isSpeakerOn ? 'Speaker ON' : 'Speaker MUTED'}
                          className="p-2.5 rounded-xl cursor-pointer transition-colors border"
                          style={{
                            backgroundColor: 'var(--bg-glass-subtle)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {isSpeakerOn ? (
                            <Volume2 className="w-4 h-4" />
                          ) : (
                            <VolumeX className="w-4 h-4" />
                          )}
                        </button>
                      </>
                    )}

                    {callStatus === 'connected' || callStatus === 'ringing' ? (
                      <button
                        type="button"
                        onClick={handleEndCall}
                        className="h-10 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm whitespace-nowrap"
                      >
                        <PhoneOff className="w-3.5 h-3.5" />
                        <span>Hang Up</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResetToCallMenu}
                        className="btn-primary-theme h-10 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <PhoneForwarded className="w-3.5 h-3.5" />
                        <span>Call Another Specialist</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Call Transcript & Live Voice Waveform */}
                <div
                  ref={scrollContainerRef}
                  className="flex-1 overflow-y-auto p-6 space-y-4"
                >
                  {callMessages.map((msg) => {
                    if (msg.sender === 'system') {
                      return (
                        <div
                          key={msg.id}
                          className="text-center my-2 text-[11px] px-3 py-1.5 rounded-xl border max-w-md mx-auto"
                          style={{
                            backgroundColor: 'var(--bg-glass-subtle)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {msg.text}
                        </div>
                      );
                    }

                    const isUser = msg.sender === 'user';
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px]">
                          <span
                            className="font-semibold"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {isUser ? user.name || 'You' : selectedRep.name}
                          </span>
                          <span aria-hidden="true" style={{ color: 'var(--text-muted)' }}>
                            ·
                          </span>
                          <span
                            className="font-mono-tabular"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {msg.timestamp}
                          </span>
                        </div>

                        <div
                          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[85%] ${
                            isUser ? 'chat-bubble-user' : 'chat-bubble-scholar'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Representative Speaking waveform animation */}
                  {isRepSpeaking && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-start"
                    >
                      <span
                        className="text-[11px] font-semibold mb-1 px-1"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {selectedRep.name} · Speaking
                      </span>
                      <div
                        className="rounded-2xl px-4 py-3 text-xs flex items-center gap-3 border"
                        style={{
                          backgroundColor: 'var(--bg-chat-bubble-scholar)',
                          borderColor: 'var(--border-glass)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span className="w-1 h-3 bg-emerald-500 rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-1 h-5 bg-emerald-500 rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-1 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:300ms]" />
                          <span className="w-1 h-4 bg-emerald-500 rounded-full animate-bounce [animation-delay:450ms]" />
                        </div>
                        <span className="italic">Speaking over the phone line...</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Ringing indicator */}
                  {callStatus === 'ringing' && (
                    <div className="flex flex-col items-center justify-center py-10 space-y-3">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 animate-ping absolute inset-0" />
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center relative shadow-lg"
                          style={{
                            backgroundColor: 'var(--accent-primary)',
                            color: 'var(--text-on-accent)',
                          }}
                        >
                          <Phone className="w-8 h-8 animate-pulse" />
                        </div>
                      </div>
                      <div className="text-center space-y-1">
                        <p
                          className="font-semibold text-sm"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          Ringing {selectedRep.name}...
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Connecting your study session to human support
                        </p>
                      </div>
                    </div>
                  )}

                  {errorNotice && (
                    <div
                      role="alert"
                      className="chat-error-banner rounded-2xl px-4 py-2.5 text-xs flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorNotice}</span>
                    </div>
                  )}
                </div>

                {/* Question / Speech Bar while Call is Active */}
                {callStatus === 'connected' && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleSendMessage(userSpeechInput);
                    }}
                    className="p-4 border-t flex items-center gap-2.5 shrink-0"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <input
                      ref={speechInputRef}
                      type="text"
                      value={userSpeechInput}
                      onChange={(e) => setUserSpeechInput(e.target.value)}
                      disabled={isRepSpeaking || isMuted}
                      placeholder={
                        isMuted
                          ? 'Microphone muted. Click the mic icon above to speak...'
                          : `Speak or type your question for ${selectedRep.name.split(' ')[0]}...`
                      }
                      aria-label="Speak to support specialist"
                      className="glass-input flex-1 px-4 py-3 rounded-xl text-sm disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={isRepSpeaking || isMuted || !userSpeechInput.trim()}
                      className="btn-primary-theme h-11 px-5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap"
                    >
                      <span>Speak</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
