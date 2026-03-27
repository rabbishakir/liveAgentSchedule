import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Power, PowerOff, Loader2, Radio, Database, Code, Calendar, Package, Tag, Bell, CheckCircle2, Settings2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLiveAPI } from '../lib/use-live-api';

const MODELS = [
  { id: 'gemini-3.1-flash-live-preview', name: 'Gemini 3.1 Flash' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' },
];

const VOICES = [
  { id: 'Kore', name: 'Kore (Female)' },
  { id: 'Puck', name: 'Puck (Male)' },
  { id: 'Charon', name: 'Charon (Deep)' },
  { id: 'Fenrir', name: 'Fenrir (Bold)' },
  { id: 'Zephyr', name: 'Zephyr (Soft)' },
  { id: 'Sulafat', name: 'Sulafat (Calm)' },
];

export default function AndiVoiceAssistant() {
  const {
    isConnected,
    isRecording,
    isProcessing,
    isSpeaking,
    collectedData,
    finalJson,
    startRecording,
    stopRecording,
    connect,
    disconnect
  } = useLiveAPI();

  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'recording' | 'processing'>('idle');
  const selectedModel = MODELS[0].id;
  const selectedVoice = 'Sulafat';

  useEffect(() => {
    if (isProcessing) setStatus('processing');
    else if (isRecording) setStatus('recording');
    else if (isConnected) setStatus('connected');
    else setStatus('idle');
  }, [isConnected, isRecording, isProcessing]);

  const handleStartConversation = async () => {
    setStatus('connecting');
    await startRecording(selectedModel, selectedVoice);
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording(selectedModel, selectedVoice);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#E4E3E0] font-sans">
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Main Assistant Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 border-r border-[#141414]/10 bg-[#F5F5F4]">
          {/* Mobile Mockup Frame */}
          <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[700px] w-[340px] shadow-2xl overflow-hidden">
            {/* Dynamic Island */}
            <div className="h-[32px] w-[100px] bg-black absolute top-0 left-1/2 -translate-x-1/2 rounded-b-2xl z-20 flex items-center justify-center">
              <div className="w-1 h-1 bg-white/20 rounded-full mr-2" />
              <div className="w-8 h-1 bg-white/10 rounded-full" />
            </div>
            
            {/* Status Bar */}
            <div className="absolute top-0 left-0 right-0 h-10 px-6 flex items-center justify-between text-white text-[10px] font-bold z-10">
              <span>9:41</span>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5 items-end h-2">
                  <div className="w-0.5 h-1 bg-white" />
                  <div className="w-0.5 h-1.5 bg-white" />
                  <div className="w-0.5 h-2 bg-white" />
                  <div className="w-0.5 h-2.5 bg-white/30" />
                </div>
                <Radio size={10} />
                <div className="w-4 h-2 border border-white/30 rounded-sm relative">
                  <div className="absolute inset-0.5 bg-white rounded-px w-2" />
                </div>
              </div>
            </div>

            {/* Assistant Content */}
            <div className="h-full w-full bg-black relative flex flex-col items-center justify-center p-8 overflow-hidden">
              {/* Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/20 via-black to-black pointer-events-none" />
              
              {/* Interaction Area */}
              <div className="relative z-10 flex flex-col items-center gap-12 w-full">
                {/* Visualizer / Glowing Orb */}
                <div className="relative w-full aspect-square flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {!isConnected ? (
                      <motion.div
                        key="offline"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex flex-col items-center gap-8"
                      >
                        <div className="w-40 h-40 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group hover:border-emerald-500/20 transition-all duration-500">
                          <Mic className="text-[#8E9299] group-hover:text-emerald-400 transition-colors" size={48} />
                        </div>
                        <button
                          onClick={handleStartConversation}
                          disabled={status === 'connecting'}
                          className="px-8 py-3 bg-emerald-500 text-black rounded-full font-bold uppercase tracking-widest text-[10px] hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                        >
                          {status === 'connecting' ? 'Connecting...' : 'Start Conversation'}
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="online"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="relative w-full h-full flex items-center justify-center cursor-pointer"
                        onClick={handleToggleRecording}
                      >
                        <GlowingOrb isActive={isRecording || isSpeaking} isProcessing={isProcessing} />
                        
                        {/* Overlay Icon */}
                        <div className="absolute z-10 flex flex-col items-center gap-2">
                          {isRecording ? (
                            <Radio className="text-emerald-400 animate-pulse" size={40} />
                          ) : isSpeaking ? (
                            <div className="flex gap-1 items-center h-8">
                              {[1, 2, 3, 4].map(i => (
                                <motion.div
                                  key={i}
                                  animate={{ height: [8, 24, 8] }}
                                  transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                                  className="w-1 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                                />
                              ))}
                            </div>
                          ) : (
                            <Mic className="text-emerald-400/40" size={40} />
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Status Display */}
                <div className="text-center space-y-4 w-full">
                  {isConnected && (
                    <motion.p 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-emerald-400/60 text-xs font-medium tracking-wide"
                    >
                      I can schedule live shows
                    </motion.p>
                  )}
                  
                  {(status === 'connecting' || isConnected || isRecording || isProcessing) && (
                    <h2 className={`text-3xl font-bold tracking-tight leading-tight ${
                      isProcessing ? 'text-amber-400' :
                      isRecording ? 'text-emerald-400' :
                      isConnected ? 'text-white' :
                      'text-white'
                    }`}>
                      {status === 'connecting' ? 'Initializing...' :
                       isProcessing ? 'Scheduling...' :
                       isRecording ? 'Listening...' :
                       'What Can I Do for You Today?'}
                    </h2>
                  )}
                  
                  <p className="text-white/40 text-xs max-w-[200px] mx-auto leading-relaxed">
                    {isRecording ? 'Andi is capturing your request' : 
                     isConnected ? 'Andi is waiting for your command' : 
                     'Tap the button to begin scheduling your live show'}
                  </p>
                  
                  {isConnected && (
                    <p className="text-emerald-400/40 text-[10px] font-medium italic animate-pulse mt-4">
                      "say hello, ami ekta live schedule korte chai"
                    </p>
                  )}
                </div>
              </div>

              {/* Footer Controls */}
              {isConnected && (
                <div className="absolute bottom-10 left-0 right-0 flex justify-center px-8">
                  <button 
                    onClick={handleDisconnect}
                    className="p-4 rounded-full bg-white/5 text-white/40 hover:bg-red-500/10 hover:text-red-500 transition-all border border-white/5"
                    title="Disconnect"
                  >
                    <PowerOff size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side Panel - Data & JSON */}
        <div className="w-full lg:w-[480px] bg-white p-10 flex flex-col gap-10 overflow-y-auto border-l border-[#141414]/5">
          {/* Variables Section */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <Database size={20} className="text-[#141414]" />
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#141414]">Live Show Variables</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <VariableItem 
                icon={<Calendar size={18} />} 
                label="Schedule Date" 
                value={collectedData.schedule_date} 
              />
              <VariableItem 
                icon={<Calendar size={18} />} 
                label="Schedule Time" 
                value={collectedData.schedule_time} 
              />
              <VariableItem 
                icon={<Radio size={18} />} 
                label="Show Name" 
                value={collectedData.show_name} 
              />
              <VariableItem 
                icon={<Package size={18} />} 
                label="Product Name" 
                value={collectedData.product_name} 
              />
              <VariableItem 
                icon={<Tag size={18} />} 
                label="Category" 
                value={collectedData.product_category} 
              />
              <VariableItem 
                icon={<Bell size={18} />} 
                label="Notify Followers" 
                value={collectedData.notify_followers !== undefined ? (collectedData.notify_followers ? 'Yes' : 'No') : undefined} 
              />
            </div>
          </section>

          {/* JSON Output Section */}
          <section className="flex-1 flex flex-col min-h-[350px]">
            <div className="flex items-center gap-3 mb-8">
              <Code size={20} className="text-[#141414]" />
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#141414]">JSON Output</h3>
            </div>
            
            <div className="flex-1 bg-[#151619] rounded-[2rem] p-8 font-mono text-sm text-emerald-400 overflow-auto border border-white/10 shadow-2xl relative">
              {finalJson ? (
                <pre className="whitespace-pre-wrap leading-relaxed">{finalJson}</pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-[#8E9299] opacity-30 italic">
                  <Code size={40} className="mb-4 opacity-10" />
                  <p className="text-center">Awaiting final confirmation from Andi...</p>
                </div>
              )}
              
              {finalJson && (
                <div className="absolute top-4 right-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
              )}
            </div>
            
            <AnimatePresence>
              {finalJson && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 flex items-center gap-3 text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-100"
                >
                  <CheckCircle2 size={16} />
                  Function Executed Successfully
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </div>
    </div>
  );
}

function GlowingOrb({ isActive, isProcessing }: { isActive: boolean, isProcessing: boolean }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Background Glow */}
      <motion.div
        animate={{
          scale: isActive ? [1, 1.2, 1] : [1, 1.05, 1],
          opacity: isActive ? [0.3, 0.6, 0.3] : [0.1, 0.2, 0.1],
        }}
        transition={{ repeat: Infinity, duration: 3 }}
        className="absolute w-64 h-64 rounded-full bg-emerald-500/20 blur-3xl"
      />
      
      {/* Outer Swirl 1 */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
        className="absolute w-56 h-56 rounded-full border border-emerald-400/20 shadow-[0_0_20px_rgba(52,211,153,0.1)]"
        style={{ borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%' }}
      />
      
      {/* Outer Swirl 2 */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
        className="absolute w-52 h-52 rounded-full border border-emerald-400/20 shadow-[0_0_20px_rgba(52,211,153,0.1)]"
        style={{ borderRadius: '60% 40% 30% 70% / 50% 40% 30% 60%' }}
      />

      {/* Core Orb */}
      <motion.div
        animate={isActive ? {
          scale: [1, 1.1, 1],
          boxShadow: [
            "0 0 20px rgba(52,211,153,0.4)",
            "0 0 60px rgba(52,211,153,0.8)",
            "0 0 20px rgba(52,211,153,0.4)"
          ]
        } : {
          scale: 1,
          boxShadow: "0 0 20px rgba(52,211,153,0.2)"
        }}
        transition={{ repeat: Infinity, duration: 2 }}
        className={`w-40 h-40 rounded-full bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-900 relative overflow-hidden flex items-center justify-center ${
          isProcessing ? 'animate-pulse' : ''
        }`}
      >
        {/* Swirling inner lights */}
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
          className="absolute w-full h-full bg-gradient-to-t from-white/20 to-transparent blur-sm"
        />
        <motion.div
          animate={{ rotate: -360, scale: [1.2, 1, 1.2] }}
          transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
          className="absolute w-full h-full bg-gradient-to-b from-emerald-300/20 to-transparent blur-md"
        />
      </motion.div>
    </div>
  );
}

function VariableItem({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string }) {
  return (
    <div className={`flex items-center gap-5 p-5 rounded-2xl border transition-all duration-300 ${
      value ? 'bg-white border-[#141414]/10 shadow-md' : 'bg-[#F5F5F5] border-[#141414]/5 opacity-60'
    }`}>
      <div className={`p-3 rounded-xl ${value ? 'bg-[#141414] text-white' : 'bg-[#141414]/5 text-[#141414]'}`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-[10px] uppercase font-black tracking-widest text-[#8E9299]">{label}</p>
        <p className={`text-base font-bold mt-1 ${value ? 'text-[#141414]' : 'text-[#8E9299] italic'}`}>
          {value || 'Pending...'}
        </p>
      </div>
      {value && (
        <motion.div 
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }} 
          className="bg-emerald-500 p-1 rounded-full text-white"
        >
          <CheckCircle2 size={12} />
        </motion.div>
      )}
    </div>
  );
}
