import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Mic, Paperclip, X, Image as ImageIcon, FileText, Video, Folder, Globe, Brain, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { Attachment } from '../types';

interface InputHubProps {
  onSendMessage: (content: string, attachments: any[]) => void;
  isLoading: boolean;
}

export default function InputHub({ onSendMessage, isLoading }: InputHubProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!content.trim() && attachments.length === 0) return;
    onSendMessage(content, attachments);
    setContent('');
    setAttachments([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      // Limit file size to 10MB for this demo to avoid browser memory issues with base64
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Max size is 10MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachments(prev => [...prev, {
          name: file.name,
          type: file.type,
          size: file.size,
          base64: reader.result as string
        }]);
      };
      reader.readAsDataURL(file);
    });
    setIsMenuOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setContent(prev => prev + ' ' + transcript);
    };

    recognition.start();
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [content]);

  return (
    <div className="p-4 sm:p-6 bg-gradient-to-t from-black via-black/80 to-transparent relative z-10">
      <div className="max-w-4xl mx-auto relative">
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex flex-wrap gap-2 sm:gap-3 mb-4 p-3 sm:p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl"
            >
              {attachments.map((att, i) => (
                <div key={i} className="group relative p-2 bg-black/40 rounded-xl border border-white/10 flex items-center gap-3">
                  {att.type.startsWith('image/') ? (
                    <img src={att.base64} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover" alt="Preview" />
                  ) : att.type.startsWith('video/') ? (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                      <Video size={14} className="text-blue-400 sm:size-16" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/5 rounded-lg flex items-center justify-center">
                      <FileText size={14} className="text-emerald-400 sm:size-16" />
                    </div>
                  )}
                  <div className="text-[10px] pr-8">
                    <p className="font-bold truncate max-w-[80px] sm:max-w-[100px]">{att.name}</p>
                    <p className="text-zinc-500">{(att.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 p-1 hover:bg-red-500/20 text-red-500 rounded-full transition-colors"
                  >
                    <X size={10} className="sm:size-12" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex items-end gap-2 sm:gap-4 bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-2 sm:p-3 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={cn(
                "p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all group",
                isMenuOpen ? "bg-emerald-500 text-black" : "hover:bg-white/5 text-zinc-400"
              )}
            >
              <Paperclip size={18} className={cn("sm:size-20", isMenuOpen ? "rotate-45" : "group-hover:rotate-12")} />
            </button>
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: -10 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  className="absolute bottom-full left-0 mb-4 bg-[#0a0a0a] border border-white/10 rounded-2xl p-2 min-w-[180px] shadow-2xl z-50"
                >
                  <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl text-sm text-zinc-400 hover:text-white transition-colors">
                    <ImageIcon size={16} className="text-emerald-400" />
                    Images
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl text-sm text-zinc-400 hover:text-white transition-colors">
                    <Video size={16} className="text-blue-400" />
                    Videos
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl text-sm text-zinc-400 hover:text-white transition-colors">
                    <FileText size={16} className="text-orange-400" />
                    Documents
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl text-sm text-zinc-400 hover:text-white transition-colors">
                    <Folder size={16} className="text-yellow-400" />
                    Folders
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Initialize command sequence..."
            className="flex-1 bg-transparent border-none outline-none py-2 sm:py-3 text-sm text-zinc-200 placeholder:text-zinc-600 resize-none custom-scrollbar"
          />

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={startRecording}
              className={cn(
                "p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all relative overflow-hidden group",
                isRecording ? "bg-red-500/20 text-red-500" : "hover:bg-white/5 text-zinc-400"
              )}
            >
              <Mic size={18} className={cn("sm:size-20", isRecording && "animate-pulse")} />
              {isRecording && (
                <motion.div
                  layoutId="waveform"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-red-500"
                  animate={{ scaleY: [1, 2, 1] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                />
              )}
            </button>

            <button
              onClick={handleSend}
              disabled={isLoading || (!content.trim() && attachments.length === 0)}
              className={cn(
                "p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all shadow-lg",
                isLoading || (!content.trim() && attachments.length === 0)
                  ? "bg-white/5 text-zinc-600 cursor-not-allowed"
                  : "bg-emerald-500 text-black hover:bg-emerald-400 hover:scale-105 active:scale-95 shadow-emerald-500/20"
              )}
            >
              <Send size={18} className="sm:size-20" />
            </button>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept="image/*,video/*,application/pdf,text/*"
          className="hidden"
        />

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[8px] sm:text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
          <div className="flex items-center gap-1 sm:gap-2">
            <Globe size={10} className="text-blue-500 sm:size-12" />
            Search Grounding
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Brain size={10} className="text-emerald-500 sm:size-12" />
            Thinking Mode
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Sparkles size={10} className="text-yellow-500 sm:size-12" />
            Multimodal Core
          </div>
        </div>
      </div>
    </div>
  );
}
