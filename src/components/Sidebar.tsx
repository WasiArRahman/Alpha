import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Brain, Settings, Plus, ChevronLeft, ChevronRight, History, Trash2, ClipboardList, X, Check, Clock } from 'lucide-react';
import { Chat, UserProfile } from '../types';
import { cn } from '../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  chats: Chat[];
  activeChat: Chat | null;
  setActiveChat: (chat: Chat) => void;
  deleteChat: (chatId: string) => void;
  updateChatAutoDelete: (chatId: string, hours: number) => void;
  createNewChat: () => void;
  onMemoryClick: () => void;
  onTaskClick: () => void;
  onSettingsClick: () => void;
  userProfile: UserProfile | null;
}

export default function Sidebar({
  isOpen,
  setIsOpen,
  chats,
  activeChat,
  setActiveChat,
  deleteChat,
  updateChatAutoDelete,
  createNewChat,
  onMemoryClick,
  onTaskClick,
  onSettingsClick,
  userProfile
}: SidebarProps) {
  return (
    <motion.aside
      initial={false}
      animate={{ 
        width: isOpen ? (typeof window !== 'undefined' && window.innerWidth < 640 ? '100%' : 320) : 0,
        opacity: isOpen ? 1 : 0,
        x: isOpen ? 0 : -320
      }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className={cn(
        "fixed inset-y-0 left-0 z-40 sm:relative h-full bg-[#0a0a0a] border-r border-white/5 flex flex-col transition-all duration-300",
        !isOpen && "pointer-events-none"
      )}
    >
      <div className="p-6 flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
          ALPHA
        </h1>
        <button 
          onClick={() => setIsOpen(false)}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors pointer-events-auto"
        >
          <ChevronLeft size={20} className="text-zinc-500" />
        </button>
      </div>

      <div className="px-4 mb-6">
        <button
          onClick={createNewChat}
          className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold hover:bg-emerald-500/20 transition-all group pointer-events-auto"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform" />
          New Session
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar pointer-events-auto">
        <div className="flex items-center gap-2 px-2 py-2 text-xs font-bold text-zinc-600 uppercase tracking-widest">
          <History size={14} />
          Chat History
        </div>
        {chats.map((chat) => {
          const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

          return (
            <div key={chat.id} className="group relative">
              <button
                onClick={() => setActiveChat(chat)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all relative overflow-hidden",
                  activeChat?.id === chat.id 
                    ? "bg-white/10 text-white border border-white/10" 
                    : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                )}
              >
                <MessageSquare size={16} className={cn(activeChat?.id === chat.id ? "text-emerald-400" : "text-zinc-600")} />
                <span className="truncate flex-1 text-left pr-16">{chat.title}</span>
                {activeChat?.id === chat.id && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute left-0 w-1 h-6 bg-emerald-500 rounded-r-full"
                  />
                )}
              </button>
              
              <div className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 transition-all",
                activeChat?.id === chat.id || isConfirmingDelete ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}>
                <AnimatePresence mode="wait">
                  {isConfirmingDelete ? (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center gap-1 bg-red-500/20 rounded-lg p-0.5 border border-red-500/30"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(chat.id);
                        }}
                        className="p-1 hover:bg-red-500 text-white rounded-md transition-colors"
                        title="Confirm Delete"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsConfirmingDelete(false);
                        }}
                        className="p-1 hover:bg-white/10 text-zinc-400 rounded-md transition-colors"
                        title="Cancel"
                      >
                        <X size={12} />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="actions"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1"
                    >
                      <div className="relative flex items-center">
                        <Clock size={10} className="absolute left-1.5 text-zinc-500 pointer-events-none" />
                        <select
                          value={chat.autoDeleteHours || 0}
                          onChange={(e) => updateChatAutoDelete(chat.id, Number(e.target.value))}
                          className="bg-[#1a1a1a] text-[10px] text-zinc-400 border border-white/10 rounded pl-5 pr-1 py-0.5 outline-none hover:text-white transition-colors appearance-none cursor-pointer"
                          title="Auto-delete timer"
                        >
                          <option value={0}>Off</option>
                          <option value={1}>1h</option>
                          <option value={24}>24h</option>
                          <option value={168}>7d</option>
                        </select>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsConfirmingDelete(true);
                        }}
                        className="p-1.5 hover:bg-red-500/20 text-zinc-500 hover:text-red-500 rounded-lg transition-all"
                        title="Delete chat"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {chat.autoDeleteHours && chat.autoDeleteHours > 0 && !isConfirmingDelete && (
                <div className="absolute right-16 bottom-1 text-[8px] text-emerald-500/50 font-bold uppercase tracking-tighter flex items-center gap-0.5">
                  <Clock size={8} />
                  {chat.autoDeleteHours}h
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-4 mt-auto space-y-2 border-t border-white/5 pointer-events-auto">
        <button
          onClick={onTaskClick}
          className="w-full flex items-center gap-3 px-4 py-3 text-zinc-400 hover:bg-white/5 hover:text-white rounded-xl transition-all group"
        >
          <ClipboardList size={18} className="group-hover:text-blue-400 transition-colors" />
          Task Protocol
        </button>
        <button
          onClick={onMemoryClick}
          className="w-full flex items-center gap-3 px-4 py-3 text-zinc-400 hover:bg-white/5 hover:text-white rounded-xl transition-all group"
        >
          <Brain size={18} className="group-hover:text-emerald-400 transition-colors" />
          Memory Bank
        </button>
        <button
          onClick={onSettingsClick}
          className="w-full flex items-center gap-3 px-4 py-3 text-zinc-400 hover:bg-white/5 hover:text-white rounded-xl transition-all group"
        >
          <Settings size={18} className="group-hover:text-emerald-400 transition-colors" />
          Settings
        </button>
        
        <div className="pt-4 flex items-center gap-3 px-2">
          {userProfile?.photoURL ? (
            <img 
              src={userProfile.photoURL} 
              className="w-10 h-10 rounded-full border border-white/10" 
              alt="Profile" 
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Brain size={16} className="text-emerald-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{userProfile?.displayName}</p>
            <p className="text-[10px] text-zinc-600 truncate uppercase tracking-tighter">System Operator</p>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
