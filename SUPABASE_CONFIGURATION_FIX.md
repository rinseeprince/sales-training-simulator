# Supabase Email Verification Configuration Fix

## The Problem
The email verification links are expiring before they can be processed, causing users to be redirected to the error page instead of successfully verifying their email.

## Root Cause
The verification links are being processed by Supabase's built-in verification endpoint (`/auth/v1/verify`) instead of our custom callback route. The tokens are expiring before the verification completes.

## Solution

### Step 1: Configure Supabase Redirect URLs

In your Supabase dashboard:

1. **Go to Authentication → URL Configuration**
2. **Set the Site URL to:** `http://localhost:3000`
3. **Add these Redirect URLs:**
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/auth-code-error`
   - `http://localhost:3000/dashboard`

### Step 2: Configure Email Templates

1. **Go to Authentication → Email Templates**
2. **Click on "Confirm signup" template**
3. **Update the template to include the correct redirect URL:**
   ```
   {{ .ConfirmationURL }}
   ```
4. **Save the template**

### Step 3: Check Email Settings

1. **Go to Authentication → Settings**
2. **Under "Email Auth", make sure:**
   - "Enable email confirmations" is checked
   - "Secure email change" is checked
   - "Double confirm changes" is checked

### Step 4: Test the Configuration

After making these changes:

1. **Try signing up with a new email**
2. **Check the verification email immediately**
3. **Click the verification link within 5 minutes**

## Alternative Solution (If the above doesn't work)

If the verification links continue to expire, we can implement a custom verification flow:

1. **Disable email confirmation requirement in Supabase**
2. **Implement custom email verification using our own tokens**
3. **Use the existing verification endpoints we created**

## Current Status
- ✅ Signup is working
- ✅ Users are created in Supabase
- ✅ Verification emails are sent
- ❌ Verification links expire too quickly
- ❌ Callback route is not being reached

## Next Steps
1. Configure Supabase redirect URLs as described above
2. Test with a fresh signup
3. If still failing, implement custom verification flow
