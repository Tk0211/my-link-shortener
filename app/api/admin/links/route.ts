import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const auth = cookieStore.get('admin_auth');
    if (!auth || auth.value !== 'true') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type');

    let query = supabase.from('links').select('*').order('created_at', { ascending: false });
    if (type) {
      query = query.eq('type', type);
    }

    const { data: links, error } = await query;
    if (error) throw error;

    // 获取所有点击记录用于统计设备类型
    const { data: allClicks } = await supabase.from('clicks').select('short_code, device_type');

    const deviceStatsMap: Record<string, Record<string, number>> = {};
    if (allClicks) {
      for (const click of allClicks) {
        const code = click.short_code;
        const device = click.device_type || 'Unknown';
        if (!deviceStatsMap[code]) deviceStatsMap[code] = {};
        deviceStatsMap[code][device] = (deviceStatsMap[code][device] || 0) + 1;
      }
    }

    const result = links.map(link => {
      const stats = deviceStatsMap[link.short_code] || {};
      let mainDevice = '无数据';
      let maxCount = 0;
      for (const [device, count] of Object.entries(stats)) {
        if (count > maxCount) {
          maxCount = count;
          mainDevice = device;
        }
      }
      const total = Object.values(stats).reduce((a, b) => a + b, 0);
      const percent = total > 0 ? Math.round((maxCount / total) * 100) : 0;
      const deviceDisplay = total > 0 ? `${mainDevice}(${percent}%)` : '无数据';

      return {
        ...link,
        device_stats: stats,
        device_display: deviceDisplay,
      };
    });

    return NextResponse.json({ links: result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: '加载失败' }, { status: 500 });
  }
}

// 批量删除
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
      .delete()
      .in('short_code', shortCodes);

    if (error) throw error;

    return NextResponse.json({ success: true, deleted: shortCodes.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}