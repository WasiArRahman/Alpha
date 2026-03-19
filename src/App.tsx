import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, signInWithGoogle, logout, handleFirestoreError } from './lib/firebase';
import { Chat, Message, UserProfile, OperationType, Memory } from './types';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import InputHub from './components/InputHub';
import MemoryBank from './components/MemoryBank';
import TaskBoard from './components/TaskBoard';
import ImageGenerator from './components/ImageGenerator';
import { generateResponse, extractMemories } from './lib/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Sparkles, Brain, Settings, MessageSquare, FileText, X, ClipboardList, Image as ImageIcon } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [memorySearchTerm, setMemorySearchTerm] = useState('');
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [isImageGenOpen, setIsImageGenOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            role: 'user'
          };
          await setDoc(doc(db, 'users', user.uid), newProfile);
          setUserProfile(newProfile);
        } else {
          setUserProfile(userDoc.data() as UserProfile);
        }
      } else {
        setUserProfile(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'chats'), where('userId', '==', user.uid), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      setChats(chatList);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'chats'));
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'memories'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memoryList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Memory));
      setMemories(memoryList);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'memories'));
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }
    console.log("Subscribing to messages for chat:", activeChat.id);
    // Remove orderBy to ensure pending writes (with null serverTimestamp) are included in the snapshot
    const q = collection(db, `chats/${activeChat.id}/messages`);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`Received message snapshot with ${snapshot.docs.length} messages`);
      const msgList = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          // Convert Firestore Timestamp to Date if it exists, otherwise use current date for pending writes
          createdAt: data.createdAt?.toDate?.() || new Date()
        } as Message;
      });
      
      // Sort client-side to handle pending writes correctly
      const sortedMessages = msgList.sort((a, b) => {
        const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return timeA - timeB;
      });
      
      setMessages(sortedMessages);
    }, (error) => {
      console.error("Messages Snapshot Error:", error);
      handleFirestoreError(error, OperationType.LIST, `chats/${activeChat.id}/messages`);
    });
    return () => unsubscribe();
  }, [activeChat]);

  useEffect(() => {
    if (!user || chats.length === 0) return;
    
    const checkAutoDelete = async () => {
      const now = Date.now();
      for (const chat of chats) {
        if (chat.autoDeleteHours && chat.autoDeleteHours > 0) {
          let createdAt = 0;
          if (chat.createdAt instanceof Date) {
            createdAt = chat.createdAt.getTime();
          } else if (chat.createdAt && (chat.createdAt as any).toDate) {
            createdAt = (chat.createdAt as any).toDate().getTime();
          }
          
          if (createdAt === 0) continue;
          const expiryTime = createdAt + (chat.autoDeleteHours * 60 * 60 * 1000);
          
          if (now > expiryTime) {
            console.log(`Auto-deleting chat: ${chat.id} (expired)`);
            await deleteChat(chat.id);
          }
        }
      }
    };

    const interval = setInterval(checkAutoDelete, 60000); // Check every minute
    checkAutoDelete(); // Initial check
    
    return () => clearInterval(interval);
  }, [user, chats]);

  const deleteChat = async (chatId: string) => {
    if (!user) return;
    try {
      // Delete messages first (optional but cleaner)
      // Note: In a real production app, you might use a cloud function for recursive delete
      // Here we just delete the chat document; security rules should allow it
      await deleteDoc(doc(db, 'chats', chatId));
      if (activeChat?.id === chatId) {
        setActiveChat(null);
      }
      console.log("Chat deleted successfully:", chatId);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `chats/${chatId}`);
    }
  };

  const updateChatAutoDelete = async (chatId: string, hours: number) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        autoDeleteHours: hours,
        updatedAt: serverTimestamp()
      });
      console.log(`Auto-delete set to ${hours} hours for chat ${chatId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}`);
    }
  };

  const createNewChat = async () => {
    if (!user) return null;
    try {
      const newChat = {
        userId: user.uid,
        title: 'New Conversation',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'chats'), newChat);
      const chatObj = { id: docRef.id, ...newChat } as any;
      setActiveChat(chatObj);
      return chatObj;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chats');
      return null;
    }
  };

  const sendMessage = async (content: string, attachments: any[] = []) => {
    if (!user || (!content.trim() && attachments.length === 0)) return;
    
    console.log("Attempting to send message:", content.slice(0, 20));
    setIsLoading(true);
    try {
      let chat = activeChat;
      if (!chat) {
        console.log("No active chat, creating new one...");
        chat = await createNewChat();
        if (!chat) throw new Error("Failed to create chat");
        console.log("New chat created:", chat.id);
      }

      const userMsg: Message = {
        chatId: chat.id,
        userId: user.uid,
        role: 'user',
        content,
        attachments,
        createdAt: new Date()
      };
      
      // Add to Firestore
      console.log("Adding user message to Firestore...");
      const userMsgRef = await addDoc(collection(db, `chats/${chat.id}/messages`), {
        chatId: userMsg.chatId,
        userId: userMsg.userId,
        role: userMsg.role,
        content: userMsg.content,
        attachments: userMsg.attachments || [],
        createdAt: serverTimestamp()
      });
      console.log("User message added with ID:", userMsgRef.id);

      // Update chat title and timestamp
      await updateDoc(doc(db, 'chats', chat.id), {
        updatedAt: serverTimestamp(),
        title: content.slice(0, 30) || 'New Conversation'
      });

      // AI Response
      console.log("Requesting AI response...");
      const currentMessages = [...messages, userMsg];
      const { text, functionCalls } = await generateResponse(currentMessages);
      
      let finalResponse = text || "";
      console.log("AI response received, length:", finalResponse.length);

      if (functionCalls) {
        console.log("Processing function calls:", functionCalls.length);
        for (const call of functionCalls) {
          if (call.name === 'create_task') {
            const { title } = call.args as any;
            await addDoc(collection(db, 'tasks'), {
              userId: user.uid,
              title,
              status: 'pending',
              createdAt: serverTimestamp()
            });
            finalResponse += `\n\n[System: Task created: "${title}"]`;
          } else if (call.name === 'list_tasks') {
            finalResponse += `\n\n[System: Opening Task Board...]`;
            setIsTaskOpen(true);
          } else if (call.name === 'complete_task') {
            const { taskId } = call.args as any;
            finalResponse += `\n\n[System: Attempting to complete task ${taskId}...]`;
          }
        }
      }

      const modelMsg: Message = {
        chatId: chat.id,
        userId: user.uid,
        role: 'model',
        content: finalResponse || "I'm sorry, I couldn't process that.",
        createdAt: new Date()
      };

      console.log("Adding AI response to Firestore...");
      await addDoc(collection(db, `chats/${chat.id}/messages`), {
        chatId: modelMsg.chatId,
        userId: modelMsg.userId,
        role: modelMsg.role,
        content: modelMsg.content,
        createdAt: serverTimestamp()
      });
      console.log("AI response added to Firestore");

      // Extract memories periodically
      if (currentMessages.length % 5 === 0) {
        console.log("Extracting memories...");
        const chatHistory = [...currentMessages, modelMsg].map(m => `${m.role}: ${m.content}`).join('\n');
        const facts = await extractMemories(chatHistory);
        console.log(`Extracted ${facts.length} facts`);
        for (const fact of facts) {
          await addDoc(collection(db, 'memories'), {
            userId: user.uid,
            fact: fact.fact,
            category: fact.category,
            createdAt: serverTimestamp()
          });
        }
      }

    } catch (error) {
      console.error("Send Message Error Details:", error);
      // We could show a toast here if we had a toast library
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request') {
        console.log('Sign-in popup was closed or another request was made.');
      } else {
        console.error('Error signing in with Google:', error);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050505] text-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#050505] text-white p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-8"
        >
          <h1 className="text-8xl font-black tracking-tighter bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent animate-pulse">
            ALPHA
          </h1>
          <p className="text-zinc-400 max-w-md mx-auto text-lg">
            The next generation of multimodal intelligence. 
            Experience the future of human-AI collaboration.
          </p>
          <button
            onClick={handleSignIn}
            disabled={isAuthenticating}
            className="flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full font-bold hover:bg-blue-400 transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn size={20} />
            {isAuthenticating ? 'Initializing...' : 'Initialize Alpha'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden font-sans selection:bg-blue-500/30 relative">
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 sm:hidden"
          />
        )}
      </AnimatePresence>

      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        chats={chats}
        memories={memories}
        activeChat={activeChat}
        setActiveChat={(chat) => {
          setActiveChat(chat);
          if (window.innerWidth < 640) setIsSidebarOpen(false);
        }}
        deleteChat={deleteChat}
        updateChatAutoDelete={updateChatAutoDelete}
        createNewChat={() => {
          createNewChat();
          if (window.innerWidth < 640) setIsSidebarOpen(false);
        }}
        onMemoryClick={(term) => {
          setMemorySearchTerm(term || '');
          setIsMemoryOpen(true);
          if (window.innerWidth < 640) setIsSidebarOpen(false);
        }}
        onTaskClick={() => {
          setIsTaskOpen(true);
          if (window.innerWidth < 640) setIsSidebarOpen(false);
        }}
        onSettingsClick={() => {
          setIsSettingsOpen(true);
          if (window.innerWidth < 640) setIsSidebarOpen(false);
        }}
        userProfile={userProfile}
      />

      <main className="flex-1 flex flex-col relative">
        <header className="h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 border-b border-white/5 backdrop-blur-md bg-black/20 z-10">
          <div className="flex items-center gap-2 sm:gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <MessageSquare size={18} className="text-blue-400 sm:size-20" />
              </button>
            )}
            <h2 className="text-[10px] sm:text-sm font-medium text-zinc-400 uppercase tracking-widest truncate max-w-[120px] sm:max-w-none">
              {activeChat?.title || 'Alpha Intelligence'}
            </h2>
          </div>
          <div className="flex items-center gap-1 sm:gap-4">
            <button 
              onClick={() => setIsTaskOpen(true)}
              className="p-1.5 sm:p-2 hover:bg-white/5 rounded-lg transition-colors group"
              title="Task Protocol"
            >
              <ClipboardList size={18} className="text-zinc-400 group-hover:text-blue-400 transition-colors sm:size-20" />
            </button>
            <button 
              onClick={() => setIsImageGenOpen(true)}
              className="p-1.5 sm:p-2 hover:bg-white/5 rounded-lg transition-colors group"
              title="Vision Lab"
            >
              <ImageIcon size={18} className="text-zinc-400 group-hover:text-blue-400 transition-colors sm:size-20" />
            </button>
            <button 
              onClick={() => {
                setMemorySearchTerm('');
                setIsMemoryOpen(true);
              }}
              className="p-1.5 sm:p-2 hover:bg-white/5 rounded-lg transition-colors group"
              title="Memory Bank"
            >
              <Brain size={18} className="text-zinc-400 group-hover:text-blue-400 transition-colors sm:size-20" />
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 sm:p-2 hover:bg-white/5 rounded-lg transition-colors group"
              title="Settings"
            >
              <Settings size={18} className="text-zinc-400 group-hover:text-blue-400 transition-colors sm:size-20" />
            </button>
          </div>
        </header>

        <ChatWindow 
          messages={messages} 
          isLoading={isLoading} 
          activeChat={activeChat}
          createNewChat={createNewChat}
        />

        <InputHub onSendMessage={sendMessage} isLoading={isLoading} />
      </main>

      <AnimatePresence>
        {isMemoryOpen && (
          <MemoryBank 
            userId={user.uid} 
            memories={memories}
            initialSearchTerm={memorySearchTerm}
            onClose={() => {
              setIsMemoryOpen(false);
              setMemorySearchTerm('');
            }} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTaskOpen && (
          <TaskBoard 
            userId={user.uid} 
            onClose={() => setIsTaskOpen(false)} 
          />
        )}
      </AnimatePresence>

      <ImageGenerator
        isOpen={isImageGenOpen}
        onClose={() => setIsImageGenOpen(false)}
      />

      <AnimatePresence>
        {isSettingsOpen && (
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
              className="bg-[#0a0a0a] border border-white/10 rounded-none sm:rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full h-full sm:h-auto relative overflow-y-auto"
            >
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Settings className="text-blue-400" />
                System Settings
              </h2>
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} className="w-12 h-12 rounded-full" alt="Profile" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Brain size={24} className="text-blue-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold">{userProfile?.displayName}</p>
                    <p className="text-xs text-zinc-500">{userProfile?.email}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                    <span className="text-sm">Thinking Mode</span>
                    <div className="w-10 h-5 bg-blue-500 rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                    <span className="text-sm">Search Grounding</span>
                    <div className="w-10 h-5 bg-blue-500 rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                    </div>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl font-bold hover:bg-red-500/20 transition-colors"
                >
                  Terminate Session
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
