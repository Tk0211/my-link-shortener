'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function VoicePlayPage({ params }: { params: Promise<{ shortCode: string }> }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    params.then(async ({ shortCode }) => {
      try {
        const { data, error: dbError } = await supabase
          .from('links')
          .select('audio_url, expires_at')
          .eq('short_code', shortCode)
          .maybeSingle();

        if (dbError || !data?.audio_url) {
          setError('语音不存在');
          return;
        }

        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setError('语音已过期');
          return;
        }

        setAudioUrl(data.audio_url);
      } catch (err) {
        setError('加载失败');
      } finally {
        setLoading(false);
      }
    });
  }, [params]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('播放失败:', e));
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      audio.currentTime = 0;
    };
    const onError = () => setIsPlaying(false);

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    if (audioUrl) {
      audio.src = audioUrl;
      audio.load();
    }

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [audioUrl]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center p-6 bg-white rounded-2xl shadow-lg max-w-xs mx-4">
          <div className="text-5xl mb-4">😢</div>
          <h1 className="text-lg font-semibold text-gray-800">{error}</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100">
      <audio ref={audioRef} preload="auto" />
      
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div 
            onClick={togglePlay}
            className="relative bg-white rounded-2xl shadow-md p-4 max-w-xs cursor-pointer active:bg-gray-50 transition"
          >
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white rotate-45 rounded-sm" />
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                {isPlaying ? (
                  <div className="flex gap-0.5 items-center">
                    <div className="w-1 h-3 bg-emerald-500 rounded-full animate-pulse" />
                    <div className="w-1 h-4 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                    <div className="w-1 h-2 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                  </div>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-emerald-500 ml-0.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 truncate">
                  {isPlaying ? '播放中...' : '点击播放语音'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">语音留言</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <Link href="/" className="text-gray-400 text-xs hover:text-emerald-500 transition-colors">
            崩鸟短链 · 语音留言
          </Link>
        </div>
      </div>
    </div>
  );
}
