import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

// 定义统计数据的类型
interface LinkStats {
  devices: Record<string, number>;
  browsers: Record<string, number>;
  oss: Record<string, number>;
  ips: string[];
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const auth = cookieStore.get('admin_auth');
    if (!auth || auth.value !== 'true') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type');

    let query = supabase
      .from('links')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data: links, error } = await query;
    if (error) throw error;

    // 获取点击统计
    const { data: allClicks } = await supabase.from('clicks').select('short_code, device_type, browser, os, ip');

    const statsMap: Record<string, LinkStats> = {};
    if (allClicks) {
      for (const click of allClicks) {
        const code = click.short_code;
        if (!statsMap[code]) {
          statsMap[code] = { devices: {}, browsers: {}, oss: {}, ips: [] };
        }
        const device = click.device_type || 'Unknown';
        const browser = click.browser || 'Unknown';
        const os = click.os || 'Unknown';
        // 明确类型为 number
        statsMap[code].devices[device] = (statsMap[code].devices[device] || 0) + 1;
        statsMap[code].browsers[browser] = (statsMap[code].browsers[browser] || 0) + 1;
        statsMap[code].oss[os] = (statsMap[code].oss[os] || 0) + 1;
        if (click.ip && click.ip !== 'unknown') {
          statsMap[code].ips.push(click.ip);
        }
      }
    }

    const now = new Date();
    const result = links.map(link => {
      const stats = statsMap[link.short_code] || { devices: {}, browsers: {}, oss: {}, ips: [] };
      let mainDevice = '无数据';
      let maxCount = 0;
      // 明确类型，使用 for...of 配合 Object.entries 并断言类型
      for (const [device, count] of Object.entries(stats.devices) as [string, number][]) {
        if (count > maxCount) {
          maxCount = count;
          mainDevice = device;
        }
      }
      const total = Object.values(stats.devices).reduce((a: number, b: number) => a + b, 0);
      const percent = total > 0 ? Math.round((maxCount / total) * 100) : 0;
      const deviceDisplay = total > 0 ? `${mainDevice}(${percent}%)` : '无数据';

      let status = '有效';
      if (link.expires_at && new Date(link.expires_at) < now) {
        status = '已过期';
      }

      return {
        ...link,
        device_display: deviceDisplay,
        status: status,
        device_stats: stats.devices,
        browser_stats: stats.browsers,
        os_stats: stats.oss,
        ips: stats.ips,
      };
    });

    return NextResponse.json({ links: result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: '加载失败' }, { status: 500 });
  }
}

// 软删除（移到回收站）
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const auth = cookieStore.get('admin_auth');
    if (!auth || auth.value !== 'true') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { shortCodes } = await request.json();
    if (!shortCodes || !Array.isArray(shortCodes) || shortCodes.length === 0) {
      return NextResponse.json({ error: '请选择要删除的短码' }, { status: 400 });
    }

    const { error } = await supabase
      .from('links')
      .update({
        deleted_at: new Date().toISOString(),
        delete_reason: 'manual',
      })
      .in('short_code', shortCodes);

    if (error) throw error;

    return NextResponse.json({ success: true, deleted: shortCodes.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}