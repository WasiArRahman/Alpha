import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { Task, OperationType } from '../types';
import { CheckCircle2, Circle, X, Trash2, Plus, Calendar, Clock, Sparkles, ClipboardList } from 'lucide-react';
import { cn } from '../lib/utils';

interface TaskBoardProps {
  userId: string;
  onClose: () => void;
}

export default function TaskBoard({ userId, onClose }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    const q = query(collection(db, 'tasks'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(taskList);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'tasks'));
    return () => unsubscribe();
  }, [userId]);

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      await addDoc(collection(db, 'tasks'), {
        userId,
        title: newTaskTitle.trim(),
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setNewTaskTitle('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      const newStatus = task.status === 'pending' ? 'completed' : 'pending';
      await updateDoc(doc(db, 'tasks', task.id), {
        status: newStatus,
        completedAt: newStatus === 'completed' ? serverTimestamp() : null
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${task.id}`);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'pending') return t.status === 'pending';
    if (filter === 'completed') return t.status === 'completed';
    return true;
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
        className="bg-[#0a0a0a] border border-white/10 rounded-none sm:rounded-[2.5rem] w-full max-w-2xl h-full sm:h-[80vh] flex flex-col overflow-hidden relative shadow-[0_0_100px_rgba(0,0,0,0.8)]"
      >
        <header className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/10 rounded-xl sm:rounded-2xl flex items-center justify-center border border-blue-500/20">
              <ClipboardList size={20} className="text-blue-400 sm:size-24" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tighter">Task Protocol</h2>
              <p className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-widest font-bold">Operational Objectives</p>
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
          <div className="flex gap-2 sm:gap-3">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              placeholder="Define new objective..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl py-3 sm:py-4 px-4 sm:px-6 text-sm outline-none focus:border-blue-500/50 transition-colors"
            />
            <button
              onClick={addTask}
              className="px-4 sm:px-6 bg-blue-500 text-black rounded-xl sm:rounded-2xl font-bold hover:bg-blue-400 transition-all flex items-center gap-2"
            >
              <Plus size={18} className="sm:size-20" />
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
            {(['all', 'pending', 'completed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                  filter === f ? "bg-blue-500 text-black" : "bg-white/5 text-zinc-500 hover:bg-white/10"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "group p-5 border rounded-3xl transition-all relative flex items-center gap-4",
                    task.status === 'completed' 
                      ? "bg-white/[0.02] border-white/5 opacity-60" 
                      : "bg-white/5 border-white/10 hover:border-blue-500/30"
                  )}
                >
                  <button
                    onClick={() => toggleTask(task)}
                    className={cn(
                      "shrink-0 transition-colors",
                      task.status === 'completed' ? "text-blue-500" : "text-zinc-600 hover:text-blue-400"
                    )}
                  >
                    {task.status === 'completed' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium transition-all",
                      task.status === 'completed' ? "line-through text-zinc-500" : "text-zinc-200"
                    )}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                      {task.completedAt && (
                        <span className="flex items-center gap-1 text-blue-500/50">
                          <CheckCircle2 size={10} />
                          {new Date(task.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-red-500 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-zinc-700">
                  <ClipboardList size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">No Objectives Found</h3>
                  <p className="text-sm text-zinc-600 max-w-xs">
                    Your operational queue is currently empty. Define new tasks to track your progress.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        <footer className="p-6 border-t border-white/5 bg-black/40 backdrop-blur-md shrink-0">
          <div className="flex items-center justify-between text-[10px] font-black text-zinc-600 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <Sparkles size={12} className="text-blue-500" />
              Operational Efficiency: {Math.round((tasks.filter(t => t.status === 'completed').length / (tasks.length || 1)) * 100)}%
            </div>
            <div>
              {tasks.filter(t => t.status === 'pending').length} Active Objectives
            </div>
          </div>
        </footer>
      </motion.div>
    </motion.div>
  );
}
