import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { Memory, OperationType } from '../types';
import { Brain, X, Trash2, Tag, Calendar, Search, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

interface MemoryBankProps {
  userId: string;
  onClose: () => void;
}

export default function MemoryBank({ userId, onClose }: MemoryBankProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (searchTerm.trim().length > 1) {
      const words = memories.flatMap(m => m.fact.toLowerCase().split(/\W+/));
      const cats = memories.map(m => m.category?.toLowerCase()).filter(Boolean) as string[];
      const allKeywords = Array.from(new Set([...words, ...cats]));
      const filtered = allKeywords
        .filter(k => k.length > 2 && k.startsWith(searchTerm.toLowerCase()) && k !== searchTerm.toLowerCase())
        .slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm, memories]);

  useEffect(() => {
    const q = query(collection(db, 'memories'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memoryList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Memory));
      setMemories(memoryList);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'memories'));
    return () => unsubscribe();
  }, [userId]);

  const deleteMemory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'memories', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `memories/${id}`);
    }
  };

  const categories = Array.from(new Set(memories.map(m => m.category).filter(Boolean)));

  const filteredMemories = memories.filter(m => {
    const matchesSearch = m.fact.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !activeCategory || m.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-0 sm:p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-[#0a0a0a] border border-white/10 rounded-none sm:rounded-[2.5rem] w-full max-w-4xl h-full sm:h-[80vh] flex flex-col overflow-hidden relative shadow-[0_0_100px_rgba(0,0,0,0.8)]"
      >
        <header className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/10 rounded-xl sm:rounded-2xl flex items-center justify-center border border-emerald-500/20">
              <Brain size={20} className="text-emerald-400 sm:size-24" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tighter">Memory Bank</h2>
              <p className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-widest font-bold">Long-term Cognitive Storage</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 sm:p-3 hover:bg-white/5 rounded-full transition-colors group"
          >
            <X size={20} className="text-zinc-500 group-hover:text-white transition-colors sm:size-24" />
          </button>
        </header>

        <div className="p-4 sm:p-6 border-b border-white/5 space-y-4 shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 sm:size-18" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Search cognitive records..."
              className="w-full bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-10 sm:pl-12 pr-4 text-sm outline-none focus:border-emerald-500/50 transition-colors"
            />
            <AnimatePresence>
              {showSuggestions && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-[#121212] border border-white/10 rounded-2xl overflow-hidden z-50 shadow-2xl"
                >
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSearchTerm(s);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-6 py-3 text-sm text-zinc-400 hover:bg-white/5 hover:text-emerald-400 transition-colors flex items-center gap-3"
                    >
                      <Sparkles size={14} className="text-emerald-500/50" />
                      {s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
            <button
              onClick={() => setActiveCategory(null)}
              className={cn(
                "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                !activeCategory ? "bg-emerald-500 text-black" : "bg-white/5 text-zinc-500 hover:bg-white/10"
              )}
            >
              All Records
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat as string)}
                className={cn(
                  "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                  activeCategory === cat ? "bg-emerald-500 text-black" : "bg-white/5 text-zinc-500 hover:bg-white/10"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {filteredMemories.length > 0 ? (
              filteredMemories.map((memory) => (
                <motion.div
                  key={memory.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group p-6 bg-white/5 border border-white/10 rounded-3xl hover:border-emerald-500/30 transition-all relative"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md text-[10px] font-black uppercase tracking-widest">
                          {memory.category || 'General'}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                          <Calendar size={10} />
                          {new Date(memory.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <p className="text-zinc-200 leading-relaxed">{memory.fact}</p>
                    </div>
                    <button
                      onClick={() => deleteMemory(memory.id)}
                      className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-red-500 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-3xl bg-emerald-500/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                  />
                </motion.div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-zinc-700">
                  <Brain size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">No Records Found</h3>
                  <p className="text-sm text-zinc-600 max-w-xs">
                    Alpha hasn't extracted any significant user data yet. Continue chatting to build your profile.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        <footer className="p-6 border-t border-white/5 bg-black/40 backdrop-blur-md shrink-0">
          <div className="flex items-center justify-between text-[10px] font-black text-zinc-600 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <Sparkles size={12} className="text-emerald-500" />
              AI-Powered Extraction Active
            </div>
            <div>
              {memories.length} Records Stored
            </div>
          </div>
        </footer>
      </motion.div>
    </motion.div>
  );
}
