# SmartWriter AI Platform - Mobile App Design

## Design Philosophy
The app follows **Apple Human Interface Guidelines (HIG)** with a focus on **mobile portrait orientation (9:16)** and **one-handed usage**. The design feels like a first-party iOS app with clean, intuitive navigation.

## Screen List

### Core Screens
1. **Home Screen** - Main article writing and generation interface
2. **Article Detail Screen** - View, edit, and manage individual articles
3. **Blogger Settings Screen** - OAuth login and Blogger account configuration
4. **Scheduler Screen** - Schedule posts and manage publication times
5. **Queue Status Screen** - Monitor pending posts and retry failed publishes
6. **Analytics Dashboard** - View post performance and engagement metrics
7. **Logs Viewer Screen** - Review system logs and error history
8. **Settings Screen** - General app settings and preferences

### Modal Screens
- **OAuth Login Modal** - Blogger account authentication
- **Schedule Picker Modal** - Select publication time and frequency
- **Template Selector Modal** - Choose article generation template
- **Backup/Restore Modal** - Manage local backups

## Primary Content and Functionality

### Home Screen
**Content:** Article list with generation interface
**Functionality:**
- Display recent articles with status badges (Draft, Scheduled, Published)
- Quick action buttons: Generate New, Edit, Publish, Schedule
- Search and filter articles
- Pull-to-refresh for latest articles

### Article Detail Screen
**Content:** Full article editor with AI enhancement tools
**Functionality:**
- Article title and content editor
- AI-suggested titles, tags, keywords
- SEO score display (0-100)
- Human score, readability score, engagement score
- Featured image selector
- Publish options: Immediate, Draft, Scheduled
- Preview functionality

### Blogger Settings Screen
**Content:** Blogger account configuration
**Functionality:**
- OAuth login button with visual feedback
- Display connected blog information
- Blog ID input field
- Access token display (masked)
- Connection validation button
- Toggle: Enable Auto Publish
- Toggle: Publish as Draft
- Toggle: Retry Failed Posts
- Disconnect button

### Scheduler Screen
**Content:** Publication schedule management
**Functionality:**
- List of scheduled posts with publication times
- Add new schedule button
- Schedule frequency options: Immediate, 30min, 1hr, 2hr, 4hr, Custom
- Timezone selector
- Edit/delete schedule actions
- Visual timeline of upcoming publications

### Queue Status Screen
**Content:** Pending and failed posts queue
**Functionality:**
- Display queue statistics
- List pending posts with estimated publish time
- List failed posts with error messages
- Retry button for failed posts
- Clear queue option
- Real-time status updates

### Analytics Dashboard
**Content:** Post performance metrics
**Functionality:**
- Total posts published count
- Average engagement metrics
- Post performance chart
- Top performing articles
- Publication frequency chart
- Engagement trends over time

### Logs Viewer Screen
**Content:** System logs and error history
**Functionality:**
- Chronological log entries
- Filter by log level (Info, Warning, Error)
- Search functionality
- Export logs as file
- Clear logs option
- Timestamp and error details

## Key User Flows

### Flow 1: Generate and Publish Article
1. User taps "Generate New" button on Home
2. Select template (SEO Article, Product Review, etc.)
3. Enter topic/keywords
4. AI generates article with suggestions
5. Review and edit content
6. View quality scores
7. Choose publish option: Immediate, Draft, or Schedule
8. Confirm and publish

### Flow 2: Schedule Multiple Posts
1. User navigates to Scheduler screen
2. Taps "Add Schedule" button
3. Selects frequency (Every 2 Hours, Every 4 Hours, etc.)
4. Sets timezone
5. Confirms schedule
6. System automatically publishes articles at scheduled times

### Flow 3: Handle Failed Publish
1. User navigates to Queue Status screen
2. Sees failed post with error message
3. Taps "Retry" button
4. System attempts to republish
5. Success notification or updated error message

### Flow 4: Monitor Performance
1. User navigates to Analytics Dashboard
2. Views overall statistics
3. Taps on specific article for detailed metrics
4. Sees engagement trends
5. Identifies best-performing content types

## Color Choices

### Brand Colors
- **Primary (Tint):** #0a7ea4 (Professional Blue)
- **Background:** #ffffff (Light) / #151718 (Dark)
- **Surface:** #f5f5f5 (Light) / #1e2022 (Dark)
- **Foreground:** #11181C (Light) / #ECEDEE (Dark)
- **Muted:** #687076 (Light) / #9BA1A6 (Dark)

### Status Colors
- **Success:** #22C55E (Green) - Published, Connected
- **Warning:** #F59E0B (Amber) - Scheduled, Pending
- **Error:** #EF4444 (Red) - Failed, Disconnected

### UI Elements
- **Border:** #E5E7EB (Light) / #334155 (Dark)
- **Accent:** Uses primary color for interactive elements

## Typography
- **Headlines:** SF Pro Display (iOS) / Roboto (Android)
- **Body:** SF Pro Text (iOS) / Roboto (Android)
- **Monospace:** SF Mono (iOS) / Roboto Mono (Android)

## Layout Principles
- **Safe Area:** All content respects safe area (notch, home indicator)
- **Spacing:** Consistent 16px base unit for padding/margins
- **Touch Targets:** Minimum 44x44pt for interactive elements
- **One-Handed Usage:** Primary actions within thumb reach
- **Tab Bar:** Always visible for main navigation

## Navigation Structure
```
Root
├── Home (Tab 1)
│   ├── Article Detail
│   ├── Article Editor
│   └── Template Selector
├── Blogger Settings (Tab 2)
│   ├── OAuth Login
│   └── Connection Validation
├── Scheduler (Tab 3)
│   ├── Schedule Picker
│   └── Schedule Editor
├── Analytics (Tab 4)
│   └── Article Details
└── Settings (Tab 5)
    ├── Logs Viewer
    ├── Backup/Restore
    └── General Settings
```

## Accessibility
- All interactive elements have minimum 44x44pt touch targets
- Color contrast ratio ≥ 4.5:1 for text
- Support for Dynamic Type (text size scaling)
- VoiceOver support for screen readers
- Haptic feedback for important actions

## Performance Considerations
- Lazy load article lists
- Cache article content
- Optimize image loading
- Minimize re-renders
- Background task execution for scheduling
