'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface RecordVoiceProps {
  onSuccess: (qrUrl: string) => void;
}

export default function RecordVoice({ onSuccess }: RecordVoiceProps) {
  const [hasPermission, setHasPermission] = useState(false);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showExpirySelector, setShowExpirySelector] = useState(false);
  const [selectedDays, setSelectedDays] = useState(7);
  const [error, setError] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const [statusText, setStatusText] = useState('点击授权');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  useEffect(() => {
    return () => {
      releaseMedia();
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    };
  }, []);

  const releaseMedia = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    setRecording(false);
  };

  // ========== 授权：立即释放，调用时间 < 200ms ==========
  const requestPermission = async () => {
    if (hasPermission) {
      setStatusText('已授权，长按录音');
      setTimeout(() => setStatusText('长按录音'), 1500);
      return;
    }
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 立即停止所有轨道，释放麦克风
      stream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      // 不需要保存 stream
      setHasPermission(true);
      setStatusText('已授权，长按录音');
      setTimeout(() => setStatusText('长按录音'), 1500);
    } catch (err) {
      setError('无法访问麦克风，请检查权限');
      setStatusText('点击授权');
    }
  };

  // ========== 长按开始录音（此时才真正调用麦克风） ==========
  const startRecording = async () => {
    if (!hasPermission) {
      setError('请先点击授权麦克风');
      setStatusText('点击授权');
      return;
    }
    if (recording) return;

    setError('');
    setRecordDuration(0);
    audioChunksRef.current = [];
    startTimeRef.current = Date.now();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordDuration(duration);
        setRecording(false);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => {
            track.stop();
            track.enabled = false;
          });
          streamRef.current = null;
        }

        if (duration < 5) {
          setError(`录音太短（${duration}秒），请至少录制 5 秒`);
          setAudioBlob(null);
          return;
        }

        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (blob.size > 2 * 1024 * 1024) {
          setError('录音过长，请控制在 60 秒以内');
          return;
        }

        if (blob.size > 0) {
          setAudioBlob(blob);
          setShowExpirySelector(true);
        }
        if (durationTimerRef.current) {
          clearInterval(durationTimerRef.current);
          durationTimerRef.current = null;
        }
        setStatusText('长按录音');
      };

      mediaRecorder.start();
      setRecording(true);
      setStatusText('录音中...');

      durationTimerRef.current = setInterval(() => {
        setRecordDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);

      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 60000);
    } catch (err) {
      setError('无法开始录音');
      setRecording(false);
      setStatusText('长按录音');
    }
  };

  // ========== 松手停止录音 ==========
  const stopRecording = () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      setRecording(false);
      setStatusText(hasPermission ? '长按录音' : '点击授权');
    }
  };

  // ========== 区分点击和长按 ==========
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    isLongPressRef.current = false;

    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (hasPermission) {
        startRecording();
      } else {
        setError('请先点击授权麦克风');
        setStatusText('点击授权');
      }
    }, 300);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }

    if (isLongPressRef.current) {
      stopRecording();
    } else {
      requestPermission();
    }
    isLongPressRef.current = false;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const confirmAndUpload = async () => {
    if (!audioBlob) return;
    setShowExpirySelector(false);
    setUploading(true);
    setError('');

    try {
      const fileName = `${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          cacheControl: '3600',
        });
      if (uploadError) throw uploadError;

      const audioUrl = `https://gscpdoypcqgchtwtyohz.supabase.co/storage/v1/object/public/voice-messages/${fileName}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + selectedDays);
      const shortCode = Math.random().toString(36).substring(2, 8);

      const { error: dbError } = await supabase.from('links').insert([
        {
          short_code: shortCode,
          long_url: audioUrl,
          expires_at: expiresAt.toISOString(),
          audio_url: audioUrl,
        },
      ]);
      if (dbError) throw dbError;

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
      const shortUrl = `${baseUrl}/voice/${shortCode}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shortUrl)}`;
      onSuccess(qrUrl);
      setAudioBlob(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const cancelUpload = () => {
    setShowExpirySelector(false);
    setAudioBlob(null);
    setError('');
  };

  return (
    <div className="text-center">
      <p className="text-gray-400 text-sm mb-3">把你的声音变成二维码</p>

      <div className="flex flex-col items-center">
        <button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-200 shadow-md select-none touch-none ${
            recording
              ? 'bg-gradient-to-r from-red-400 to-red-500 scale-105'
              : hasPermission
              ? 'bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600'
              : 'bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600'
          }`}
          style={{
            userSelect: 'none',
            WebkitTouchCallout: 'none',
            touchAction: 'none',
          }}
        >
          {recording ? (
            <div className="flex gap-1 items-center justify-center">
              <div className="w-1.5 h-5 bg-white rounded-full animate-pulse" />
              <div className="w-1.5 h-7 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
              <div className="w-1.5 h-9 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
            </div>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-12 h-12 text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
              />
            </svg>
          )}
        </button>

        <div className="mt-2 text-sm text-gray-500">
          {recording ? (
            <span className="text-red-400 font-medium animate-pulse">
              🎙️ 录音中 {formatTime(recordDuration)}
            </span>
          ) : (
            <span>{hasPermission ? '长按开始录音' : '点击授权，再长按录音'}</span>
          )}
        </div>
      </div>

      {error && <div className="mt-2 text-red-400 text-sm">{error}</div>}
      {uploading && <div className="mt-2 text-emerald-500 text-sm">⏳ 生成中...</div>}

      {showExpirySelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={cancelUpload}>
          <div className="bg-white rounded-2xl p-5 w-72 mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-center text-gray-800 mb-3">设置有效时长</h3>
            <p className="text-gray-400 text-sm text-center mb-4">过期后文件将被清理</p>
            <select
              value={selectedDays}
              onChange={(e) => setSelectedDays(parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 mb-4"
            >
              <option value="1">1 天</option>
              <option value="3">3 天</option>
              <option value="7">7 天</option>
              <option value="30">30 天</option>
            </select>
            <div className="flex gap-3">
              <button onClick={cancelUpload} className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
                取消
              </button>
              <button onClick={confirmAndUpload} className="flex-1 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600">
                生成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
