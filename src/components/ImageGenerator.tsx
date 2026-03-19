import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Image as ImageIcon, Download, Sparkles, Loader2, Maximize2 } from 'lucide-react';
import { generateImage } from '../lib/gemini';
import { cn } from '../lib/utils';

interface ImageGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
}

const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1', icon: 'Square' },
  { label: '4:3', value: '4:3', icon: 'RectangleHorizontal' },
  { label: '16:9', value: '16:9', icon: 'Tv' },
  { label: '9:16', value: '9:16', icon: 'Smartphone' },
  { label: '3:4', value: '3:4', icon: 'RectangleVertical' },
];

export default function ImageGenerator({ isOpen, onClose }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    try {
      const imageUrl = await generateImage(prompt, aspectRatio, negativePrompt);
      if (imageUrl) {
        setGeneratedImage(imageUrl);
      } else {
        setError('Failed to generate image. Please try again.');
      }
    } catch (err) {
      console.error('Image generation error:', err);
      setError('An error occurred during generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `alpha-gen-${Date.now()}.png`;
    link.click();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-full sm:h-auto max-h-full sm:max-h-[90vh]"
          >
            {/* Left Side: Controls */}
            <div className="w-full md:w-80 p-4 sm:p-6 border-b md:border-b-0 md:border-r border-white/10 flex flex-col gap-4 sm:gap-6 overflow-y-auto shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <ImageIcon className="text-blue-400" size={16} />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold">Vision Lab</h2>
                </div>
                <button onClick={onClose} className="md:hidden p-2 hover:bg-white/5 rounded-lg text-zinc-400">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <label className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the image you want to create..."
                  className="w-full h-24 sm:h-32 bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500/50 outline-none transition-all resize-none"
                />
              </div>

              <div className="space-y-3 sm:space-y-4">
                <label className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest">Negative Prompt</label>
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="What to exclude (e.g., no cars, no people)..."
                  className="w-full h-16 sm:h-20 bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500/50 outline-none transition-all resize-none"
                />
              </div>

              <div className="space-y-3 sm:space-y-4">
                <label className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest">Aspect Ratio</label>
                <div className="grid grid-cols-5 md:grid-cols-3 gap-2">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio.value}
                      onClick={() => setAspectRatio(ratio.value)}
                      className={cn(
                        "p-2 sm:p-3 rounded-xl border text-[10px] sm:text-xs font-medium transition-all flex flex-col items-center gap-1.5 sm:gap-2",
                        aspectRatio === ratio.value
                          ? "bg-blue-500 border-blue-500 text-black"
                          : "bg-white/5 border-white/10 text-zinc-400 hover:border-white/20"
                      )}
                    >
                      <div className={cn(
                        "border-2 rounded-sm",
                        ratio.value === '1:1' ? "w-3 h-3 sm:w-4 sm:h-4" :
                        ratio.value === '4:3' ? "w-4 h-3 sm:w-5 sm:h-4" :
                        ratio.value === '16:9' ? "w-5 h-2.5 sm:w-6 sm:h-3" :
                        ratio.value === '9:16' ? "w-2.5 h-5 sm:w-3 sm:h-6" : "w-3 h-4 sm:w-4 sm:h-5",
                        aspectRatio === ratio.value ? "border-black" : "border-zinc-500"
                      )} />
                      <span className="hidden sm:inline">{ratio.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-3 sm:py-4 bg-blue-500 text-black rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 text-sm sm:text-base"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Visualizing...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate
                  </>
                )}
              </button>

              {error && (
                <p className="text-[10px] text-red-400 text-center">{error}</p>
              )}
            </div>

            {/* Right Side: Preview */}
            <div className="flex-1 bg-black/40 p-4 sm:p-6 flex flex-col items-center justify-center min-h-[250px] relative overflow-hidden">
              <button onClick={onClose} className="hidden md:block absolute top-6 right-6 p-2 hover:bg-white/5 rounded-lg text-zinc-400 transition-colors">
                <X size={24} />
              </button>

              {generatedImage ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 sm:gap-6">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative group max-w-full max-h-full flex items-center justify-center"
                  >
                    <img
                      src={generatedImage}
                      alt="Generated"
                      className="max-w-full max-h-[40vh] sm:max-h-[60vh] rounded-2xl shadow-2xl border border-white/10 object-contain"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 rounded-2xl">
                      <button
                        onClick={handleDownload}
                        className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform"
                        title="Download Image"
                      >
                        <Download size={24} />
                      </button>
                    </div>
                  </motion.div>
                  
                  <div className="flex items-center gap-3 sm:gap-4">
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] sm:text-sm font-medium hover:bg-white/10 transition-colors"
                    >
                      <Download size={14} />
                      Download
                    </button>
                    <button
                      onClick={() => setGeneratedImage(null)}
                      className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] sm:text-sm font-medium hover:bg-white/10 transition-colors"
                    >
                      <Sparkles size={14} />
                      New
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-3 sm:space-y-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <ImageIcon className="text-zinc-700" size={32} />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-zinc-400">Ready to Visualize</h3>
                  <p className="text-zinc-600 max-w-[200px] sm:max-w-xs mx-auto text-[10px] sm:text-sm">
                    Enter a prompt on the left to generate high-quality AI images in seconds.
                  </p>
                </div>
              )}

              {isGenerating && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="text-center space-y-3 sm:space-y-4">
                    <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-blue-500 animate-spin mx-auto" />
                    <p className="text-blue-400 text-xs sm:text-sm font-medium animate-pulse">Synthesizing pixels...</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
