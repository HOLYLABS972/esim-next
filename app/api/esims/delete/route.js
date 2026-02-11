import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export async function DELETE(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    const { searchParams } = new URL(request.url);
    const esimId = searchParams.get('esimId');
    
    if (!esimId) {
      return NextResponse.json(
        { error: 'esimId parameter is required' },
        { status: 400 }
      );
    }
    
    // Delete the eSIM order
    const { data: deletedOrder, error } = await supabaseAdmin
      .from('esim_orders')
      .delete()
      .eq('id', esimId)
      .select()
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    if (!deletedOrder) {
      return NextResponse.json(
        { error: 'eSIM not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ eSIM deleted from Supabase:', esimId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'eSIM deleted successfully' 
    });
    
  } catch (error) {
    console.error('❌ Error deleting eSIM:', error);
    return NextResponse.json(
      { error: 'Failed to delete eSIM', details: error.message },
      { status: 500 }
    );
  }
}

