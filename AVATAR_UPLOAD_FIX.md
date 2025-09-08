# Avatar Upload Fix Documentation

## Issue
The avatar upload feature was not working because:
1. The `avatars` storage bucket was not created in Supabase
2. There were browser caching issues preventing the new avatar from displaying immediately

## Solution Applied

### 1. Created Storage Bucket Setup Script
Created `/scripts/setup-avatars-bucket.sql` to set up the avatars storage bucket in Supabase with:
- 2MB file size limit
- Support for JPEG, PNG, and GIF images
- Proper RLS policies for user-specific avatar management
- Public read access for displaying avatars

### 2. Fixed Caching Issues
Updated `/components/pages/settings.tsx` to:
- Add timestamp query parameters to avatar URLs to prevent browser caching
- Call `loadUserProfile()` after successful upload to refresh the displayed avatar
- Watch for changes in `user?.avatar_url` to trigger profile reload

## Setup Instructions

### Step 1: Create the Avatars Storage Bucket
1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Run the script from `/scripts/setup-avatars-bucket.sql`
4. This will create the `avatars` bucket with proper permissions

### Step 2: Verify the Setup
1. Go to Storage in your Supabase Dashboard
2. You should see an `avatars` bucket listed
3. Check that the bucket is set to "Public"

### Step 3: Test the Feature
1. Go to the Settings page in your app
2. Click "Change Avatar"
3. Select an image file (JPG, PNG, or GIF, max 2MB)
4. The avatar should upload and display immediately

## How It Works

1. **Upload Process:**
   - User selects an image file
   - File is uploaded to Supabase Storage in the `avatars` bucket
   - File is stored at path: `{userId}/avatar.{extension}`
   - Old avatar files are automatically deleted before uploading new ones

2. **Display Process:**
   - Avatar URL is stored in the `simple_users` table
   - URL includes a timestamp query parameter to prevent caching
   - Avatar is fetched from both the database and auth metadata

3. **Permissions:**
   - Users can only upload/update/delete their own avatars
   - Anyone can view avatars (public read access)
   - Service role has full access for admin operations

## Troubleshooting

If avatars still don't display after upload:

1. **Check Browser Console:**
   - Look for any 404 errors when loading the avatar URL
   - Check for CORS errors

2. **Verify Bucket Exists:**
   - Go to Supabase Dashboard > Storage
   - Ensure `avatars` bucket exists and is public

3. **Check Database:**
   - Query the `simple_users` table
   - Verify the `avatar_url` column contains the correct URL

4. **Clear Browser Cache:**
   - Hard refresh the page (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
   - Try in an incognito/private window

5. **Check Supabase Logs:**
   - Go to Supabase Dashboard > Logs
   - Look for any storage-related errors

## Files Modified

1. `/components/pages/settings.tsx` - Added cache-busting timestamps and improved avatar refresh logic
2. `/scripts/setup-avatars-bucket.sql` - New file for creating the storage bucket
3. `/app/api/upload-avatar/route.ts` - Already configured correctly, no changes needed
4. `/app/api/user-profile/route.ts` - Already configured correctly, no changes needed 