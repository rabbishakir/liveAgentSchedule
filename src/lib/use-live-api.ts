import { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage } from "@google/genai";
import { getLiveConfig } from './live-config';
import { LiveShowDetails } from '../types';

export function useLiveAPI() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [collectedData, setCollectedData] = useState<Partial<LiveShowDetails>>({});
  const [finalJson, setFinalJson] = useState<string | null>(null);
  
  const aiRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);

  const connect = async (model: string = "gemini-3.1-flash-live-preview", voice: string = "Kore") => {
    if (isConnected) return;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    aiRef.current = ai;

    const config = getLiveConfig(model, voice);
    
    try {
      const session = await ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            console.log("Live API connected");
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  const base64Audio = part.inlineData.data;
                  const binary = atob(base64Audio);
                  const buffer = new Int16Array(binary.length / 2);
                  for (let i = 0; i < buffer.length; i++) {
                    buffer[i] = (binary.charCodeAt(i * 2) & 0xFF) | (binary.charCodeAt(i * 2 + 1) << 8);
                  }
                  audioQueueRef.current.push(buffer);
                  playNextInQueue();
                }
              }
            }

            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
            }

            if (message.toolCall) {
              const call = message.toolCall.functionCalls[0];
              if (call.name === "schedule_live_show") {
                const args = call.args as unknown as LiveShowDetails;
                setCollectedData(args);
                setFinalJson(JSON.stringify(args, null, 2));
                setIsProcessing(true);
                
                setTimeout(() => {
                   sessionRef.current.sendToolResponse({
                    functionResponses: [{
                      name: "schedule_live_show",
                      response: { success: true, message: "Live show scheduled successfully!" },
                      id: call.id
                    }]
                  });
                  setIsProcessing(false);
                  
                  // After tool response, wait for goodbye then disconnect
                  setTimeout(() => {
                    disconnect();
                  }, 5000); // 5s buffer for goodbye
                }, 1500);
              }
            }
          },
          onclose: () => {
            setIsConnected(false);
            stopRecording();
          },
          onerror: (error) => {
            console.error("Live API error:", error);
            setIsConnected(false);
          }
        }
      });

      sessionRef.current = session;
    } catch (error) {
      console.error("Failed to connect to Live API:", error);
    }
  };

  const playNextInQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;

    isPlayingRef.current = true;
    setIsSpeaking(true);
    const audioContext = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    audioContextRef.current = audioContext;

    while (audioQueueRef.current.length > 0) {
      const pcmData = audioQueueRef.current.shift()!;
      const audioBuffer = audioContext.createBuffer(1, pcmData.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < pcmData.length; i++) {
        channelData[i] = pcmData[i] / 32768.0;
      }

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start();
      });
    }
    isPlayingRef.current = false;
    setIsSpeaking(false);
  };

  const startRecording = async (model?: string, voice?: string) => {
    if (!isConnected) await connect(model, voice);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      sourceRef.current = audioContext.createMediaStreamSource(stream);
      processorRef.current = audioContext.createScriptProcessor(4096, 1, 1);

      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        if (sessionRef.current) {
          sessionRef.current.sendRealtimeInput({
            audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        }
      };

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContext.destination);
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    setIsRecording(false);
  };

  const disconnect = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
    }
    stopRecording();
    setIsConnected(false);
  };

  return {
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
  };
}
