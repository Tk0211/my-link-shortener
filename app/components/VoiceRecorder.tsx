'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface VoiceRecorderProps {
  onSuccess: (shortUrl: string, qrUrl: string) => void;
}

export default function VoiceRecorder({ onSuccess }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    setError('');
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadAudio(audioBlob);
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      setError('无法访问麦克风，请检查权限');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const uploadAudio = async (audioBlob: Blob) => {
    setUploading(true);
    setError('');
    try {
      const fileName = `${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(fileName, audioBlob, { contentType: 'audio/webm' });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('voice-messages').getPublicUrl(fileName);
      const audioUrl = publicUrlData.publicUrl;
      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ longUrl: audioUrl, expiresIn: '7d', isVoice: true, audioUrl }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(result.shortUrl)}`;
      onSuccess(result.shortUrl, qrUrl);
    } catch (err: any) {
      setError(err.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-2">🎙️ 录制语音留言</h3>
      <div className="flex gap-2 mb-2">
        {!recording ? (
          <button onClick={startRecording} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">开始录音</button>
        ) : (
          <button onClick={stopRecording} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">停止录音</button>
        )}
      </div>
      {uploading && <p className="text-blue-500">上传中...</p>}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
