import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

// 恢复单个
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const { shortCode } = await params;
    const cookieStore = await cookies();
    const auth = cookieStore.get('admin_auth');
    if (!auth || auth.value !== 'true') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { error } = await supabase
      .from('links')
      .update({
        deleted_at: null,
        delete_reason: null,
      })
      .eq('short_code', shortCode);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: '恢复失败' }, { status: 500 });
  }
}

// 永久删除单个
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const { shortCode } = await params;
    const cookieStore = await cookies();
    const auth = cookieStore.get('admin_auth');
    if (!auth || auth.value !== 'true') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { error } = await supabase
      .from('links')
      .delete()
      .eq('short_code', shortCode);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: '永久删除失败' }, { status: 500 });
  }
}