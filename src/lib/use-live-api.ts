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
  
  const isConnectedRef = useRef(false);
  const aiRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);

  const connect = async (model: string = "gemini-3.1-flash-live-preview", voice: string = "Sulafat") => {
    if (isConnected) return;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not defined in the environment.");
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    aiRef.current = ai;

    const config = getLiveConfig(model, voice);
    
    try {
      console.log("Connecting to Live API with model:", model, "and voice:", voice);
      const sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            isConnectedRef.current = true;
            console.log("Live API connection opened successfully");
            // Trigger proactive greeting with a small delay to ensure backend readiness
            setTimeout(() => {
              sessionPromise.then((session) => {
                if (session) {
                  console.log("Sending proactive greeting...");
                  session.sendRealtimeInput({ text: "Hello" });
                }
              }).catch(err => console.error("Error sending proactive greeting:", err));
            }, 500);
          },
          onmessage: async (message: LiveServerMessage) => {
            try {
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
                console.log("Live API: Interrupted");
                audioQueueRef.current = [];
                isPlayingRef.current = false;
                setIsSpeaking(false);
              }

              if (message.toolCall) {
                const call = message.toolCall.functionCalls[0];
                if (call.name === "schedule_live_show") {
                  console.log("Tool call received:", call.name, call.args);
                  const args = call.args as unknown as LiveShowDetails;
                  setCollectedData(args);
                  setFinalJson(JSON.stringify(args, null, 2));
                  setIsProcessing(true);
                  
                  setTimeout(() => {
                    if (sessionRef.current) {
                      sessionRef.current.sendToolResponse({
                        functionResponses: [{
                          name: "schedule_live_show",
                          response: { success: true, message: "Live show scheduled successfully!" },
                          id: call.id
                        }]
                      });
                    }
                    setIsProcessing(false);
                    
                    // After tool response, wait for goodbye then disconnect
                    setTimeout(() => {
                      disconnect();
                    }, 8000); // 8s buffer for goodbye
                  }, 1500);
                }
              }
            } catch (msgErr) {
              console.error("Error processing Live API message:", msgErr);
            }
          },
          onclose: () => {
            console.log("Live API connection closed");
            setIsConnected(false);
            isConnectedRef.current = false;
            stopRecording();
          },
          onerror: (error) => {
            console.error("Live API error details:", error);
            setIsConnected(false);
            isConnectedRef.current = false;
            stopRecording();
          }
        }
      });

      const session = await sessionPromise;
      sessionRef.current = session;
    } catch (error) {
      console.error("Failed to establish Live API connection:", error);
      setIsConnected(false);
      isConnectedRef.current = false;
    }
  };

  const playNextInQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;

    isPlayingRef.current = true;
    setIsSpeaking(true);
    
    try {
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
    } catch (playErr) {
      console.error("Error playing audio chunk:", playErr);
    } finally {
      isPlayingRef.current = false;
      setIsSpeaking(false);
    }
  };

  const startRecording = async (model?: string, voice?: string) => {
    if (!isConnectedRef.current) {
      await connect(model, voice);
      // Wait a bit for state to propagate, though we'll check sessionRef
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (!sessionRef.current) {
      console.error("Cannot start recording: Not connected to Live API");
      return;
    }
    
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
        
        // Robust base64 conversion for PCM data
        const uint8 = new Uint8Array(pcmData.buffer);
        let binary = '';
        for (let i = 0; i < uint8.length; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const base64Data = btoa(binary);

        if (sessionRef.current && isConnectedRef.current) {
          try {
            sessionRef.current.sendRealtimeInput({
              audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
            });
          } catch (sendErr) {
            console.error("Error sending audio to Live API:", sendErr);
          }
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
    isConnectedRef.current = false;
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
