import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message, Chat } from '../types';
import { cn } from '../lib/utils';
import { Bot, User, Sparkles, Plus, Copy, Check, Video as VideoIcon, FileText as FileIcon } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  value: string;
}

const CodeBlock = ({ language, value }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isTerminal = ['bash', 'sh', 'shell', 'zsh', 'cmd', 'powershell', 'terminal'].includes(language.toLowerCase());

  return (
    <div className={cn(
      "relative group/code my-4 sm:my-6 rounded-lg sm:rounded-xl overflow-hidden border",
      isTerminal ? "border-blue-500/30 bg-black/60" : "border-white/10 bg-white/5"
    )}>
      <div className={cn(
        "flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 border-b",
        isTerminal ? "bg-blue-500/10 border-blue-500/20" : "bg-white/5 border-white/10"
      )}>
        <div className="flex items-center gap-2">
          {isTerminal && <div className="flex gap-1 mr-1.5">
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500/50" />
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-yellow-500/50" />
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-500/50" />
          </div>}
          <span className={cn(
            "text-[8px] sm:text-[10px] font-black uppercase tracking-widest",
            isTerminal ? "text-blue-400" : "text-zinc-500"
          )}>
            {language || (isTerminal ? 'terminal' : 'code')}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg transition-all text-[8px] sm:text-[10px] font-bold uppercase tracking-wider",
            copied 
              ? "bg-blue-500 text-black" 
              : "hover:bg-white/10 text-zinc-400 hover:text-white"
          )}
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check size={10} className="sm:w-3 sm:h-3" />
              Copied
            </>
          ) : (
            <>
              <Copy size={10} className="sm:w-3 sm:h-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="relative overflow-x-auto">
        <SyntaxHighlighter
          language={language || 'text'}
          style={atomDark}
          customStyle={{
            margin: 0,
            padding: '1rem sm:1.25rem',
            fontSize: '0.75rem sm:0.85rem',
            background: 'transparent',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  activeChat: Chat | null;
  createNewChat: () => void;
}

export default function ChatWindow({ messages, isLoading, activeChat, createNewChat }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center relative"
        >
          <Sparkles size={48} className="text-blue-400" />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl"
          />
        </motion.div>
        <div className="space-y-4">
          <h3 className="text-3xl font-black tracking-tighter">Initialize Alpha</h3>
          <p className="text-zinc-500 max-w-sm mx-auto">
            Select a session from the history or start a new conversation to begin.
          </p>
        </div>
        <button
          onClick={createNewChat}
          className="flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full font-bold hover:bg-blue-400 transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
        >
          <Plus size={20} />
          New Session
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 custom-scrollbar relative"
    >
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-12">
        <AnimatePresence mode="popLayout">
          {messages.map((msg, idx) => (
            <motion.div
              key={msg.id || idx}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex gap-3 sm:gap-6 group",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border transition-all",
                msg.role === 'user' 
                  ? "bg-blue-500/10 border-blue-500/20 text-blue-400" 
                  : "bg-white/5 border-white/10 text-zinc-400"
              )}>
                {msg.role === 'user' ? <User size={16} className="sm:w-5 sm:h-5" /> : <Bot size={16} className="sm:w-5 sm:h-5" />}
              </div>
              
              <div className={cn(
                "flex flex-col max-w-[85%] sm:max-w-[80%] space-y-2",
                msg.role === 'user' ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "px-4 sm:px-6 py-3 sm:py-4 rounded-2xl sm:rounded-3xl text-xs sm:text-sm leading-relaxed transition-all",
                  msg.role === 'user' 
                    ? "bg-blue-500/10 text-blue-50 border border-blue-500/20 rounded-tr-none" 
                    : "bg-white/5 text-zinc-200 border border-white/10 rounded-tl-none"
                )}>
                  <div className="markdown-body prose prose-invert max-w-none prose-xs sm:prose-sm">
                    <Markdown
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          const language = match ? match[1] : '';
                          
                          if (!inline) {
                            return (
                              <CodeBlock
                                language={language}
                                value={String(children).replace(/\n$/, '')}
                              />
                            );
                          }
                          
                          return (
                            <code className={cn("bg-white/10 px-1.5 py-0.5 rounded text-blue-400 font-mono text-[10px] sm:text-xs", className)} {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {msg.content}
                    </Markdown>
                  </div>
                  
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {msg.attachments.map((att, i) => (
                        <div key={i} className="p-2 bg-black/40 rounded-xl border border-white/5 flex flex-col gap-2 max-w-xs overflow-hidden">
                          {att.type.startsWith('image/') ? (
                            <img src={att.base64} className="w-full max-h-48 rounded-lg object-cover" alt="Attachment" />
                          ) : att.type.startsWith('video/') ? (
                            <video 
                              src={att.base64} 
                              controls 
                              className="w-full max-h-48 rounded-lg bg-black"
                            />
                          ) : (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 rounded-lg flex items-center justify-center">
                              <FileIcon size={14} className="sm:w-4 sm:h-4" />
                            </div>
                          )}
                          <div className="flex items-center gap-2 px-1">
                            {att.type.startsWith('video/') ? (
                              <VideoIcon size={12} className="text-blue-400" />
                            ) : (
                              <FileIcon size={12} className="text-zinc-500" />
                            )}
                            <div className="text-[10px] truncate">
                              <p className="font-bold truncate max-w-[150px]">{att.name}</p>
                              <p className="text-zinc-500">{(att.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold px-2">
                  {msg.role === 'user' ? 'Operator' : 'Alpha Core'}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 sm:gap-6"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Bot size={16} className="text-blue-400 animate-pulse sm:w-5 sm:h-5" />
            </div>
            <div className="flex flex-col space-y-2">
              <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl rounded-tl-none">
                <div className="flex gap-1">
                  <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }} className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full" />
                  <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full" />
                  <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
