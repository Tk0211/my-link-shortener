'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type TabType = 'shorten' | 'qrcode' | 'voice' | 'recycle';

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
  status: string;
  device_stats: Record<string, number>;
  browser_stats: Record<string, number>;
  os_stats: Record<string, number>;
  ips: string[];
  deleted_at: string | null;
  deleted_at_formatted?: string;
  delete_reason_label?: string;
}

export default function AdminDashboard() {
  const [allLinks, setAllLinks] = useState<LinkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('shorten');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [selectedLink, setSelectedLink] = useState<LinkData | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const router = useRouter();

  // ========== 获取数据 ==========
  const fetchLinks = async (type?: string, isRecycle = false) => {
    try {
      const endpoint = isRecycle ? '/api/admin/links/recycle' : '/api/admin/links';
      const url = type ? `${endpoint}?type=${type}` : endpoint;
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

  // ========== 切换选项卡时重新获取数据 ==========
  useEffect(() => {
    const isRecycle = activeTab === 'recycle';
    const type = isRecycle ? undefined : (activeTab === 'qrcode' ? 'shorten' : activeTab);
    fetchLinks(type, isRecycle);
    setSelected(new Set());
  }, [activeTab]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  // ========== 软删除（移入回收站） ==========
  const handleDelete = async (shortCode: string) => {
    if (!confirm(`确定要删除短链接 /${shortCode} 吗？将移入回收站。`)) return;
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

  // ========== 批量软删除 ==========
  const handleBatchDelete = async () => {
    if (selected.size === 0) {
      alert('请至少选择一个短链接');
      return;
    }
    if (!confirm(`确定要删除选中的 ${selected.size} 个短链接吗？将移入回收站。`)) return;
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

  // ========== 恢复单个 ==========
  const handleRestore = async (shortCode: string) => {
    if (!confirm(`确定要恢复 /${shortCode} 吗？`)) return;
    try {
      const res = await fetch(`/api/admin/links/recycle/${shortCode}`, {
        method: 'PUT',
      });
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '恢复失败');
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

  // ========== 批量恢复 ==========
  const handleBatchRestore = async () => {
    if (selected.size === 0) {
      alert('请至少选择一个短链接');
      return;
    }
    if (!confirm(`确定要恢复选中的 ${selected.size} 个短链接吗？`)) return;
    setDeleting(true);
    try {
      const shortCodes = Array.from(selected);
      const res = await fetch('/api/admin/links/recycle', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortCodes }),
      });
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '批量恢复失败');
      setAllLinks(allLinks.filter(l => !selected.has(l.short_code)));
      setSelected(new Set());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // ========== 永久删除单个 ==========
  const handlePermanentDelete = async (shortCode: string) => {
    if (!confirm(`确定要永久删除 /${shortCode} 吗？此操作不可恢复！`)) return;
    try {
      const res = await fetch(`/api/admin/links/recycle/${shortCode}`, {
        method: 'DELETE',
      });
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '永久删除失败');
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

  // ========== 批量永久删除 ==========
  const handleBatchPermanentDelete = async () => {
    if (selected.size === 0) {
      alert('请至少选择一个短链接');
      return;
    }
    if (!confirm(`确定要永久删除选中的 ${selected.size} 个短链接吗？此操作不可恢复！`)) return;
    setDeleting(true);
    try {
      const shortCodes = Array.from(selected);
      const res = await fetch('/api/admin/links/recycle', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortCodes }),
      });
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '批量永久删除失败');
      setAllLinks(allLinks.filter(l => !selected.has(l.short_code)));
      setSelected(new Set());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // ========== 选择操作 ==========
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

  const handleViewDetail = (link: LinkData) => {
    setSelectedLink(link);
    setShowDetail(true);
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  // ========== 工具函数 ==========
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '永久';
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / 1024 / 1024).toFixed(1) + 'MB';
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-gray-400">加载中...</div>;
  }

  const isRecycleTab = activeTab === 'recycle';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 顶部 */}
        <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📊 后台管理</h1>
            <p className="text-gray-500 text-sm">管理所有短链接、二维码、语音</p>
          </div>
          <div className="flex gap-3 items-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-emerald-500 transition">← 返回首页</Link>
            <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-600 transition">退出</button>
          </div>
        </div>

        {/* 选项卡 */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(['shorten', 'qrcode', 'voice', 'recycle'] as TabType[]).map(tab => (
            <button
              key={tab}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                activeTab === tab ? 'bg-emerald-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => handleTabChange(tab)}
            >
              {tab === 'shorten' && '🔗 短链接'}
              {tab === 'qrcode' && '📱 二维码'}
              {tab === 'voice' && '🎙️ 语音'}
              {tab === 'recycle' && '🗑️ 回收站'}
              ({allLinks.length})
            </button>
          ))}
        </div>

        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl mb-4 text-sm">{error}</div>}

        {/* 批量操作 */}
        {allLinks.length > 0 && (
          <div className="flex items-center gap-4 mb-4 bg-white p-3 rounded-xl shadow-sm flex-wrap">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={selected.size === allLinks.length && allLinks.length > 0} onChange={toggleSelectAll} />
              全选
            </label>
            <span className="text-sm text-gray-500">已选 {selected.size} 项</span>
            {isRecycleTab ? (
              <>
                <button
                  onClick={handleBatchRestore}
                  disabled={selected.size === 0 || deleting}
                  className="px-4 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition disabled:opacity-50"
                >
                  {deleting ? '恢复中...' : '批量恢复'}
                </button>
                <button
                  onClick={handleBatchPermanentDelete}
                  disabled={selected.size === 0 || deleting}
                  className="px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  {deleting ? '删除中...' : '永久删除'}
                </button>
              </>
            ) : (
              <button
                onClick={handleBatchDelete}
                disabled={selected.size === 0 || deleting}
                className="px-4 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition disabled:opacity-50"
              >
                {deleting ? '删除中...' : '移入回收站'}
              </button>
            )}
          </div>
        )}

        {/* 表格 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={selected.size === allLinks.length && allLinks.length > 0} onChange={toggleSelectAll} />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">短码</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">目标/内容</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">点击</th>
                  {!isRecycleTab && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">设备</th>
                  )}
                  {!isRecycleTab && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  )}
                  {isRecycleTab && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">删除时间</th>
                  )}
                  {isRecycleTab && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">删除原因</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">有效期</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allLinks.length === 0 ? (
                  <tr>
                    <td colSpan={isRecycleTab ? 10 : 10} className="px-4 py-8 text-center text-gray-400">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  allLinks.map((link) => (
                    <tr key={link.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.has(link.short_code)} onChange={() => toggleSelect(link.short_code)} />
                      </td>
                      <td className="px-4 py-3">
                        <a href={`/${link.short_code}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline font-mono text-sm">
                          /{link.short_code}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <a href={link.long_url || '#'} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:underline text-sm truncate max-w-[200px] block" title={link.long_url || (link.audio_url ? '语音文件' : '')}>
                          {link.audio_url ? '🎙️ 语音留言' : (link.long_url || '-')}
                        </a>
                        {activeTab === 'voice' && link.file_size > 0 && (
                          <span className="text-xs text-gray-400 ml-1">({formatFileSize(link.file_size)})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">{link.click_count || 0}</td>
                      {!isRecycleTab && (
                        <td className="px-4 py-3 text-sm text-gray-500">{link.device_display || '无数据'}</td>
                      )}
                      {!isRecycleTab && (
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${link.status === '已过期' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {link.status}
                          </span>
                        </td>
                      )}
                      {isRecycleTab && (
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {link.deleted_at_formatted || '-'}
                        </td>
                      )}
                      {isRecycleTab && (
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            link.delete_reason_label === '手动删除' ? 'bg-blue-100 text-blue-600' : 
                            link.delete_reason_label === '自动过期' ? 'bg-orange-100 text-orange-600' : 
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {link.delete_reason_label || '未知'}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(link.created_at)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{link.expires_at ? formatDate(link.expires_at) : '永久'}</td>
                      <td className="px-4 py-3 text-center">
                        {isRecycleTab ? (
                          <>
                            <button onClick={() => handleRestore(link.short_code)} className="text-green-500 hover:text-green-700 text-sm transition mr-2">恢复</button>
                            <button onClick={() => handlePermanentDelete(link.short_code)} className="text-red-600 hover:text-red-800 text-sm transition">永久删除</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleViewDetail(link)} className="text-blue-400 hover:text-blue-600 text-sm transition mr-2">详情</button>
                            <button onClick={() => handleDelete(link.short_code)} className="text-red-400 hover:text-red-600 text-sm transition">删除</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========== 详情弹窗 ========== */}
      {showDetail && selectedLink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetail(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">📊 详情</h3>
              <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">短码</span>
                <span className="font-mono text-sm">/{selectedLink.short_code}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">目标</span>
                <span className="text-sm truncate max-w-[200px]">{selectedLink.long_url || '语音'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">总点击</span>
                <span className="font-bold text-emerald-600">{selectedLink.click_count || 0}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">状态</span>
                <span className={`text-sm ${selectedLink.status === '已过期' ? 'text-red-500' : 'text-green-500'}`}>{selectedLink.status}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">创建时间</span>
                <span className="text-sm">{formatDate(selectedLink.created_at)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">有效期</span>
                <span className="text-sm">{selectedLink.expires_at ? formatDate(selectedLink.expires_at) : '永久'}</span>
              </div>
              {selectedLink.audio_url && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">文件大小</span>
                  <span className="text-sm">{formatFileSize(selectedLink.file_size)}</span>
                </div>
              )}
              <div className="border-b pb-2">
                <p className="text-gray-500 text-sm mb-1">设备分布</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(selectedLink.device_stats || {}).map(([device, count]) => (
                    <span key={device} className="bg-gray-100 px-2 py-0.5 rounded-full text-xs">{device}: {String(count)}</span>
                  ))}
                  {Object.keys(selectedLink.device_stats || {}).length === 0 && <span className="text-xs text-gray-400">暂无数据</span>}
                </div>
              </div>
              <div className="border-b pb-2">
                <p className="text-gray-500 text-sm mb-1">浏览器分布</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(selectedLink.browser_stats || {}).map(([browser, count]) => (
                    <span key={browser} className="bg-gray-100 px-2 py-0.5 rounded-full text-xs">{browser}: {String(count)}</span>
                  ))}
                  {Object.keys(selectedLink.browser_stats || {}).length === 0 && <span className="text-xs text-gray-400">暂无数据</span>}
                </div>
              </div>
              <div>
                <p className="text-gray-500 text-sm mb-1">操作系统分布</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(selectedLink.os_stats || {}).map(([os, count]) => (
                    <span key={os} className="bg-gray-100 px-2 py-0.5 rounded-full text-xs">{os}: {String(count)}</span>
                  ))}
                  {Object.keys(selectedLink.os_stats || {}).length === 0 && <span className="text-xs text-gray-400">暂无数据</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}