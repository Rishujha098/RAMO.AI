'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type VoiceRecorderResult = {
  audioBlob: Blob;
  audioDurationMs: number;
  transcript: string;
};

type Props = {
  onRecorded: (result: VoiceRecorderResult) => void;
};

type SpeechRecognitionConstructor = new () => any;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function VoiceRecorder({ onRecorded }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number | null>(null);

  const recognitionRef = useRef<any>(null);

  const hasSpeechRecognition = useMemo(() => {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  async function start() {
    setError(null);
    setTranscript('');

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunksRef.current = [];

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    startedAtRef.current = Date.now();

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const audioBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      const startedAt = startedAtRef.current ?? Date.now();
      const audioDurationMs = Math.max(0, Date.now() - startedAt);
      onRecorded({ audioBlob, audioDurationMs, transcript: transcript.trim() });
    };

    if (hasSpeechRecognition) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SR!();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript ?? '';
          if (result.isFinal) finalText += text;
        }
        if (finalText) {
          setTranscript((prev) => `${prev} ${finalText}`.trim());
        }
      };

      recognition.onerror = (e: any) => {
        setError(`Speech recognition error: ${e?.error ?? 'unknown'}`);
      };

      try {
        recognition.start();
      } catch {
        // ignore
      }
    }

    recorder.start();
    setIsRecording(true);
  }

  function stop() {
    setIsRecording(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {!isRecording ? (
          <button
            type="button"
            className="h-11 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"
            onClick={() => start().catch((e) => setError(String(e)))}
          >
            Start recording
          </button>
        ) : (
          <button
            type="button"
            className="h-11 rounded-full bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700"
            onClick={stop}
          >
            Stop
          </button>
        )}
        <div className="self-center text-sm text-slate-600">
          {hasSpeechRecognition ? 'Live transcript enabled' : 'Live transcript unavailable (you can type it)'}
        </div>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="min-h-[80px] whitespace-pre-wrap rounded-2xl bg-white/70 p-4 text-sm ring-1 ring-slate-200/70">
        {transcript ? transcript : <span className="text-slate-500">Transcript will appear here…</span>}
      </div>
    </div>
  );
}
