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

    let query = supabase
      .from('links')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data: links, error } = await query;
    if (error) throw error;

    const result = links.map(link => ({
      ...link,
      deleted_at_formatted: link.deleted_at ? new Date(link.deleted_at).toLocaleString('zh-CN') : '-',
      delete_reason_label: link.delete_reason === 'manual' ? '手动删除' : link.delete_reason === 'expired' ? '自动过期' : '未知',
    }));

    return NextResponse.json({ links: result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: '加载失败' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const auth = cookieStore.get('admin_auth');
    if (!auth || auth.value !== 'true') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { shortCodes } = await request.json();
    if (!shortCodes || !Array.isArray(shortCodes) || shortCodes.length === 0) {
      return NextResponse.json({ error: '请选择要恢复的短码' }, { status: 400 });
    }

    const { error } = await supabase
      .from('links')
      .update({
        deleted_at: null,
        delete_reason: null,
      })
      .in('short_code', shortCodes);

    if (error) throw error;

    return NextResponse.json({ success: true, restored: shortCodes.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: '恢复失败' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const auth = cookieStore.get('admin_auth');
    if (!auth || auth.value !== 'true') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { shortCodes } = await request.json();
    if (!shortCodes || !Array.isArray(shortCodes) || shortCodes.length === 0) {
      return NextResponse.json({ error: '请选择要永久删除的短码' }, { status: 400 });
    }

    const { error } = await supabase
      .from('links')
      .delete()
      .in('short_code', shortCodes);

    if (error) throw error;

    return NextResponse.json({ success: true, permanently_deleted: shortCodes.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: '永久删除失败' }, { status: 500 });
  }
}