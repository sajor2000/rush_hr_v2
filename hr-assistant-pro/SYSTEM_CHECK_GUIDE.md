# Azure OpenAI System Check Guide

## Overview
This guide helps you verify that your Azure OpenAI integration is working correctly with GPT-4o (gpt-4o-2 deployment).

## Quick System Check

### 1. **Web-Based System Monitor**
Visit: http://localhost:3000/system-check

Features:
- Real-time health status
- Service response times
- Memory usage
- Auto-refresh option
- Visual status indicators

### 2. **CLI System Check**
```bash
npm run system:check
```

This will:
- ✓ Verify environment configuration
- ✓ Test Azure OpenAI connection
- ✓ Run performance tests
- ✓ Estimate daily/monthly costs
- ✓ Provide recommendations

### 3. **API Health Check**
```bash
curl http://localhost:3000/api/system/health
```

Returns JSON with:
- Overall system status
- Individual service health
- Response times
- System information

### 4. **Full Integration Test**
```bash
curl -X POST http://localhost:3000/api/system/test
```

Tests all services:
- Job Type Detection
- Requirement Extraction
- Resume Evaluation
- Chat Service

## What Each Check Verifies

### Health Check (`/api/system/health`)
- ✓ Azure OpenAI connectivity
- ✓ All 4 services operational
- ✓ Response times within limits
- ✓ Memory usage acceptable

### Integration Test (`/api/system/test`)
- ✓ Job classification accuracy
- ✓ Requirement parsing
- ✓ Resume scoring logic
- ✓ Chat response generation

### CLI Tool (`npm run system:check`)
- ✓ Environment variables set
- ✓ API key validity
- ✓ Performance benchmarks
- ✓ Cost projections

## Expected Results

### Healthy System
```json
{
  "status": "healthy",
  "azure": {
    "enabled": true,
    "deployment": "gpt-4o-2"
  },
  "services": [
    { "name": "Resume Evaluation", "status": "operational", "responseTime": 1500 },
    { "name": "Chat Service", "status": "operational", "responseTime": 800 },
    { "name": "Job Classification", "status": "operational", "responseTime": 600 },
    { "name": "Requirement Extraction", "status": "operational", "responseTime": 700 }
  ]
}
```

### Response Time Benchmarks
- Simple queries: 500-1000ms
- Complex evaluations: 1000-3000ms
- Chat responses: 800-1500ms

## Troubleshooting

### Common Issues

1. **"unhealthy" status**
   - Check API key in .env.local
   - Verify deployment name matches Azure portal
   - Ensure network connectivity

2. **High response times (>3000ms)**
   - Normal for complex evaluations
   - Check Azure region latency
   - Monitor concurrent requests

3. **Service errors**
   - Check Azure portal for service health
   - Verify quota/rate limits
   - Review error logs in console

### Debug Mode
For detailed logging, run:
```bash
NODE_ENV=development npm run dev
```

Then check console for:
- "📊 Resume Evaluation using: Azure OpenAI"
- "💬 Chat Service using: Azure OpenAI"

## Cost Monitoring

The CLI tool provides estimates:
```
Estimated Daily Usage:
─────────────────────────────────────────────────────────
Resume Evaluation          100 ops/day   $19.00
Chat Message              500 ops/day   $12.00
Job Classification         50 ops/day   $2.65
Requirement Extraction     50 ops/day   $3.70
─────────────────────────────────────────────────────────
Total Daily Cost                        $37.35
Monthly Estimate (30d)                  $1,120.50
```

**Note**: Actual costs may vary. Monitor Azure portal for real usage.

## Best Practices

1. **Regular Monitoring**
   - Check system health daily
   - Set up Azure alerts for anomalies
   - Review response times weekly

2. **Performance Optimization**
   - Cache frequently requested data
   - Batch similar requests
   - Monitor token usage

3. **Security**
   - Rotate API keys regularly
   - Use environment variables only
   - Never commit keys to git

## Support

If issues persist:
1. Check Azure service status
2. Verify deployment configuration
3. Review application logs
4. Contact Azure support if needed