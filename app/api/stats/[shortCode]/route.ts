import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const { shortCode } = await params;

    // 只获取基本信息，不查 clicks 表
    const { data: linkData, error: linkError } = await supabase
      .from('links')
      .select('click_count, long_url, created_at, expires_at')
      .eq('short_code', shortCode)
      .maybeSingle();

    if (linkError || !linkData) {
      return NextResponse.json({ error: '短链接不存在' }, { status: 404 });
    }

    return NextResponse.json({
      short_code: shortCode,
      total_clicks: linkData.click_count || 0,
      long_url: linkData.long_url,
      created_at: linkData.created_at,
      expires_at: linkData.expires_at,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}