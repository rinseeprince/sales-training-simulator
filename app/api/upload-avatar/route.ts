import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    console.log('📸 Avatar upload started');
    
    // Parse multipart form data
    const formData = await request.formData();
    const avatarFile = formData.get('avatar') as File;
    const userId = formData.get('userId') as string;

    console.log('📸 Avatar upload data:', { 
      hasFile: !!avatarFile, 
      userId, 
      fileSize: avatarFile?.size, 
      fileType: avatarFile?.type 
    });

    if (!avatarFile || !userId) {
      return NextResponse.json({ 
        error: 'Missing avatar file or user ID',
        success: false 
      }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(avatarFile.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPG, PNG, and GIF files are allowed.',
        success: false 
      }, { status: 400 });
    }

    // Validate file size (2MB limit)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (avatarFile.size > maxSize) {
      return NextResponse.json({ 
        error: 'File size too large. Maximum size is 2MB.',
        success: false 
      }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdmin();

    // Generate unique filename
    const fileExtension = avatarFile.name.split('.').pop() || 'jpg';
    const fileName = `${userId}/avatar.${fileExtension}`;

    // Delete old avatar if it exists
    try {
      await supabaseAdmin.storage
        .from('avatars')
        .remove([`${userId}/avatar.jpg`, `${userId}/avatar.jpeg`, `${userId}/avatar.png`, `${userId}/avatar.gif`]);
    } catch (error) {
      // Ignore errors when deleting old files - they might not exist
      console.log('No existing avatar to delete, or deletion failed:', error);
    }

    // Upload new avatar to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(fileName, avatarFile, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return NextResponse.json({ 
        error: 'Failed to upload avatar file',
        details: uploadError.message,
        success: false 
      }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;
    console.log('📸 Generated avatar URL:', avatarUrl);

    // Update user profile with new avatar URL
    // Try both auth_user_id and id fields for compatibility
    let updateError = null;
    const { error: authUserIdError } = await supabaseAdmin
      .from('simple_users')
      .update({ 
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('auth_user_id', userId);

    if (authUserIdError) {
      // Try with direct id match as fallback
      const { error: idError } = await supabaseAdmin
        .from('simple_users')
        .update({ 
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      updateError = idError;
    } else {
      updateError = authUserIdError;
    }

    if (updateError) {
      console.error('Failed to update user profile:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update user profile',
        details: updateError.message,
        success: false 
      }, { status: 500 });
    }

    // Also update Supabase auth metadata to persist avatar across sessions
    try {
      console.log('📸 Updating Supabase auth metadata with avatar...');
      const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          user_metadata: {
            avatar_url: avatarUrl
          }
        }
      );
      
      if (metadataError) {
        console.warn('📸 Failed to update auth metadata (non-critical):', metadataError.message);
      } else {
        console.log('📸 Successfully updated auth metadata with avatar');
      }
    } catch (metadataErr) {
      console.warn('📸 Auth metadata update failed (non-critical):', metadataErr);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Avatar uploaded successfully',
      avatarUrl
    });

  } catch (error) {
    console.error('Upload avatar error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload avatar',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }, { status: 500 });
  }
}