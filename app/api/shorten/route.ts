import { nanoid } from 'nanoid';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { longUrl, expiresIn = 'permanent', audioUrl = null, customCode = null } = await request.json();
    
    if (!longUrl) {
      return NextResponse.json({ error: '请提供长链接' }, { status: 400 });
    }

    // ----- 生成短码逻辑 -----
    let shortCode = customCode;
    if (!shortCode) {
      // 用户没填，自动生成（6位随机）
      shortCode = nanoid(6);
    } else {
      // 用户填了，验证格式
      if (!/^[a-zA-Z0-9]{3,20}$/.test(shortCode)) {
        return NextResponse.json({ error: '短码仅支持字母和数字，长度3-20位' }, { status: 400 });
      }
      
      // 检查是否已被占用
      const { data: existing, error: checkError } = await supabase
        .from('links')
        .select('short_code')
        .eq('short_code', shortCode)
        .maybeSingle();

      if (checkError) {
        console.error('检查短码失败:', checkError);
        return NextResponse.json({ error: '检查短码失败' }, { status: 500 });
      }

      if (existing) {
        return NextResponse.json({ error: '该短码已被占用，请换一个' }, { status: 409 });
      }
    }

    // 计算过期时间
    let expiresAt = null;
    if (expiresIn !== 'permanent') {
      const days = parseInt(expiresIn, 10);
      if (!isNaN(days)) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
      }
    }

    // 准备插入数据
    const insertData: any = {
      short_code: shortCode,
      long_url: longUrl,
      expires_at: expiresAt,
      click_count: 0,
    };
    
    if (audioUrl) {
      insertData.audio_url = audioUrl;
    }

    const { error } = await supabase
      .from('links')
      .insert([insertData]);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: '保存失败: ' + error.message }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bengniao.cn';
    const shortUrl = `${baseUrl}/${shortCode}`;
    
    return NextResponse.json({ shortCode, shortUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
