'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type TabType = 'shorten' | 'qrcode' | 'voice';

interface LinkData {
  id: string;
  short_code: string;
  long_url: string;
  click_count: number;
  created_at: string;
  expires_at: string | null;
  audio_url: string | null;
  file_size: number;
  type: string;
  device_display: string;
  device_stats: Record<string, number>;
}

export default function AdminDashboard() {
  const [allLinks, setAllLinks] = useState<LinkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('shorten');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchLinks(activeTab);
  }, [activeTab]);

  const fetchLinks = async (type?: string) => {
    try {
      const url = type ? `/api/admin/links?type=${type}` : '/api/admin/links';
      const res = await fetch(url);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '加载失败');
      setAllLinks(data.links || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelected(new Set());
    setError('');
  };

  const handleDelete = async (shortCode: string) => {
    if (!confirm(`确定要删除短链接 /${shortCode} 吗？`)) return;
    try {
      const res = await fetch(`/api/admin/links/${shortCode}`, {
        method: 'DELETE',
      });
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '删除失败');
      setAllLinks(allLinks.filter(l => l.short_code !== shortCode));
      setSelected(prev => {
        const newSet = new Set(prev);
        newSet.delete(shortCode);
        return newSet;
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) {
      alert('请至少选择一个短链接');
      return;
    }
    if (!confirm(`确定要删除选中的 ${selected.size} 个短链接吗？`)) return;
    setDeleting(true);
    try {
      const shortCodes = Array.from(selected);
      const res = await fetch('/api/admin/links', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortCodes }),
      });
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '批量删除失败');
      setAllLinks(allLinks.filter(l => !selected.has(l.short_code)));
      setSelected(new Set());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelect = (shortCode: string) => {
    setSelected(prev => {
      const newSet = new Set(prev);
      if (newSet.has(shortCode)) newSet.delete(shortCode);
      else newSet.add(shortCode);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === allLinks.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allLinks.map(l => l.short_code)));
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '永久';
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-gray-400">加载中...</div>;
  }

  const tabLabels: Record<TabType, string> = {
    shorten: '短链接',
    qrcode: '二维码',
    voice: '语音',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 顶部栏 */}
        <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📊 后台管理</h1>
            <p className="text-gray-500 text-sm">管理所有短链接、二维码、语音</p>
          </div>
          <div className="flex gap-3 items-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-emerald-500 transition">
              ← 返回首页
            </Link>
            <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-600 transition">
              退出
            </button>
          </div>
        </div>

        {/* 选项卡 */}
        <div className="flex gap-2 mb-4">
          {(['shorten', 'qrcode', 'voice'] as TabType[]).map(tab => (
            <button
              key={tab}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                activeTab === tab
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => handleTabChange(tab)}
            >
              {tabLabels[tab]} ({allLinks.length})
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-xl mb-4 text-sm">{error}</div>
        )}

        {/* 批量操作栏 */}
        {allLinks.length > 0 && (
          <div className="flex items-center gap-4 mb-4 bg-white p-3 rounded-xl shadow-sm">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={selected.size === allLinks.length && allLinks.length > 0}
                onChange={toggleSelectAll}
              />
              全选
            </label>
            <span className="text-sm text-gray-500">已选 {selected.size} 项</span>
            <button
              onClick={handleBatchDelete}
              disabled={selected.size === 0 || deleting}
              className="px-4 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition disabled:opacity-50"
            >
              {deleting ? '删除中...' : '批量删除'}
            </button>
          </div>
        )}

        {/* 表格 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === allLinks.length && allLinks.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">短码</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">目标链接</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">点击</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">设备类型</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">有效期</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allLinks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  allLinks.map((link) => (
                    <tr key={link.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(link.short_code)}
                          onChange={() => toggleSelect(link.short_code)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`/${link.short_code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:underline font-mono text-sm"
                        >
                          /{link.short_code}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={link.long_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:underline text-sm truncate max-w-[200px] block"
                          title={link.long_url || (link.audio_url ? '语音文件' : '')}
                        >
                          {link.audio_url ? '🎙️ 语音留言' : (link.long_url || '-')}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">
                        {link.click_count || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {link.device_display || '无数据'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(link.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {link.expires_at ? formatDate(link.expires_at) : '永久'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDelete(link.short_code)}
                          className="text-red-400 hover:text-red-600 text-sm transition"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}