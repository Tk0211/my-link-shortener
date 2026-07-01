import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

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

    // 软删除：移到回收站
    const { error } = await supabase
      .from('links')
      .update({
        deleted_at: new Date().toISOString(),
        delete_reason: 'manual',
      })
      .eq('short_code', shortCode);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}