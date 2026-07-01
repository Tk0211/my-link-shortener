import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const { shortCode } = await params;
    console.log('🔍 查询短码:', shortCode);

    // 查询短链接（包括已删除的，以便判断）
    const { data, error } = await supabase
      .from('links')
      .select('long_url, expires_at, click_count, deleted_at')
      .eq('short_code', shortCode)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: '短链接不存在' }, { status: 404 });
    }

    // 如果已在回收站
    if (data.deleted_at) {
      return NextResponse.json({ error: '短链接已被删除' }, { status: 410 });
    }

    // 检查是否过期
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      // 自动移入回收站
      await supabase
        .from('links')
        .update({
          deleted_at: new Date().toISOString(),
          delete_reason: 'expired',
        })
        .eq('short_code', shortCode);

      return NextResponse.json({ error: '短链接已过期，已移入回收站' }, { status: 410 });
    }

    // 获取客户端信息
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';

    let deviceType = 'Unknown';
    let browser = 'Unknown';
    let os = 'Unknown';

    if (userAgent) {
      const ua = userAgent.toLowerCase();
      if (ua.includes('mobile')) deviceType = 'Mobile';
      else if (ua.includes('tablet')) deviceType = 'Tablet';
      else deviceType = 'Desktop';

      if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
      else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
      else if (userAgent.includes('Firefox')) browser = 'Firefox';
      else if (userAgent.includes('Edg')) browser = 'Edge';

      if (userAgent.includes('Windows')) os = 'Windows';
      else if (userAgent.includes('Mac')) os = 'macOS';
      else if (userAgent.includes('Linux')) os = 'Linux';
      else if (userAgent.includes('Android')) os = 'Android';
      else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    }

    // 记录点击
    const logClick = async () => {
      try {
        await supabase.from('clicks').insert([
          {
            short_code: shortCode,
            ip: ip,
            user_agent: userAgent,
            referer: referer,
            device_type: deviceType,
            browser: browser,
            os: os,
          },
        ]);
        await supabase
          .from('links')
          .update({ click_count: (data.click_count || 0) + 1 })
          .eq('short_code', shortCode);
        console.log('📊 点击记录已保存:', shortCode);
      } catch (err) {
        console.error('❌ 记录点击失败:', err);
      }
    };

    logClick();

    console.log('✅ 跳转:', shortCode, '→', data.long_url);
    return NextResponse.redirect(data.long_url, { status: 302 });

  } catch (err) {
    console.error('💥 服务器错误:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}