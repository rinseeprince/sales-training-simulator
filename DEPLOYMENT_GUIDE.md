# Sales Training Simulator - Deployment Guide

## 🚀 Quick Deployment Options

### Option 1: Vercel (Recommended)
Vercel is perfect for Next.js applications and offers seamless deployment.

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Configure environment variables (see below)
   - Deploy!

### Option 2: Netlify
1. Connect your GitHub repository to Netlify
2. Build command: `npm run build`
3. Publish directory: `.next`
4. Configure environment variables

### Option 3: Railway
1. Go to [railway.app](https://railway.app)
2. Connect GitHub repository
3. Railway will auto-detect Next.js and deploy

## 🔧 Required Environment Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-app-domain.com

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key
DEFAULT_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# AI Configuration
AI_SIM_MODEL=gpt-4o
AI_COACH_MODEL=gpt-4o
AI_ENGINE_LEGACY=false
```

## 📋 Pre-Deployment Checklist

- [ ] Supabase project is set up and configured
- [ ] Database tables are created (use scripts in `/scripts/`)
- [ ] Environment variables are configured
- [ ] OpenAI API key is valid and has credits
- [ ] ElevenLabs API key is valid (optional but recommended)
- [ ] Email redirect URLs are updated in Supabase Auth settings

## 🔗 Supabase Configuration

### 1. Update Auth Redirect URLs
In your Supabase dashboard:
- Go to Authentication > URL Configuration
- Add your production domain to "Site URL"
- Add redirect URLs:
  - `https://your-domain.com/auth/callback`
  - `https://your-domain.com/dashboard`

### 2. Database Setup
Run these SQL scripts in your Supabase SQL editor:
```sql
-- From /scripts/simple-auth-schema.sql
-- From /scripts/ai-engine-migrations.sql  
-- From /scripts/usage-tracking-schema.sql
```

## 🛠 Build Configuration

Your `next.config.mjs` is already configured for production:
- ESLint errors ignored during build
- TypeScript errors ignored during build
- Images unoptimized for static export compatibility

## 🚀 Quick Deploy Commands

### For Vercel CLI:
```bash
npm install -g vercel
vercel --prod
```

### For Docker (if needed):
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔍 Post-Deployment Testing

1. Test user registration and email verification
2. Test login/logout functionality  
3. Test simulation creation and audio recording
4. Test AI voice generation (if ElevenLabs is configured)
5. Test database operations (saving calls, scenarios)

## 🚨 Common Issues

1. **CORS errors**: Make sure NEXT_PUBLIC_APP_URL matches your domain
2. **Auth redirects fail**: Check Supabase redirect URL configuration
3. **API failures**: Verify all environment variables are set
4. **Audio issues**: Check ElevenLabs API key and browser permissions

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check Vercel/Netlify deployment logs
3. Verify all environment variables are set correctly
4. Check Supabase logs for database errors

---

**Ready to deploy? Choose your platform and follow the steps above!** 🚀
