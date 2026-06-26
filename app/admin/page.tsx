'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/links')
      .then(res => {
        if (res.status === 401) {
          router.push('/admin/login');
          return;
        }
        return res.json();
      })
      .then(data => {
        if (data?.links) setLinks(data.links);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-gray-400">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">📊 后台管理</h1>
          <div className="flex gap-3">
            <Link href="/" className="text-sm text-gray-500 hover:text-emerald-500">← 返回首页</Link>
            <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-600">退出</button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm text-gray-500">短码</th>
                  <th className="px-4 py-3 text-left text-sm text-gray-500">目标链接</th>
                  <th className="px-4 py-3 text-center text-sm text-gray-500">点击</th>
                  <th className="px-4 py-3 text-left text-sm text-gray-500">创建时间</th>
                  <th className="px-4 py-3 text-left text-sm text-gray-500">有效期</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {links.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">暂无数据</td></tr>
                ) : (
                  links.map((link: any) => (
                    <tr key={link.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm text-emerald-600">/{link.short_code}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-[200px]">{link.long_url}</td>
                      <td className="px-4 py-3 text-center font-semibold">{link.click_count || 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{new Date(link.created_at).toLocaleString('zh-CN')}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{link.expires_at ? new Date(link.expires_at).toLocaleString('zh-CN') : '永久'}</td>
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