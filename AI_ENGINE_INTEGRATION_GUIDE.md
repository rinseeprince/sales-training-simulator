# AI Engine Integration Guide

## ✅ What's Been Done

### 1. **Database Migration** ✅
You've already run the migration script which added:
- New tables: `business_models`, `scoring_rubrics`, `performance_trends`, etc.
- Enhanced columns in `scenarios` and `calls` tables
- Sample data and scoring rubrics

### 2. **API Updates** ✅
- Updated `use-voice-streaming.ts` to call `/api/stream-gpt-voice-v2`
- Enhanced `save-call` API to use the new scoring engine
- Updated scenario builder to save new AI engine fields

### 3. **New API Endpoints Created** ✅
- `/api/stream-gpt-voice-v2` - Enhanced AI prospect conversations
- `/api/score-call-v2` - Comprehensive scoring and coaching
- `/api/business-models` - Business context management
- `/api/ai-engine/test` - Testing and validation

## 🚀 Quick Test Instructions

### 1. **Start Your Server**
```bash
npm run dev
```

### 2. **Test the AI Engine** 
Go to your Scenario Builder and create a new scenario:
- Select "Discovery Call (Outbound)"
- Set Seniority to "Manager" or "Director"
- Set Difficulty to 3 (medium)
- Enter a scenario like: "You are the IT Director at a 500-person software company experiencing CRM performance issues"

### 3. **Run a Simulation**
Start the simulation and say:
- "Hi, thanks for taking my call. I understand you're the IT Director?"

You should get a much more realistic, persona-appropriate response!

### 4. **Check the Scoring**
After completing a call, the review page should show:
- Detailed metrics breakdown
- Personalized coaching feedback
- Specific strengths and improvements

## 🎯 What You'll Notice

### Before (Old System):
- Generic AI responses
- Basic scoring (just a number)
- Simple feedback bullets

### After (New AI Engine):
- **Realistic Personas**: Prospects act according to their role level
- **Dynamic Difficulty**: Prospects can be cooperative or challenging
- **Comprehensive Scoring**: 5 weighted metrics with detailed analysis
- **Actionable Coaching**: Specific feedback with examples and next steps
- **Conversation Memory**: AI remembers what was discussed

## 📝 Optional Enhancements

### 1. **Create Business Models** (Optional)
You can create richer scenarios by defining business contexts:

```javascript
// In your browser console on the app
fetch('/api/business-models', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    company_name: "Global Retail Corp",
    industry: "Retail",
    company_size: "large",
    products: [{"name": "Inventory System", "price": "$50K/year"}],
    common_objections: ["Happy with current system", "No budget this year"]
  })
})
```

### 2. **Update Live Simulation UI** (Optional)
To show real-time AI insights, you could add to your simulation page:
- Current conversation phase indicator
- Rapport level meter
- Objection counter
- Real-time tips

### 3. **Enhance Post-Call Review** (Optional)
The new scoring data includes rich analytics you could display:
- Metric breakdown charts
- Talk ratio visualization
- Question quality analysis
- Objection handling timeline

## 🧪 Testing Different Scenarios

Try these to see the AI engine's capabilities:

### Easy Prospect (Level 1)
- Seniority: Junior
- Difficulty: 1
- They'll be cooperative and share information freely

### Challenging Executive (Level 5)
- Seniority: C-Level
- Difficulty: 5
- They'll be skeptical, time-conscious, and hard to convince

### Objection Practice
- Call Type: Objection Handling
- The AI will focus on presenting realistic objections

## 🐛 Troubleshooting

**If AI responses seem generic:**
- Check browser console for errors
- Ensure sessionId is being maintained
- Verify persona level is being passed

**If scoring isn't detailed:**
- Check that save-call is using the new fields
- Look for detailed_metrics in the database

**If voice isn't working:**
- ElevenLabs API key might need credits
- System will fall back to browser speech synthesis

## ✨ Summary

Your AI engine is now fully integrated! The main user-facing changes are:
1. More realistic AI prospects in simulations
2. Comprehensive scoring with coaching feedback
3. Better conversation flow and memory

Everything else works the same way - just much smarter under the hood!