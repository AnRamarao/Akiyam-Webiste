# AIKYAM Website — Team Presentation
### Technical Architecture & Event Management Feature

> **Presenter:** Ramarao  
> **Date:** April 2026  
> **Audience:** Development team, stakeholders

---

## Slide 1: Agenda

```
1. Platform Overview
2. Architecture at a Glance
3. Authentication System
4. Role-Based Access Control
5. Event Management Feature (NEW)
6. Security Model
7. How It All Connects
8. Developer Workflow
9. Demo Walkthrough
10. Q&A
```

---

## Slide 2: Platform Overview

### What is AIKYAM?

A community website for our 501(c)(3) non-profit organization.

```
  WHAT WE MANAGE                     HOW WE BUILD IT
  +-----------------------+           +-----------------------+
  | Community Events      |           | HTML / CSS / JS       |
  | Team & Board Info     |           | No frameworks         |
  | Photo Gallery         |           | No server needed      |
  | Vendor Directory      |           | GoDaddy hosting       |
  | Member Auth           |           | Supabase backend      |
  | Donations             |           | Zero monthly cost     |
  +-----------------------+           +-----------------------+
```

### Key Principle: **Zero-Cost Infrastructure**
- Static site on GoDaddy (included with domain)
- Supabase free tier (auth + database)
- No backend server, no monthly bills

---

## Slide 3: Architecture at a Glance

```
  +---------------------------------------------------+
  |                  USER'S BROWSER                     |
  |                                                     |
  |   +-----------+  +---------+  +-----------+         |
  |   | HTML Pages|  | auth.js |  | events.js |         |
  |   | styles.css|  |         |  |           |         |
  |   | script.js |  | Login   |  | CRUD Ops  |         |
  |   |           |  | Roles   |  | Lifecycle |         |
  |   +-----------+  +---------+  +-----------+         |
  +---------------------------------------------------+
           |                |               |
           v                v               v
    +-----------+    +-----------------------------+
    |  GoDaddy  |    |         Supabase            |
    |  (files)  |    |  Auth  |  Database  |  RLS  |
    +-----------+    +-----------------------------+
```

**Everything runs in the browser.** No backend logic, no API server.

---

## Slide 4: Pages We Serve

```
PUBLIC PAGES                    AUTH PAGES                ADMIN PAGES
+-----------------+             +-------------------+     +-------------------+
| Homepage        |             | Login             |     | Event Management  |
| Gallery         |             | Sign Up           |     | (ProgramManager+) |
| Vendors         |             | Reset Password    |     |                   |
| Contact         |             +-------------------+     +-------------------+
| Donate          |
| Join Us         |
+-----------------+
```

**14 HTML pages** total, each loading shared header/footer dynamically.

---

## Slide 5: JavaScript Module Architecture

```
                   config.js (credentials)
                       |
                       v
  Supabase SDK -----> auth.js -----> events.js
  (CDN)           (AIKYAM_Auth)   (AIKYAM_Events)
                       |                |
                       v                v
                   script.js      admin-events.js
                 (all pages)     (admin page only)
```

### Module Pattern (IIFE)
Each JS file is a self-contained module:
- `window.AIKYAM_Auth` — Authentication & authorization
- `window.AIKYAM_Events` — Event CRUD & lifecycle
- No build tools, no npm, no webpack

---

## Slide 6: Authentication System

### Sign-Up Flow
```
User fills form  -->  Supabase creates account
                         |
                 Confirmation email sent
                         |
                 User clicks email link
                         |
                 Profile auto-created (role = Member)
                         |
                 User can now log in
```

### Login Flow
```
Email + Password  -->  Supabase validates  -->  Session created
                                                    |
                                            Header updates:
                                            Login btn --> Avatar dropdown
                                                    |
                                            Role-gated UI appears
```

### Security Features
- 5 login attempts per 60 seconds (rate limiting)
- Password hashed with bcrypt (Supabase handles this)
- Session tokens in browser (auto-refresh)
- Email confirmation required

---

## Slide 7: Role-Based Access Control (RBAC)

### 9-Level Role Hierarchy

```
    +------------------+
    |  GlobalAdmin  (8)|  Full access, manage users
    +------------------+
    |  OrgAdmin     (7)|  Org-level admin
    +------------------+
    |  ContentManager(6)|  Publish/manage content
    +------------------+
    |  ProgramManager(5)|  Create/edit events
    +------------------+
    |  FinanceStaff  (4)|  Financial access
    +------------------+
    |  Volunteer     (3)|  Event coordination
    +------------------+
    |  Donor         (2)|  Donor portal
    +------------------+
    |  Support       (1)|  Support queue
    +------------------+
    |  Member        (0)|  Default (basic access)
    +------------------+
```

### How Role Checks Work
```
hasMinRole('ContentManager', 'ProgramManager')  -->  true  (6 >= 5)
hasMinRole('Member', 'ProgramManager')          -->  false (0 < 5)
```

Enforced at **TWO levels:**
1. **Browser** — UI hides buttons you can't use
2. **Database** — RLS blocks queries you're not allowed to make

---

## Slide 8: Event Management (NEW FEATURE)

### Event Lifecycle

```
  CREATE            PUBLISH             TIME PASSES
    |                  |                     |
    v                  v                     v
 +-------+      +----------+         +---------+
 | DRAFT |----->| PUBLISHED|-------->| EXPIRED |
 +-------+      +----------+         +---------+
                      |
                      | DEACTIVATE
                      v
               +-------------+
               | DEACTIVATED |---> can Re-publish
               +-------------+
```

### Who Can Do What

```
  Action              Minimum Role Required
  ------------------------------------------
  Create event        ProgramManager
  Edit own events     ProgramManager
  Edit any event      ContentManager
  Publish/Deactivate  ContentManager
  Delete event        OrgAdmin
  ------------------------------------------
```

### Auto-Lifecycle
- **Auto-expire:** Events past their end date automatically become "Expired"
- **Auto-publish:** Draft events with a scheduled date auto-publish when the time arrives
- Runs every 15 minutes via pg_cron (+ on every page load as backup)

---

## Slide 9: Admin Dashboard

```
+----------------------------------------------------------+
|  Event Management                        [+ New Event]    |
+----------------------------------------------------------+
|  [All] [Draft] [Published] [Deactivated] [Expired]       |
+----------------------------------------------------------+
|                                                           |
|  Diwali Celebration 2026   [published]  Oct 26, 2026     |
|                                    [Edit] [Deactivate]    |
|                                                           |
|  Holi Festival             [draft]      Mar 14, 2027      |
|                            Scheduled: Mar 1, 2027 9:00 AM |
|                                    [Edit] [Publish]       |
|                                                           |
|  Independence Day Picnic   [expired]    Aug 15, 2026      |
|                                    [Edit]                 |
|                                                           |
+----------------------------------------------------------+
```

- Tab filters update instantly (no page reload)
- Edit opens a modal form
- Action buttons appear based on YOUR role
- Confirm dialog before destructive actions

---

## Slide 10: Security Model — Defense in Depth

```
  Layer 1: Content Security Policy (CSP)
  +-------------------------------------------------+
  | Only approved scripts/styles/connections allowed |
  +-------------------------------------------------+
                        |
  Layer 2: Row-Level Security (RLS)
  +-------------------------------------------------+
  | Database enforces access rules on EVERY query   |
  | Even if someone hacks the JS, DB rejects it     |
  +-------------------------------------------------+
                        |
  Layer 3: Client-Side Auth Guards
  +-------------------------------------------------+
  | requireAuth() blocks unauthorized page access   |
  | UI hides actions user can't perform             |
  +-------------------------------------------------+
                        |
  Layer 4: Rate Limiting
  +-------------------------------------------------+
  | Max 5 auth attempts per minute                  |
  +-------------------------------------------------+
                        |
  Layer 5: Credential Isolation
  +-------------------------------------------------+
  | config.js never committed to GitHub             |
  +-------------------------------------------------+
```

**Key insight:** Client-side checks are for UX. Server-side RLS is for security.
Even if someone opens browser DevTools, the database won't let them do anything unauthorized.

---

## Slide 11: Data Fallback Strategy

```
  Is Supabase available?
         |
    +----+----+
    |         |
   YES        NO
    |          |
    v          v
  Live DB    Static JSON files
  data       (same format)
    |          |
    +----+-----+
         |
         v
    Page renders
    normally
```

The site **never shows a blank page.** If Supabase is down:
- Events load from `data/upcomingEvents.json`
- Team loads from `data/coreTeam.json`
- Only auth features are unavailable

---

## Slide 12: Developer Workflow

### Getting Started
```bash
git clone <repo>
cp config.example.js config.js   # Add your Supabase keys
make serve                        # http://localhost:8000
```

### Build for Production
```bash
make build    # Optimizes images + minifies CSS/JS
```

### Key Commands
```
make serve        Start dev server (port 8000)
make optimize     Convert images to WebP
make minify       Minify CSS + JS files
make build        Full production build
make clean        Remove generated files
```

### Branch Strategy
```
main --------+------- stable releases
              \
               feature-xxx --- development work
```

---

## Slide 13: Test Accounts

For testing different role behaviors:

```
  ROLE              EMAIL                          PASSWORD
  ---------------------------------------------------------------
  GlobalAdmin       rjramarao@gmail.com            Menifee@92585
  OrgAdmin          orgadmin@aikyamusa.org         Menifee@92585
  ContentManager    contentmanager@aikyamusa.org   Menifee@92585
  ProgramManager    programmanager@aikyamusa.org   Menifee@92585
  FinanceStaff      financestaff@aikyamusa.org     Menifee@92585
  Volunteer         volunteer@aikyamusa.org        Menifee@92585
  Donor             donor@aikyamusa.org            Menifee@92585
  Support           support@aikyamusa.org          Menifee@92585
  Member            member@aikyamusa.org           Menifee@92585
```

**Try logging in with different accounts to see how the UI changes!**

---

## Slide 14: Demo Walkthrough

### 1. Public User Experience
- Visit homepage -> see published events, calendar, team
- No "Admin" link visible

### 2. Member Login
- Login as member@aikyamusa.org
- Header changes: Login btn -> user avatar with name & role
- Still no "Admin" link (Member role too low)

### 3. ProgramManager Login
- Login as programmanager@aikyamusa.org
- "Admin" link appears in nav
- Can create events (saved as Draft)
- Can edit own events only
- No Publish or Delete buttons visible

### 4. ContentManager Login
- Login as contentmanager@aikyamusa.org
- Can see Publish/Deactivate buttons
- Publish a draft event -> it appears on homepage

### 5. GlobalAdmin Login
- Login as rjramarao@gmail.com
- All buttons visible including Delete
- Full control over all events

---

## Slide 15: File Map — What's Where

```
  NEED TO...                    LOOK AT...
  -----------------------------------------------
  Change page layout            index.html (or relevant .html)
  Change look & feel            styles.css
  Change site behavior          script.js
  Change auth logic             auth.js
  Change event CRUD logic       events.js
  Change admin page logic       admin-events.js
  Change nav or footer          common/header.html, common/footer.html
  Update team data              data/coreTeam.json
  Update vendor data            data/vendors.json
  Change DB schema              supabase-schema.sql
  Add test users                supabase-seed.sql
  Change Supabase connection    config.js
  Optimize images               make optimize
  Build for production          make build
```

---

## Slide 16: What's Next

### Immediate Roadmap
- [ ] Event registration / RSVP system
- [ ] Gallery admin page (upload & manage photos)
- [ ] Vendor admin page (CRUD vendors)
- [ ] Member directory (Volunteer+ access)

### Future Possibilities
- Donation tracking with payment integration
- Email notifications for events
- PWA for offline access
- Analytics dashboard

---

## Slide 17: Key Takeaways

```
  1. ZERO COST          No servers, no monthly bills
  
  2. SECURE             9-role RBAC with database-level enforcement
  
  3. RESILIENT          JSON fallback if Supabase is down
  
  4. SIMPLE             No frameworks, no build tools required
  
  5. EXTENSIBLE         New features = new JS module + DB table
```

---

## Appendix A: Quick Reference — CSS Variables

```css
--bg           Background color         Dark: #151820    Light: #fdfdfd
--text         Primary text             Dark: #dee2ed    Light: #262626
--text-muted   Secondary text           Dark: #99a0b5    Light: #737373
--accent       Gold accent              #ffd700
--card         Card background          Dark: rgba(40,45,60,0.6)
--brd          Border color             Dark: #2d3347    Light: #cccccc
```

## Appendix B: Supabase Free Tier Limits

```
Auth users:       50,000
Database size:    500 MB
Storage:          1 GB
API requests:     Unlimited (subject to rate limits)
Edge Functions:   500,000 invocations/month
Realtime:         200 concurrent connections
```

Current usage is well within free tier limits for a community organization.

---

*End of presentation. Questions?*
