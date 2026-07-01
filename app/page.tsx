'use client';

import { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import RecordVoice from './components/RecordVoice';

function ExpiresInput({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const isPermanent = value === 'permanent';
  let days = '';
  if (!isPermanent) {
    const match = value.match(/^(\d+)d$/);
    if (match) days = match[1];
  }

  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDays = e.target.value;
    if (newDays === '') {
      onChange('permanent');
    } else {
      const num = parseInt(newDays, 10);
      if (!isNaN(num) && num > 0) {
        onChange(`${num}d`);
      }
    }
  };

  const handlePermanentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onChange('permanent');
    } else if (days) {
      onChange(`${days}d`);
    } else {
      onChange('1d');
    }
  };

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">有效期（天）</label>
        <input
          type="number"
          min="1"
          step="1"
          value={days}
          onChange={handleDaysChange}
          disabled={isPermanent}
          placeholder="填写天数"
          className={`w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 ${
            isPermanent ? 'bg-gray-50 text-gray-400' : ''
          }`}
        />
      </div>
      <div className="flex items-center gap-2 pb-2">
        <input
          type="checkbox"
          id="permanent"
          checked={isPermanent}
          onChange={handlePermanentChange}
          className="w-4 h-4 accent-emerald-500"
        />
        <label htmlFor="permanent" className="text-sm text-gray-600">永久有效</label>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'shorten' | 'qr'>('shorten');
  const [showContact, setShowContact] = useState(false);

  // 短链接
  const [longUrl, setLongUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [shortLoading, setShortLoading] = useState(false);
  const [shortError, setShortError] = useState('');
  const [shortExpires, setShortExpires] = useState('1d');
  const [customCode, setCustomCode] = useState('');

  // 二维码
  const [qrLongUrl, setQrLongUrl] = useState('');
  const [qrShortUrl, setQrShortUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState('');
  const [qrExpires, setQrExpires] = useState('1d');

  // 语音
  const [voiceQrUrl, setVoiceQrUrl] = useState('');

  // 通用创建短链接（增加 type 参数）
  async function createShortLink(url: string, expires: string, customCode?: string, type: string = 'shorten'): Promise<string> {
    const res = await fetch('/api/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        longUrl: url, 
        expiresIn: expires,
        customCode: customCode || undefined,
        type: type,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '生成失败');
    return data.shortUrl;
  }

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!longUrl) return;
    setShortLoading(true);
    setShortError('');
    setShortUrl('');
    try {
      const url = await createShortLink(longUrl, shortExpires, customCode.trim() || undefined, 'shorten');
      setShortUrl(url);
    } catch (err: any) {
      setShortError(err.message);
    } finally {
      setShortLoading(false);
    }
  };

  const handleGenerateQR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrLongUrl) return;
    setQrLoading(true);
    setQrError('');
    setQrShortUrl('');
    try {
      const url = await createShortLink(qrLongUrl, qrExpires, undefined, 'qrcode');
      setQrShortUrl(url);
    } catch (err: any) {
      setQrError(err.message);
    } finally {
      setQrLoading(false);
    }
  };

  const handleVoiceSuccess = (qrUrl: string) => {
    setVoiceQrUrl(qrUrl);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 bg-gradient-to-br from-emerald-50 to-teal-50">
      <div className="w-full max-w-2xl mx-auto space-y-5">
        {/* 卡片1 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden border border-white/50">
          <div className="flex border-b border-emerald-100">
            <button
              className={`flex-1 py-3 text-center font-medium transition-all duration-200 ${
                activeTab === 'shorten' 
                  ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/50' 
                  : 'text-gray-500 hover:text-emerald-500'
              }`}
              onClick={() => setActiveTab('shorten')}
            >
              🔗 链接转换
            </button>
            <button
              className={`flex-1 py-3 text-center font-medium transition-all duration-200 ${
                activeTab === 'qr' 
                  ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/50' 
                  : 'text-gray-500 hover:text-emerald-500'
              }`}
              onClick={() => setActiveTab('qr')}
            >
              📱 二维码转换
            </button>
          </div>

          <div className="p-5">
            {activeTab === 'shorten' && (
              <div>
                <h2 className="text-xl font-semibold text-center text-gray-700 mb-4">长链接 → 短链接</h2>
                <form onSubmit={handleShorten} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">输入长链接</label>
                    <input
                      type="url"
                      required
                      value={longUrl}
                      onChange={(e) => setLongUrl(e.target.value)}
                      placeholder="https://example.com/very/long/url"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">自定义短码（可选）</label>
                    <div className="flex items-center">
                      <span className="text-gray-400 text-sm bg-gray-50 px-3 py-2 rounded-l-xl border border-r-0 border-gray-200">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/
                      </span>
                      <input
                        type="text"
                        value={customCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                          setCustomCode(val);
                        }}
                        placeholder="例如 mypage"
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-r-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                        maxLength={20}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">仅支持字母和数字，3-20位，不填则自动生成</p>
                  </div>
                  <ExpiresInput value={shortExpires} onChange={setShortExpires} />
                  <button
                    type="submit"
                    disabled={shortLoading}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-200 shadow-sm disabled:opacity-50"
                  >
                    {shortLoading ? '生成中...' : '生成短链接'}
                  </button>
                </form>
                {shortError && <div className="mt-4 p-3 bg-red-50 text-red-500 rounded-xl text-sm">{shortError}</div>}
                {shortUrl && (
                  <div className="mt-4 p-4 bg-emerald-50 rounded-xl text-center">
                    <p className="text-sm text-gray-600 mb-2">短链接：</p>
                    <a href={shortUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline break-all text-sm">{shortUrl}</a>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'qr' && (
              <div>
                <h2 className="text-xl font-semibold text-center text-gray-700 mb-4">链接 → 二维码</h2>
                <form onSubmit={handleGenerateQR} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">输入任意链接</label>
                    <input
                      type="url"
                      required
                      value={qrLongUrl}
                      onChange={(e) => setQrLongUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                    />
                  </div>
                  <ExpiresInput value={qrExpires} onChange={setQrExpires} />
                  <button
                    type="submit"
                    disabled={qrLoading}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-200 shadow-sm disabled:opacity-50"
                  >
                    {qrLoading ? '生成中...' : '生成二维码'}
                  </button>
                </form>
                {qrError && <div className="mt-4 p-3 bg-red-50 text-red-500 rounded-xl text-sm">{qrError}</div>}
                {qrShortUrl && (
                  <div className="mt-4 p-4 bg-emerald-50 rounded-xl text-center">
                    <p className="text-sm text-gray-600 mb-2">二维码：</p>
                    <div className="flex justify-center">
                      <QRCodeCanvas value={qrShortUrl} size={160} level="L" />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">扫描二维码访问</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 卡片2：语音 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden border border-white/50">
          <div className="p-5">
            <RecordVoice onSuccess={handleVoiceSuccess} />
            {voiceQrUrl && (
              <div className="mt-4 p-4 bg-emerald-50 rounded-xl text-center">
                <p className="text-sm text-gray-600 mb-2">语音二维码</p>
                <div className="flex justify-center">
                  <img src={voiceQrUrl} width={140} height={140} alt="语音二维码" />
                </div>
                <p className="text-xs text-gray-400 mt-2">长按图片保存，扫码播放</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部 */}
      <div className="w-full max-w-2xl mx-auto mt-6 text-center">
        <button
          onClick={() => setShowContact(true)}
          className="text-sm text-gray-400 hover:text-emerald-500 transition-colors duration-200"
        >
          联系作者
        </button>
      </div>
      <div className="w-full max-w-2xl mx-auto mt-2 text-center">
        <p className="text-xs text-gray-400">本网站为公益性质，仅供合法用途，禁止用于任何违法犯罪活动。</p>
      </div>

      {/* 联系作者弹窗 */}
      {showContact && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowContact(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-xs w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">联系作者</h3>
              <button
                onClick={() => setShowContact(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="flex justify-center">
              <img src="/wechat-qr.png" alt="微信二维码" className="w-48 h-48 object-contain" />
            </div>
            <p className="text-center text-sm text-gray-500 mt-3">微信扫码联系</p>
          </div>
        </div>
      )}
    </main>
  );
}