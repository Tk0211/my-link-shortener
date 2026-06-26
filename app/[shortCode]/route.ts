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

    // 1. 查询短链接
    const { data, error } = await supabase
      .from('links')
      .select('long_url, expires_at, click_count')
      .eq('short_code', shortCode)
      .maybeSingle();

    if (error) {
      console.error('❌ 数据库查询错误:', error);
      return NextResponse.json({ error: '数据库查询失败' }, { status: 500 });
    }

    if (!data) {
      console.log('❌ 短链接不存在:', shortCode);
      return NextResponse.json({ error: '短链接不存在' }, { status: 404 });
    }

    // 2. 检查是否过期
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      console.log('⏰ 短链接已过期:', shortCode);
      return NextResponse.json({ error: '短链接已过期' }, { status: 410 });
    }

    // 3. 获取客户端信息
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';

    // 4. 解析设备信息
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

    // 5. 记录点击（异步，但增加详细日志）
    const logClick = async () => {
      console.log('📝 开始记录点击:', shortCode);
      try {
        const insertData = {
          short_code: shortCode,
          ip: ip,
          user_agent: userAgent,
          referer: referer,
          device_type: deviceType,
          browser: browser,
          os: os,
        };
        console.log('📤 准备插入数据:', JSON.stringify(insertData));

        const { error: insertError } = await supabase
          .from('clicks')
          .insert([insertData]);

        if (insertError) {
          console.error('❌ Supabase 插入错误:', insertError);
          return;
        }

        console.log('✅ 插入成功');

        // 更新总点击次数
        const { error: updateError } = await supabase
          .from('links')
          .update({ click_count: (data.click_count || 0) + 1 })
          .eq('short_code', shortCode);

        if (updateError) {
          console.error('❌ 更新 click_count 失败:', updateError);
        } else {
          console.log('📊 点击记录已保存:', shortCode);
        }
      } catch (err) {
        console.error('❌ 记录点击异常:', err);
      }
    };

    // 触发记录（不等待）
    logClick();

    console.log('✅ 跳转:', shortCode, '→', data.long_url);
    
    // 6. 重定向
    return NextResponse.redirect(data.long_url, { status: 302 });

  } catch (err) {
    console.error('💥 服务器错误:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
