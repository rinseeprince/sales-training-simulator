# Free Tier Limits and Business Email Validation

## Overview
This document describes the implementation of two key features:
1. **50 Simulation Limit for Free Users** - Free tier users are limited to 50 simulations per month
2. **Business Email Requirement** - Only business email addresses are accepted for sign-ups

## Features Implemented

### 1. Simulation Limits (50 for Free Tier)

#### Database Changes
- Added columns to `simple_users` table:
  - `simulation_count` - Tracks number of simulations used
  - `simulation_limit` - Set to 50 for free users
  - `last_simulation_at` - Timestamp of last simulation

- Created SQL functions:
  - `increment_simulation_count(user_id)` - Increments count and checks limit
  - `check_simulation_limit(user_id)` - Returns remaining simulations
  - `reset_simulation_count(user_id)` - Resets count (for admin/monthly reset)

- Added automatic trigger to increment count when new calls are created

#### API Endpoint
- `/api/check-simulation-limit` - GET endpoint to check user's remaining simulations

#### UI Components Updated
1. **Dashboard** - Shows usage card with progress bar for free users
2. **Scenario Builder** - Checks limit before starting simulation
3. **Toast Notifications** - Warns when approaching limit (under 10 remaining)

#### How It Works
- Free users get 50 simulations per month
- Paid/trial users have unlimited simulations
- Count automatically increments when simulation is saved
- Users see remaining count on dashboard
- Blocked from starting new simulations when limit reached
- Prompted to upgrade with direct link to pricing page

### 2. Business Email Validation

#### Email Validation Library
Created `/lib/email-validation.ts` with:
- List of 80+ personal email domains to block (Gmail, Yahoo, Hotmail, etc.)
- Pattern matching for disposable/temporary emails
- Validation function that returns detailed error messages

#### Components Updated
1. **AuthModal** (`/components/auth/auth-modal.tsx`)
   - Real-time validation as user types
   - Visual indicators (✓ for business, ⚠️ for personal)
   - Clear error messages explaining requirement
   - Blocks sign-up for personal emails

2. **SimpleSignUpForm** (`/components/auth/simple-sign-up-form.tsx`)
   - Same validation as AuthModal
   - "Business Email" label to set expectations
   - Placeholder shows "you@company.com"

#### Blocked Email Domains Include:
- **Major Providers**: Gmail, Yahoo, Hotmail, Outlook, iCloud, AOL
- **Privacy-Focused**: ProtonMail, Tutanota, Mailfence
- **International**: QQ, Sina, Naver, Yandex, Mail.ru
- **Temporary/Disposable**: 10minutemail, Guerrillamail, Mailinator
- **And 60+ more...**

## Setup Instructions

### 1. Database Setup
Run the following SQL script in your Supabase SQL Editor:
```sql
-- Run the script from /scripts/add-simulation-limits.sql
```

This will:
- Add necessary columns to simple_users table
- Create the tracking functions
- Set up automatic triggers

### 2. Environment Variables
Ensure these are set in your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Testing

#### Test Simulation Limits:
1. Create a free user account (using business email)
2. Check dashboard - should show "0 used, 50 remaining"
3. Run simulations and watch count increase
4. At 40+ simulations, see warning messages
5. At 50 simulations, get blocked with upgrade prompt

#### Test Business Email Validation:
1. Try signing up with personal email (e.g., test@gmail.com)
   - Should see red X and error message
   - Sign-up button should be blocked
2. Try with business email (e.g., john@company.com)
   - Should see green checkmark
   - Sign-up proceeds normally

## Customization

### Adjusting Simulation Limit
To change the limit from 50 to another number:
1. Update the default in the SQL script
2. Run: `UPDATE simple_users SET simulation_limit = NEW_LIMIT WHERE subscription_status = 'free';`

### Adding Email Domains to Whitelist
Edit `/lib/email-validation.ts`:
```typescript
const WHITELISTED_DOMAINS: string[] = [
  'yourcompany.com',
  'partner.com'
];
```

### Adding Email Domains to Blocklist
Edit `/lib/email-validation.ts`:
```typescript
const PERSONAL_EMAIL_DOMAINS = [
  // ... existing domains
  'newdomain.com'
];
```

## User Experience

### For Free Users:
1. Dashboard shows usage progress bar
2. Warnings appear at 10 simulations remaining
3. Clear upgrade path when limit reached
4. Count resets monthly (implement cron job if needed)

### For Sign-ups:
1. Clear "Business Email" label
2. Real-time validation feedback
3. Helpful error messages
4. Green checkmark for valid business emails

## Future Enhancements

### Potential Improvements:
1. **Monthly Reset** - Add cron job to reset counts on 1st of month
2. **Grace Period** - Allow 1-2 extra simulations with strong upgrade prompt
3. **Email Verification** - Verify business email domain actually exists
4. **Team Domains** - Auto-approve specific company domains
5. **Usage Analytics** - Track conversion from free to paid at limit
6. **Flexible Limits** - Different limits for different subscription tiers

## Troubleshooting

### Common Issues:

1. **Simulation count not incrementing**
   - Check if trigger is properly created in database
   - Verify calls table insert is successful

2. **Business email rejected**
   - Check if domain is in blocklist
   - May need to add to whitelist for special cases

3. **Limit not enforced**
   - Ensure API endpoint is accessible
   - Check user has correct subscription_status

4. **Email validation too strict**
   - Can adjust validation rules in email-validation.ts
   - Consider allowing some professional personal emails

## Support
For issues or questions about these features:
1. Check browser console for errors
2. Verify database functions are created
3. Test with different email domains
4. Check user's subscription_status in database 