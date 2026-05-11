# SmartWriter AI Platform - Implementation Guide

## Project Overview

SmartWriter is a comprehensive AI-powered content automation platform that runs entirely on mobile devices. It combines article generation, automatic publishing to Blogger, smart scheduling, and advanced analytics into a single, powerful application.

## Architecture Overview

### Core Systems

#### 1. State Management (Zustand Stores)
Located in `/lib/stores/`:

- **auth.store.ts** - Manages Blogger authentication and OAuth tokens
  - Stores credentials securely using expo-secure-store
  - Handles token expiration and refresh
  - Manages blog account information

- **posts.store.ts** - Manages article lifecycle
  - Tracks posts through draft → scheduled → published states
  - Stores content scores and metadata
  - Manages retry counts and failure reasons

- **scheduler.store.ts** - Manages publication schedules
  - Supports multiple scheduling frequencies
  - Calculates next publish times
  - Tracks schedule failures and retries

- **settings.store.ts** - Manages app and Blogger settings
  - Blogger configuration (Blog ID, auto-publish, draft mode)
  - App settings (timezone, notifications, backup frequency)
  - Request timeout and SSL configuration

- **logs.store.ts** - System logging and monitoring
  - Stores up to 1000 log entries
  - Supports filtering by level and context
  - Provides export functionality

#### 2. Security Layer
Located in `/lib/_core/`:

- **secure-store.ts** - Wrapper around expo-secure-store
  - Encrypts sensitive data using device keychain
  - Handles JSON serialization for complex objects
  - Provides error logging and recovery

#### 3. Service Layer
Located in `/lib/services/`:

- **blogger-service.ts** - Blogger API Integration
  - OAuth authentication support
  - CRUD operations for blog posts
  - Connection validation
  - SSL-only requests with timeout handling
  - Comprehensive error handling

- **scheduler-service.ts** - Publication Scheduling
  - Manages background scheduling
  - Executes schedules based on frequency
  - Handles retry logic with exponential backoff
  - Integrates with queue service

- **queue-service.ts** - Offline Queue Management
  - Stores pending posts when offline
  - Automatically processes queue when connection restored
  - Implements retry mechanism with priority
  - Persists queue to AsyncStorage

- **gemini-enhanced.ts** - AI Content Generation
  - Integrates with Google Gemini API
  - Generates content from 7 templates
  - Calculates content quality scores:
    - SEO Score (0-100)
    - Human Score (0-100)
    - Readability Score (0-100)
    - Engagement Score (0-100)
  - Generates suggestions for titles, tags, keywords
  - Humanizes and rewrites content

#### 4. UI Screens
Located in `/app/(tabs)/`:

- **index.tsx** - Home screen (existing)
  - Article list and generation interface

- **settings.tsx** - Settings screen (existing)
  - General app configuration

- **blogger-settings.tsx** - Blogger Configuration
  - OAuth login interface
  - Blog ID configuration
  - Connection validation
  - Auto-publish toggles
  - Retry configuration

- **queue-status.tsx** - Queue Monitoring
  - Real-time queue status
  - Failed post management
  - Manual queue processing
  - Retry functionality

- **analytics.tsx** - Analytics Dashboard
  - Publishing statistics
  - Quality metrics
  - Template performance
  - Status breakdown with visualizations

- **logs-viewer.tsx** - System Logs
  - Log filtering and search
  - Level-based filtering
  - Export functionality
  - Real-time monitoring

## Feature Implementation Details

### 1. Blogger Integration

#### OAuth Flow
```typescript
// Initialize with OAuth token and Blog ID
await bloggerService.initialize(accessToken, blogId);

// Validate connection
const isValid = await bloggerService.validateConnection();

// Create post
const post = await bloggerService.createPost({
  title: 'Article Title',
  content: 'Article content',
  labels: ['tag1', 'tag2'],
  isDraft: false
});
```

#### Secure Token Storage
- Access tokens stored in expo-secure-store
- Refresh tokens stored separately
- Token expiration tracked and validated
- Automatic cleanup of expired tokens

### 2. Smart Scheduling

#### Scheduling Frequencies
- **Immediate** - Publish right away
- **30 Minutes** - Every 30 minutes
- **1 Hour** - Every hour
- **2 Hours** - Every 2 hours
- **4 Hours** - Every 4 hours
- **Custom** - User-defined intervals

#### Scheduler Execution
```typescript
// Start scheduler
schedulerService.start();

// Create schedule
schedulerService.createSchedule(postId, 'every_2_hours');

// Scheduler automatically checks every minute
// and executes due schedules
```

### 3. Offline Queue System

#### Queue Operations
```typescript
// Add to queue
await queueService.addToQueue(postId, 'publish', payload, 'normal');

// Process queue
await queueService.processQueue();

// Retry failed items
await queueService.retryFailedItems();
```

#### Network Detection
- Automatically detects connection changes
- Pauses queue processing when offline
- Resumes automatically when connection restored
- Implements exponential backoff for retries

### 4. AI Content Generation

#### Template Types
1. **SEO Article** - Optimized for search engines
2. **Affiliate Article** - Product recommendations
3. **Product Review** - Detailed reviews
4. **Tutorial** - Step-by-step guides
5. **News Article** - Current events
6. **Rewrite Article** - Content improvement
7. **Humanized Article** - Natural language

#### Content Scoring Algorithm
- **SEO Score**: Word count, keyword density, structure
- **Human Score**: Variety, question marks, exclamation marks
- **Readability Score**: Sentence length, paragraph structure
- **Engagement Score**: Headings, lists, quotes, length

### 5. Error Handling

#### Global Error Handler
- Catches all async errors
- Logs errors with context
- Provides user-friendly messages
- Implements graceful degradation

#### Error Messages
- "تم النشر بنجاح" - Published successfully
- "تم جدولة المقال" - Article scheduled
- "فشل النشر - تحقق من الإعدادات" - Publish failed
- "لا يوجد اتصال بالإنترنت" - No internet connection
- "جاري إعادة المحاولة" - Retrying

### 6. Performance Optimization

#### Implemented Optimizations
- Lazy loading of article lists
- Request caching with axios
- Queue batch processing (5 items at a time)
- Image caching in Pexels service
- Memory cleanup in scheduler
- Retry throttling with exponential backoff

#### Monitoring
- Real-time log tracking
- Performance metrics in analytics
- Queue status monitoring
- Connection status detection

## Integration Checklist

### Required API Keys
- [ ] Google Gemini API Key (for content generation)
- [ ] Google OAuth Credentials (for Blogger login)
- [ ] Blogger Blog ID (from Blogger settings)

### Setup Steps

1. **Initialize Gemini Service**
```typescript
import { geminiService } from '@/lib/services/gemini-enhanced';

geminiService.initialize(process.env.GEMINI_API_KEY);
```

2. **Load Stored Credentials**
```typescript
import { bloggerService } from '@/lib/services/blogger-service';

await bloggerService.loadCredentials();
```

3. **Start Scheduler**
```typescript
import { schedulerService } from '@/lib/services/scheduler-service';

schedulerService.start();
```

4. **Initialize Queue**
```typescript
import { queueService } from '@/lib/services/queue-service';

await queueService.loadQueue();
```

## File Structure

```
/lib
  /stores
    - auth.store.ts
    - posts.store.ts
    - scheduler.store.ts
    - settings.store.ts
    - logs.store.ts
  /services
    - blogger-service.ts
    - scheduler-service.ts
    - queue-service.ts
    - gemini-enhanced.ts
    - article-generation-service.ts (existing)
    - pexels-service.ts (existing)
  /_core
    - secure-store.ts
    - api.ts (existing)
    - auth.ts (existing)
    - theme.ts (existing)
/app/(tabs)
  - index.tsx (existing)
  - settings.tsx (existing)
  - blogger-settings.tsx
  - queue-status.tsx
  - analytics.tsx
  - logs-viewer.tsx
/components
  - screen-container.tsx (existing)
  - ui/ (existing)
```

## Security Considerations

### Token Security
- ✅ Tokens stored in expo-secure-store (encrypted)
- ✅ No tokens in AsyncStorage
- ✅ Automatic token expiration handling
- ✅ SSL-only requests enforced

### Data Protection
- ✅ Secure storage for sensitive data
- ✅ Request timeout to prevent hanging
- ✅ Network detection for safe operations
- ✅ Error handling without exposing details

### Best Practices
- ✅ Never log sensitive tokens
- ✅ Validate all API responses
- ✅ Implement rate limiting
- ✅ Use HTTPS for all requests

## Testing Recommendations

### Unit Tests
- Store mutations and selectors
- Service methods with mocked APIs
- Error handling scenarios

### Integration Tests
- End-to-end publishing flow
- Scheduler execution
- Queue processing
- Offline/online transitions

### Manual Testing
- OAuth login flow
- Schedule creation and execution
- Queue processing with network changes
- Analytics calculations

## Future Enhancements

### Phase 2
- WordPress integration
- Multiple blog support
- Advanced analytics with charts
- Image optimization and compression

### Phase 3
- AI-powered publish time recommendations
- Content performance predictions
- Automated content improvements
- Multi-language support

### Phase 4
- Mobile app backend server
- Cloud synchronization
- Team collaboration features
- Advanced scheduling with ML

## Troubleshooting

### Common Issues

**Issue**: Blogger connection fails
- Check Blog ID is correct
- Verify OAuth token is valid
- Check internet connection
- Review logs for detailed error

**Issue**: Queue not processing
- Verify internet connection
- Check queue status in UI
- Review logs for errors
- Try manual queue processing

**Issue**: Scheduler not executing
- Verify scheduler is started
- Check schedule configuration
- Review logs for execution attempts
- Verify Blogger settings

**Issue**: Content scores are low
- Check content length and structure
- Verify keyword inclusion
- Review readability metrics
- Try different template

## Support and Monitoring

### Logging
- All operations logged with context
- Error logs include stack traces
- Performance metrics tracked
- User actions recorded

### Monitoring
- Real-time queue status
- Scheduler execution tracking
- API error monitoring
- Network status detection

### Analytics
- Publishing statistics
- Content quality metrics
- Template performance
- User engagement data

## Version History

- **v1.0.0** - Initial release
  - Blogger integration
  - Smart scheduling
  - Queue management
  - AI content generation
  - Analytics dashboard
  - System logging

## License

SmartWriter AI Platform © 2026. All rights reserved.
