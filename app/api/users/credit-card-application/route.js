import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabase';

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }
    
    const data = await request.json();
    const { userId, phone, country, city, street, postalCode, promocode, comment, planId, planName } = data;
    
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
    
    // Update user with credit card application data
    const updateData = {
      credit_card_applied: true,
      has_credit_card: true,
      credit_card_status: 'pending',
      credit_card_application_data: {
        phone: phone || null,
        country: country || null,
        city: city || null,
        street: street || null,
        postal_code: postalCode || null,
        promocode: promocode || null,
        comment: comment || null,
        plan_id: planId || null,
        plan_name: planName || null,
        applied_at: new Date().toISOString(),
      },
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
    
    console.log('✅ Credit card application saved for user:', userId);
    
    return NextResponse.json({
      success: true,
      message: 'Credit card application submitted successfully',
      user: {
        id: updatedUser.id,
        hasCreditCard: updatedUser.has_credit_card,
        creditCardStatus: updatedUser.credit_card_status,
      },
    });
    
  } catch (error) {
    console.error('❌ Error processing credit card application:', error);
    return NextResponse.json(
      { error: 'Failed to process credit card application', details: error.message },
      { status: 500 }
    );
  }
}

