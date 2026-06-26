import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const { shortCode } = await params;

    const { data: linkData, error: linkError } = await supabase
      .from('links')
      .select('click_count, long_url, created_at, expires_at')
      .eq('short_code', shortCode)
      .maybeSingle();

    if (linkError || !linkData) {
      return NextResponse.json({ error: '短链接不存在' }, { status: 404 });
    }

    const { data: deviceStats } = await supabase
      .from('clicks')
      .select('device_type')
      .eq('short_code', shortCode);

    const deviceCount: Record<string, number> = {};
    if (deviceStats) {
      deviceStats.forEach((item: any) => {
        const key = item.device_type || 'Unknown';
        deviceCount[key] = (deviceCount[key] || 0) + 1;
      });
    }

    const { data: browserStats } = await supabase
      .from('clicks')
      .select('browser')
      .eq('short_code', shortCode);

    const browserCount: Record<string, number> = {};
    if (browserStats) {
      browserStats.forEach((item: any) => {
        const key = item.browser || 'Unknown';
        browserCount[key] = (browserCount[key] || 0) + 1;
      });
    }

    return NextResponse.json({
      short_code: shortCode,
      total_clicks: linkData.click_count || 0,
      long_url: linkData.long_url,
      created_at: linkData.created_at,
      expires_at: linkData.expires_at,
      device_distribution: deviceCount,
      browser_distribution: browserCount,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}