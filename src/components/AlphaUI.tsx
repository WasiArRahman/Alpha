import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, Mic, Image as ImageIcon, Video, File, 
  Settings, History, Plus, Trash2, Download, 
  Upload, ChevronRight, Cpu, Sparkles, X,
  FolderOpen, Terminal, Volume2
} from 'lucide-react';
import { geminiService } from '../services/gemini';
import { apiService } from '../services/api';

interface Message {
  role: 'user' | 'model';
  parts: { text?: string; inlineData?: any }[];
}

export default function AlphaUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chats, setChats] = useState<any[]>([]);
  const [currentChatId, setCurrentChatId] = useState(Date.now().toString());
  const [isGenerating, setIsGenerating] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'media'>('chat');
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isFloating, setIsFloating] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const constraintsRef = useRef(null);

  useEffect(() => {
    loadChats();
    loadFiles();
    
    // Auto-close sidebar on mobile
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadChats = async () => {
    const data = await apiService.getChats();
    setChats(data);
  };

  const loadFiles = async () => {
    const data = await apiService.getFiles();
    setFiles(data);
  };

  const handleSend = async (text?: string, media?: any) => {
    const content = text || input;
    if (!content && !media) return;

    const newUserMessage: Message = {
      role: 'user',
      parts: media ? [{ text: content, inlineData: media }] : [{ text: content }]
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsGenerating(true);

    try {
      const response = await geminiService.chat(
        updatedMessages,
        "You are Alpha, a futuristic AI assistant. You can control the file system, generate media, and help with complex tasks. Be concise, intelligent, and professional."
      );

      // Handle function calls if any
      if (response.functionCalls) {
        for (const call of response.functionCalls) {
          if (call.name === 'create_file') {
            await apiService.writeFile(call.args.name as string, call.args.content as string);
            loadFiles();
          } else if (call.name === 'delete_file') {
            await apiService.deleteFile(call.args.name as string);
            loadFiles();
          }
        }
      }

      const modelResponse: Message = {
        role: 'model',
        parts: [{ text: response.text || "Action completed." }]
      };

      const finalMessages = [...updatedMessages, modelResponse];
      setMessages(finalMessages);
      
      // Auto-save to memory
      await apiService.saveChat({
        id: currentChatId,
        title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
        messages: finalMessages
      });
      loadChats();

    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentChatId(Date.now().toString());
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const loadChat = (chat: any) => {
    setMessages(JSON.parse(chat.messages));
    setCurrentChatId(chat.id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  return (
    <div ref={constraintsRef} className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && window.innerWidth < 768 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={`fixed md:relative z-50 w-72 h-full border-r border-white/10 bg-[#0A0A0A] flex flex-col shadow-2xl md:shadow-none`}
          >
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                  <Cpu className="text-emerald-400 w-6 h-6" />
                </div>
                <h1 className="text-xl font-bold tracking-tighter">ALPHA</h1>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 hover:bg-white/5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <button 
              onClick={startNewChat}
              className="mx-4 mb-6 flex items-center gap-2 p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all group"
            >
              <Plus className="w-5 h-5 text-emerald-400 group-hover:rotate-90 transition-transform" />
              <span className="text-sm font-medium">New Session</span>
            </button>

            <div className="flex-1 overflow-y-auto px-4 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold px-2 mb-2">Memory Logs</p>
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => loadChat(chat)}
                  className={`w-full text-left p-3 rounded-lg text-sm transition-all flex items-center gap-3 ${
                    currentChatId === chat.id ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'hover:bg-white/5 text-white/60'
                  }`}
                >
                  <History className="w-4 h-4 opacity-50" />
                  <span className="truncate">{chat.title}</span>
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-white/10">
              <button className="flex items-center gap-3 p-3 w-full rounded-lg hover:bg-white/5 text-white/60 transition-all">
                <Settings className="w-5 h-5" />
                <span className="text-sm">System Config</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <motion.div 
        drag={isFloating}
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        animate={isFloating ? { 
          scale: 0.9, 
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255,255,255,0.1)'
        } : { 
          scale: 1, 
          borderRadius: '0px',
          x: 0,
          y: 0
        }}
        className={`flex-1 flex flex-col relative bg-[#050505] overflow-hidden ${isFloating ? 'max-w-4xl max-h-[80vh] m-auto shadow-2xl z-30' : ''}`}
      >
        {/* Header */}
        <header className={`h-16 border-b border-white/10 flex items-center justify-between px-4 md:px-6 bg-[#050505]/80 backdrop-blur-xl z-10 ${isFloating ? 'cursor-grab active:cursor-grabbing' : ''}`}>
          <div className="flex items-center gap-2 md:gap-4">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-white/5 rounded-lg transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] md:text-xs font-mono tracking-widest text-white/40 uppercase hidden sm:inline">Core Active</span>
            </div>
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 scale-90 md:scale-100">
            {(['chat', 'files', 'media'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 md:px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === tab ? 'bg-emerald-500 text-black' : 'text-white/40 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsFloating(!isFloating)}
              className={`p-2 rounded-lg transition-all border ${isFloating ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-white/10 text-white/40 hover:text-white'}`}
              title={isFloating ? "Disable Floating Mode" : "Enable Floating Mode"}
            >
              <Terminal className="w-4 h-4 md:w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Viewport */}
        <main className="flex-1 overflow-hidden relative flex">
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col">
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-8 scroll-smooth"
              >
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6 p-4">
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"
                    >
                      <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-emerald-400" />
                    </motion.div>
                    <div className="space-y-2">
                      <h2 className="text-xl md:text-2xl font-bold tracking-tight">I am Alpha.</h2>
                      <p className="text-sm text-white/40 max-w-md mx-auto">
                        Ready to assist with coding, media generation, and system operations.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                      {['Create a project folder', 'Generate a futuristic city image', 'Analyze system logs', 'Explain quantum computing'].map((hint) => (
                        <button 
                          key={hint}
                          onClick={() => handleSend(hint)}
                          className="p-3 md:p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-[10px] md:text-xs text-left transition-all"
                        >
                          {hint}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[90%] md:max-w-[80%] p-3 md:p-4 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-emerald-500 text-black font-medium shadow-lg shadow-emerald-500/10' 
                        : 'bg-white/5 border border-white/10 text-white/90'
                    }`}>
                      {msg.parts.map((part, pi) => (
                        <div key={pi}>
                          {part.text && <p className="text-sm md:text-base whitespace-pre-wrap leading-relaxed">{part.text}</p>}
                          {part.inlineData && (
                            <img 
                              src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} 
                              className="mt-3 rounded-lg max-w-full h-auto"
                              referrerPolicy="no-referrer"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/10 p-3 md:p-4 rounded-2xl flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 md:p-6 bg-gradient-to-t from-[#050505] to-transparent">
                <div className="max-w-4xl mx-auto relative">
                  <div className="absolute -top-10 left-0 right-0 flex justify-center gap-4 pointer-events-none">
                    <AnimatePresence>
                      {isGenerating && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2"
                        >
                          <Cpu className="w-3 h-3 animate-spin" />
                          Neural Processing
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="relative group">
                    <div className="absolute inset-0 bg-emerald-500/5 blur-xl group-focus-within:bg-emerald-500/10 transition-all rounded-2xl" />
                    <div className="relative flex items-center gap-1 md:gap-2 bg-[#0A0A0A] border border-white/10 rounded-2xl p-1.5 md:p-2 focus-within:border-emerald-500/50 transition-all shadow-2xl">
                      <button className="p-2 md:p-3 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all">
                        <Plus className="w-4 h-4 md:w-5 h-5" />
                      </button>
                      <input 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Command Alpha..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-xs md:text-sm py-2 md:py-3 px-1 md:px-2 placeholder:text-white/20"
                      />
                      <div className="flex items-center gap-1 pr-1">
                        <button className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all hidden sm:block">
                          <Mic className="w-4 h-4 md:w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleSend()}
                          disabled={!input || isGenerating}
                          className="p-2 md:p-3 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:hover:bg-emerald-500"
                        >
                          <Send className="w-4 h-4 md:w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="flex-1 p-4 md:p-8 overflow-y-auto">
              <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3">
                    <FolderOpen className="text-emerald-400" />
                    VFS Explorer
                  </h2>
                  <div className="flex gap-2">
                    <button onClick={loadFiles} className="p-2 hover:bg-white/5 rounded-lg border border-white/10">
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {files.map((file) => (
                    <div key={file.name} className="p-3 md:p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all group relative">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-2 md:p-3 rounded-lg ${file.isDirectory ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                          {file.isDirectory ? <FolderOpen className="w-5 h-5 md:w-6 h-6" /> : <File className="w-5 h-5 md:w-6 h-6" />}
                        </div>
                        <button 
                          onClick={() => apiService.deleteFile(file.name).then(loadFiles)}
                          className="p-2 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className="text-sm font-medium truncate">{file.name}</h3>
                      <p className="text-[9px] md:text-[10px] text-white/30 uppercase mt-1">
                        {file.isDirectory ? 'Directory' : `${(file.size / 1024).toFixed(1)} KB`}
                      </p>
                    </div>
                  ))}
                  {files.length === 0 && (
                    <div className="col-span-full py-12 md:py-20 text-center border border-dashed border-white/10 rounded-2xl">
                      <p className="text-xs text-white/20">VFS is currently empty.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="flex-1 p-4 md:p-8 overflow-y-auto">
              <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
                <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3">
                  <Sparkles className="text-emerald-400" />
                  Media Lab
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="p-4 md:p-6 rounded-2xl border border-white/10 bg-white/5 space-y-4">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="text-emerald-400" />
                      <h3 className="font-bold">Image Synthesis</h3>
                    </div>
                    <p className="text-xs md:text-sm text-white/40">Generate high-fidelity visuals using Nano Banana.</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input 
                        placeholder="Describe..."
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs md:text-sm focus:border-emerald-500 transition-all"
                      />
                      <button className="px-4 py-2 bg-emerald-500 text-black rounded-xl font-bold text-[10px] md:text-xs uppercase">Synthesize</button>
                    </div>
                  </div>

                  <div className="p-4 md:p-6 rounded-2xl border border-white/10 bg-white/5 space-y-4 opacity-50">
                    <div className="flex items-center gap-3">
                      <Video className="text-emerald-400" />
                      <h3 className="font-bold">Video Engine</h3>
                    </div>
                    <p className="text-xs md:text-sm text-white/40">Veo engine integration pending.</p>
                    <div className="flex gap-2">
                      <input disabled placeholder="Locked..." className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs" />
                      <button disabled className="px-4 py-2 bg-white/10 text-white/40 rounded-xl font-bold text-[10px] uppercase">Locked</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </motion.div>

      {/* Ambient Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>
    </div>
  );
}
