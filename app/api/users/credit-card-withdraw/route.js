import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    const data = await request.json();
    const { userId } = data;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Find user in Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Only allow withdrawal if status is not active or approved
    const creditCardStatus = user.credit_card_status;
    if (creditCardStatus === 'active' || creditCardStatus === 'approved') {
      return NextResponse.json(
        { error: 'Cannot withdraw active or approved credit card applications' },
        { status: 400 }
      );
    }
    
    // Allow withdrawal if user has any credit card data
    const hasCardData = creditCardStatus || 
                       user.credit_card_application_data || 
                       user.credit_card_applied || 
                       user.has_credit_card;
    
    if (!hasCardData) {
      return NextResponse.json(
        { error: 'No credit card application to withdraw' },
        { status: 400 }
      );
    }
    
    // Delete all credit card related transactions (orders)
    const { data: creditCardOrders, error: ordersError } = await supabaseAdmin
      .from('esim_orders')
      .select('id')
      .eq('user_id', userId)
      .or('metadata->type.eq.credit_card_application');
    
    if (ordersError && ordersError.code !== 'PGRST116') {
      console.error('Error finding credit card orders:', ordersError);
    }
    
    // Delete all credit card related orders
    if (creditCardOrders && creditCardOrders.length > 0) {
      const orderIds = creditCardOrders.map(order => order.id);
      const { error: deleteError } = await supabaseAdmin
        .from('esim_orders')
        .delete()
        .in('id', orderIds);
      
      if (deleteError) {
        console.error('Error deleting credit card orders:', deleteError);
      } else {
        console.log(`✅ Deleted ${orderIds.length} credit card transaction(s) for user: ${userId}`);
      }
    }
    
    // Reset credit card application data
    const updateData = {
      credit_card_applied: false,
      has_credit_card: false,
      credit_card_status: null,
      credit_card_application_data: null,
      updated_at: new Date().toISOString()
    };
    
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();
    
    if (updateError) {
      throw updateError;
    }
    
    console.log('✅ Credit card application withdrawn for user:', userId);
    
    // Return updated user data so frontend can update its cache
    return NextResponse.json({
      success: true,
      message: 'Credit card application withdrawn successfully',
      user: {
        id: updatedUser.id,
        _id: updatedUser.id,
        hasCreditCard: updatedUser.has_credit_card,
        creditCardApplied: updatedUser.credit_card_applied,
        creditCardStatus: updatedUser.credit_card_status,
        creditCardApplicationData: updatedUser.credit_card_application_data,
      },
    });
    
  } catch (error) {
    console.error('❌ Error withdrawing credit card application:', error);
    return NextResponse.json(
      { error: 'Failed to withdraw credit card application', details: error.message },
      { status: 500 }
    );
  }
}

