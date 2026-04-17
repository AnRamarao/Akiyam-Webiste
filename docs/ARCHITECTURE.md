# AIKYAM Website — Technical Architecture Document

> **Version:** 1.0  
> **Date:** April 17, 2026  
> **Author:** Ramarao / Engineering  
> **Status:** Living document — update as the system evolves

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Architecture Diagram](#3-architecture-diagram)
4. [Technology Stack](#4-technology-stack)
5. [File & Directory Structure](#5-file--directory-structure)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Event Management System](#8-event-management-system)
9. [Database Schema](#9-database-schema)
10. [Security Architecture](#10-security-architecture)
11. [Data Flow Diagrams](#11-data-flow-diagrams)
12. [Build & Deployment](#12-build--deployment)
13. [Environment Setup Guide](#13-environment-setup-guide)
14. [Role Access Matrix](#14-role-access-matrix)
15. [API Reference](#15-api-reference)
16. [Performance & Accessibility](#16-performance--accessibility)
17. [Future Considerations](#17-future-considerations)

---

## 1. Executive Summary

AIKYAM is a community website for a 501(c)(3) non-profit organization based in California. The platform manages community events, team information, vendor directories, photo galleries, and member engagement — all built on a **zero-cost infrastructure** using static HTML/CSS/JS hosted on GoDaddy with Supabase (free tier) as the backend.

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Static site (no framework) | Zero hosting cost on GoDaddy, fast load times, simple maintenance |
| Supabase free tier | PostgreSQL + Auth + RLS — no backend server needed |
| Client-side only | No server runtime required — all logic runs in browser |
| IIFE module pattern | No build toolchain needed, explicit dependency management |
| JSON fallback | Graceful degradation when Supabase is unreachable |

---

## 2. System Overview

```
+----------------------------------------------------------+
|                     USER'S BROWSER                        |
|                                                           |
|  +-------------+  +----------+  +-----------+             |
|  | index.html  |  | auth.js  |  | events.js |             |
|  | script.js   |  |          |  |           |             |
|  | styles.css  |  | AIKYAM_  |  | AIKYAM_   |             |
|  |             |  | Auth     |  | Events    |             |
|  +------+------+  +----+-----+  +-----+-----+             |
|         |              |              |                    |
+---------+--------------+--------------+-------------------+
          |              |              |
          |     +--------+--------+     |
          |     |                 |     |
          v     v                 v     v
   +--------------+         +--------------+
   | GoDaddy      |         | Supabase     |
   | Static Host  |         | (Free Tier)  |
   |              |         |              |
   | HTML, CSS,   |         | Auth (GoTrue)|
   | JS, Images,  |         | PostgreSQL   |
   | JSON data    |         | Row-Level    |
   |              |         | Security     |
   +--------------+         +--------------+
```

### Request Flow

1. Browser loads static HTML/CSS/JS from GoDaddy
2. JavaScript initializes, loads `config.js` for Supabase credentials
3. `auth.js` checks for existing session, updates header UI
4. `script.js` calls `events.js` to fetch events from Supabase
5. If Supabase is unreachable, falls back to static JSON files
6. All authorization enforced client-side (UI) AND server-side (RLS)

---

## 3. Architecture Diagram

### High-Level Component Architecture

```
+================================================================+
|                        PRESENTATION LAYER                       |
|                                                                 |
|  +----------+ +----------+ +-----------+ +--------+ +--------+  |
|  | Homepage | | Gallery  | | Vendors   | | Login  | | Admin  |  |
|  | index    | | gallery  | | vendors   | | signup | | Events |  |
|  | .html    | | .html    | | .html     | | .html  | | .html  |  |
|  +----+-----+ +----+-----+ +-----+-----+ +---+----+ +---+----+  |
|       |             |             |            |          |       |
|  +----+-------------+-------------+------------+----------+----+  |
|  |                    styles.css                               |  |
|  |            (BEM methodology, CSS variables,                 |  |
|  |             dark/light theme, responsive)                   |  |
|  +-------------------------------------------------------------+  |
+================================================================+
         |              |             |           |
+================================================================+
|                       APPLICATION LAYER                         |
|                                                                 |
|  +------------------+  +----------------+  +------------------+  |
|  |    script.js     |  |    auth.js     |  |   events.js      |  |
|  |                  |  |                |  |                   |  |
|  | - UI Components  |  | - Session Mgmt |  | - CRUD Ops       |  |
|  | - Data Loading   |  | - Role System  |  | - Lifecycle      |  |
|  | - Rendering      |  | - Route Guard  |  | - Format Mappers |  |
|  | - Animations     |  | - Header Auth  |  | - JSON Fallback  |  |
|  | - Calendar       |  | - Rate Limit   |  |                   |  |
|  +--------+---------+  +-------+--------+  +--------+----------+  |
|           |                    |                     |            |
|  +--------+--------------------+---------------------+--------+   |
|  |              admin-events.js (Admin UI Logic)              |   |
|  |  - Auth gate  - List rendering  - Modal forms  - Actions   |   |
|  +------------------------------------------------------------+   |
+================================================================+
         |                       |
+================================================================+
|                         DATA LAYER                              |
|                                                                 |
|  +-------------------------+  +------------------------------+   |
|  |   Supabase (Primary)   |  |   JSON Files (Fallback)      |   |
|  |                         |  |                              |   |
|  | Auth:                   |  | data/upcomingEvents.json     |   |
|  |  - auth.users           |  | data/completedEvents.json    |   |
|  |  - auth.identities      |  | data/coreTeam.json           |   |
|  |                         |  | data/coreTeam2026.json       |   |
|  | Database:               |  | data/boardMembers.json       |   |
|  |  - profiles (+ RLS)     |  | data/vendors.json            |   |
|  |  - events   (+ RLS)     |  | data/galleryImages.json      |   |
|  |                         |  |                              |   |
|  | Functions:              |  +------------------------------+   |
|  |  - auto_expire_events   |                                     |
|  |  - auto_publish_events  |                                     |
|  |  - user_has_min_role    |                                     |
|  +-------------------------+                                     |
+================================================================+
```

### Module Dependency Graph

```
                    config.js
                       |
                       v
  supabase-js (CDN) --+--> auth.js
                              |
                              | exposes getClient()
                              v
                         events.js
                              |
              +---------------+----------------+
              |                                |
              v                                v
         script.js                     admin-events.js
    (public site rendering)          (admin dashboard)
```

**Load Order (all `defer`):**
```
1. supabase-js (CDN)    — Supabase client library
2. config.js             — Credentials (SUPABASE_URL, SUPABASE_ANON_KEY)
3. auth.js               — Auth module, creates Supabase client
4. events.js             — Events module, shares auth client
5. admin-events.js       — Admin page logic (admin-events.html only)
6. script.js             — Main app initialization
```

---

## 4. Technology Stack

| Layer | Technology | Version/Details |
|-------|-----------|-----------------|
| **Markup** | HTML5 | Semantic elements, ARIA attributes |
| **Styling** | CSS3 | Custom properties, Grid, Flexbox, BEM naming |
| **Logic** | Vanilla JavaScript | ES2017+ (async/await), IIFE modules |
| **Fonts** | Google Fonts | Montserrat (400, 700, 900) |
| **Auth** | Supabase Auth (GoTrue) | Client-side SDK v2 via CDN |
| **Database** | Supabase PostgreSQL | Free tier, Row-Level Security |
| **Hosting** | GoDaddy | Static file hosting |
| **Images** | WebP + JPEG/PNG | Responsive `<picture>` elements |
| **Build** | Make + Python3 | Image optimization, CSS/JS minification |
| **Version Control** | Git / GitHub | Feature branch workflow |

### External Dependencies (CDN Only)

| Package | CDN | Purpose |
|---------|-----|---------|
| `@supabase/supabase-js@2` | jsdelivr.net | Database & auth client |
| Montserrat font | fonts.googleapis.com | Typography |

---

## 5. File & Directory Structure

```
Akiyam-Webiste/
|
|-- index.html                  # Homepage (hero, team, events, vendors)
|-- login.html                  # Sign-in page
|-- signup.html                 # Registration page
|-- reset-password.html         # Password recovery
|-- admin-events.html           # Event management dashboard
|-- gallery.html                # Photo gallery
|-- vendors.html                # Vendor directory
|-- contact.html                # Contact form
|-- donate.html                 # Donations
|-- join.html                   # Membership
|-- fillout.html                # Event registration (Fillout embed)
|-- launch.html                 # Special event landing page
|-- comingsoon.html             # Placeholder page
|
|-- script.js                   # Main app logic (~53KB)
|-- auth.js                     # Auth module, AIKYAM_Auth (~19KB)
|-- events.js                   # Events module, AIKYAM_Events (~8KB)
|-- admin-events.js             # Admin events page logic (~10KB)
|-- config.js                   # Supabase credentials (.gitignored)
|-- config.example.js           # Credential template (committed)
|-- styles.css                  # All styles (~82KB)
|
|-- common/
|   |-- header.html             # Shared nav header
|   |-- footer.html             # Shared footer
|
|-- data/
|   |-- upcomingEvents.json     # Upcoming events (JSON fallback)
|   |-- completedEvents.json    # Past events (JSON fallback)
|   |-- coreTeam.json           # Executive committee
|   |-- coreTeam2026.json       # 2026 committee
|   |-- boardMembers.json       # Board of directors
|   |-- vendors.json            # Vendor directory
|   |-- galleryImages.json      # Gallery image manifest
|
|-- assets/
|   |-- branding/               # Logo, backgrounds (PNG, WebP)
|   |-- events/                 # Event photos & videos
|   |-- gallery/                # Gallery photos (optimized)
|   |   |-- migrated/           # WebP variants (800w, 1600w)
|   |-- people/                 # Team/board member photos
|
|-- tools/
|   |-- optimize_all_images.py  # Image optimization script
|
|-- supabase-schema.sql         # Database schema (idempotent)
|-- supabase-seed.sql           # Test users & roles (.gitignored)
|-- Makefile                    # Build automation
|-- .gitignore                  # config.js, seed, minified, OS files
```

---

## 6. Frontend Architecture

### JavaScript Module Pattern

All modules use the IIFE (Immediately Invoked Function Expression) pattern to avoid global namespace pollution:

```javascript
(function () {
  'use strict';

  // Private state and functions
  var privateVar = 'hidden';

  function privateHelper() { /* ... */ }

  // Public API
  window.AIKYAM_ModuleName = {
    publicMethod: publicMethod
  };
})();
```

### Module APIs

#### `window.AIKYAM_Auth`
```
Methods:
  init()                          Initialize auth, handle email confirms
  getClient()                     Return shared Supabase client instance
  getSession()                    Get current auth session (or null)
  getProfile()                    Get user profile with role
  signIn(email, password)         Sign in with credentials
  signUp(email, password, name)   Create new account
  signOut()                       End session
  resetPassword(email)            Send password reset email
  updatePassword(newPassword)     Update password (from reset link)
  updateHeaderAuthState()         Refresh header login/user UI
  requireAuth(role)               Guard page by minimum role

Properties:
  ROLES                           Role hierarchy object
  hasMinRole(userRole, required)  Check role >= required
  isAdmin(role)                   Check GlobalAdmin or OrgAdmin
  isStaff(role)                   Check admin or staff role
```

#### `window.AIKYAM_Events`
```
Methods:
  fetchPublicEvents()             { upcoming: [], past: [] }
  fetchAllEvents()                All events (admin use)
  createEvent(data)               Insert new draft event
  updateEvent(id, changes)        Update event fields
  publishEvent(id)                Draft -> Published
  deactivateEvent(id)             Published -> Deactivated
  deleteEvent(id)                 Permanent delete
  schedulePublish(id, datetime)   Set future publish time

Properties:
  STATUS                          { DRAFT, PUBLISHED, DEACTIVATED, EXPIRED }
```

### CSS Architecture

- **Methodology:** BEM (Block__Element--Modifier)
- **Theming:** CSS custom properties with dark (default) / light themes
- **Responsive:** Mobile-first with breakpoints at 768px and 1024px

**Key CSS Variables:**
```css
:root {
  --bg: hsl(220, 15%, 8%);        /* Background */
  --text: hsl(220, 20%, 90%);     /* Primary text */
  --text-muted: hsl(220, 10%, 65%); /* Secondary text */
  --accent: #ffd700;               /* Gold accent */
  --card: rgba(40, 45, 60, 0.6);  /* Card background */
  --brd: hsl(220, 15%, 20%);      /* Border color */
  --shadow: 0 4px 20px rgba(0,0,0,0.4);
  --maxw: 1200px;                  /* Max content width */
  --header-h: 80px;               /* Header height */
}
```

### Header/Footer Injection

Common components are loaded dynamically:
```
DOMContentLoaded
  |-> loadHeader()   -> fetch('common/header.html')
  |     |-> setActiveNavItem()
  |     |-> AIKYAM_Auth.updateHeaderAuthState()
  |     |-> AIKYAM_Auth.applyAuthVisibility()
  |
  |-> loadFooter()   -> fetch('common/footer.html')
  |-> loadData()     -> fetch team, events, vendors, gallery JSON
  |-> AIKYAM_Auth.init()  -> handle email confirms, session restore
```

---

## 7. Authentication & Authorization

### Auth Flow Diagram

```
                          +------------------+
                          |   User visits    |
                          |   any page       |
                          +--------+---------+
                                   |
                          +--------v---------+
                          | auth.js loads    |
                          | checks session   |
                          +--------+---------+
                                   |
                    +--------------+--------------+
                    |                              |
             No Session                     Has Session
                    |                              |
           +--------v--------+            +--------v--------+
           | Show Login btn  |            | Fetch profile   |
           | in header       |            | from Supabase   |
           +-----------------+            +--------+--------+
                                                   |
                                          +--------v--------+
                                          | Update header:  |
                                          | avatar, name,   |
                                          | role badge      |
                                          +--------+--------+
                                                   |
                                          +--------v--------+
                                          | applyAuthVisi-  |
                                          | bility() shows/ |
                                          | hides elements  |
                                          | per role        |
                                          +-----------------+
```

### Sign-Up Flow

```
User fills signup form
        |
        v
Rate limit check (5/60s)
        |
        v
supabase.auth.signUp({
  email, password,
  data: { full_name }
})
        |
        v
Supabase sends confirmation email
        |
        v
User clicks email link
   -> redirects to login.html#access_token=...&type=signup
        |
        v
auth.js detects hash fragment
   -> calls setSession()
   -> shows "Email confirmed!" message
        |
        v
handle_new_user() trigger
   -> INSERT INTO profiles (role='Member')
```

### Role Hierarchy

```
Level 8:  GlobalAdmin     -- Full system access
Level 7:  OrgAdmin        -- Org-level admin
Level 6:  ContentManager  -- Content lifecycle
Level 5:  ProgramManager  -- Event creation
Level 4:  FinanceStaff    -- Financial access
Level 3:  Volunteer       -- Member+ access
Level 2:  Donor           -- Donor portal
Level 1:  Support         -- Support queue
Level 0:  Member          -- Basic access (default)
```

**`hasMinRole(userRole, requiredRole)`** compares numeric levels:
```
hasMinRole('ContentManager', 'ProgramManager')  -> true  (6 >= 5)
hasMinRole('Volunteer', 'ContentManager')        -> false (3 < 6)
```

### Route Protection

Protected pages call `requireAuth(role)` on load:
```javascript
// admin-events.js
var allowed = await AIKYAM_Auth.requireAuth('ProgramManager');
if (!allowed) return; // redirected to login or home
```

Behavior:
- No session -> redirect to `login.html`
- Session but insufficient role -> redirect to `index.html`
- Session + sufficient role -> page loads normally

### Conditional UI Visibility

HTML elements use `data-auth-required` to show/hide based on auth state:
```html
<!-- Visible to ProgramManager and above -->
<a href="admin-events.html"
   data-auth-required="ProgramManager"
   style="display:none;">Admin</a>

<!-- Visible to any logged-in user -->
<div data-auth-required="authenticated" style="display:none;">
  Welcome back!
</div>
```

---

## 8. Event Management System

### Event Lifecycle State Machine

```
                         +===========+
          Create ------->||  DRAFT  ||
                         +====+======+
                              |
              +---------------+----------------+
              |                                |
        Manual Publish               Scheduled publish_at
        (ContentManager+)            (auto_publish_events)
              |                                |
              +---------------+----------------+
                              |
                         +====v======+
                         || PUBLISHED||<----+
                         +====+======+      |
                              |             |
              +---------------+--------+    |
              |                        |    |
         end_at passed          Manual deactivate
     (auto_expire_events)      (ContentManager+)
              |                        |    |
         +====v======+          +=====v=====+
         || EXPIRED  ||         ||DEACTIVATED||
         || (visible ||         || (hidden)  ||---> Re-publish
         || as past) ||         +============+
         +===========+
```

### Event Data Model

```
events
+-------------+------------------+-----------------------------------+
| Column      | Type             | Description                       |
+-------------+------------------+-----------------------------------+
| id          | UUID (PK)        | Auto-generated                    |
| title       | TEXT             | Event name (required)             |
| description | TEXT             | Full description                  |
| location    | TEXT             | Venue (default: 'TBD')            |
| price       | NUMERIC(10,2)   | Ticket price (default: 0)         |
| img         | TEXT             | Image path                        |
| tbd         | BOOLEAN          | Hide exact dates from public      |
| start_at    | TIMESTAMPTZ      | Event start                       |
| end_at      | TIMESTAMPTZ      | Event end                         |
| status      | event_status     | draft|published|deactivated|expired|
| publish_at  | TIMESTAMPTZ      | Scheduled publish time            |
| expired_at  | TIMESTAMPTZ      | When auto-expired                 |
| summary     | TEXT             | Shown on past event cards         |
| created_by  | UUID (FK)        | Creator's profile ID              |
| updated_by  | UUID (FK)        | Last editor's profile ID          |
| created_at  | TIMESTAMPTZ      | Row creation time                 |
| updated_at  | TIMESTAMPTZ      | Last modification time            |
+-------------+------------------+-----------------------------------+
```

### Admin UI Capabilities by Role

```
+--------------------+--------+---------+-----------+---------+
|                    | View   | Create/ | Publish/  | Delete  |
|     Role           | All    | Edit    | Deactivate|         |
+--------------------+--------+---------+-----------+---------+
| GlobalAdmin        |   Y    |   Y     |    Y      |   Y     |
| OrgAdmin           |   Y    |   Y     |    Y      |   Y     |
| ContentManager     |   Y    |   Y     |    Y      |   N     |
| ProgramManager     |   Y    |  Own    |    N      |   N     |
| Below PM           |   N    |   N     |    N      |   N     |
+--------------------+--------+---------+-----------+---------+
```

### Data Fallback Strategy

```
fetchPublicEvents()
        |
        v
  Is Supabase client available?
        |
   +----+----+
   |         |
  Yes        No
   |          |
   v          v
  Query      Load JSON
  Supabase   fallback
   |          |
   v          |
  Error?      |
   |          |
  +--+--+     |
  |     |     |
  No   Yes ---+
  |           |
  v           v
 Return     fetchFromJSON()
 mapped     upcomingEvents.json +
 data       completedEvents.json
```

---

## 9. Database Schema

### Entity Relationship Diagram

```
+------------------+          +------------------+
|   auth.users     |          |   auth.identities|
|  (Supabase-      |    1:N   |  (Supabase-      |
|   managed)       +----------+   managed)        |
|                  |          |                    |
| id (PK)          |          | id (PK)           |
| email            |          | user_id (FK)      |
| encrypted_pass   |          | provider           |
| raw_user_meta    |          | identity_data     |
| email_confirmed  |          +------------------+
+--------+---------+
         | 1:1
         |
+--------v---------+
|    profiles       |
|                   |
| id (PK, FK)      |
| email             |     1:N (created_by)
| full_name         +-------------------------+
| role (app_role)   |     1:N (updated_by)    |
| created_at        +--------------------+    |
| updated_at        |                    |    |
+-------------------+                    |    |
                                    +----v----v----+
                                    |    events    |
                                    |              |
                                    | id (PK)      |
                                    | title        |
                                    | description  |
                                    | location     |
                                    | price        |
                                    | img          |
                                    | tbd          |
                                    | start_at     |
                                    | end_at       |
                                    | status       |
                                    | publish_at   |
                                    | expired_at   |
                                    | summary      |
                                    | created_by   |
                                    | updated_by   |
                                    | created_at   |
                                    | updated_at   |
                                    +--------------+
```

### Row-Level Security Policies

#### Profiles Table

| Policy | Operation | Rule |
|--------|-----------|------|
| Users can read own profile | SELECT | `auth.uid() = id` |
| Admins can read all profiles | SELECT | `user_is_admin()` |
| Staff can read all profiles | SELECT | `user_is_staff()` |
| Users can update own profile | UPDATE | `auth.uid() = id` AND role unchanged |
| GlobalAdmin can update any | UPDATE | `user_has_role('GlobalAdmin')` |
| OrgAdmin can update non-global | UPDATE | `user_has_role('OrgAdmin')` AND target != GlobalAdmin |
| GlobalAdmin can delete | DELETE | `user_has_role('GlobalAdmin')` |

#### Events Table

| Policy | Operation | Rule |
|--------|-----------|------|
| Public can read published | SELECT | `status = 'published'` |
| Public can read expired | SELECT | `status = 'expired'` |
| Managers can read all | SELECT | `user_has_min_role('ProgramManager')` |
| Managers can create | INSERT | `user_has_min_role('ProgramManager')` |
| ContentManagers can update any | UPDATE | `user_has_min_role('ContentManager')` |
| ProgramManagers can update own | UPDATE | `user_has_min_role('ProgramManager') AND created_by = auth.uid()` |
| Admins can delete | DELETE | `user_is_admin()` |

### Database Functions

| Function | Type | Purpose |
|----------|------|---------|
| `handle_new_user()` | Trigger | Auto-create profile on auth signup |
| `update_updated_at()` | Trigger | Auto-set `updated_at` on row changes |
| `user_has_role(role)` | Helper | Exact role match check |
| `user_is_admin()` | Helper | GlobalAdmin or OrgAdmin check |
| `user_is_staff()` | Helper | Admin or manager/staff check |
| `user_has_min_role(role)` | Helper | Hierarchy-aware role comparison |
| `auto_expire_events()` | Lifecycle | Move past-end published events to expired |
| `auto_publish_events()` | Lifecycle | Move scheduled drafts to published |

---

## 10. Security Architecture

### Defense Layers

```
+----------------------------------------------------------+
|  Layer 1: Content Security Policy (CSP)                   |
|  - Restricts script/style/connect sources                |
|  - Prevents XSS via inline script injection              |
+----------------------------------------------------------+
            |
+----------------------------------------------------------+
|  Layer 2: Supabase Row-Level Security (RLS)              |
|  - Server-side authorization on every DB query           |
|  - Policies enforce role-based access                    |
|  - Cannot be bypassed from client                        |
+----------------------------------------------------------+
            |
+----------------------------------------------------------+
|  Layer 3: Client-Side Auth Guards                         |
|  - requireAuth() redirects unauthorized users            |
|  - applyAuthVisibility() hides restricted UI             |
|  - Role checks before CRUD operations                    |
+----------------------------------------------------------+
            |
+----------------------------------------------------------+
|  Layer 4: Rate Limiting                                   |
|  - 5 auth attempts per action per 60 seconds             |
|  - Prevents brute-force credential attacks               |
+----------------------------------------------------------+
            |
+----------------------------------------------------------+
|  Layer 5: Credential Isolation                            |
|  - config.js is .gitignored (never committed)            |
|  - Supabase anon key is public by design (like Firebase) |
|  - Real security is in RLS policies, not key secrecy     |
+----------------------------------------------------------+
```

### Content Security Policy

```
default-src 'self';
script-src  'self' https://cdn.jsdelivr.net;
style-src   'self' https://fonts.googleapis.com 'unsafe-inline';
font-src    https://fonts.gstatic.com;
img-src     'self' data:;
connect-src 'self' https://*.supabase.co;
```

### XSS Prevention

- All user-generated content rendered via `escapeHTML()` (creates text node, reads innerHTML)
- No `innerHTML` with raw user input
- CSP blocks inline scripts

---

## 11. Data Flow Diagrams

### Public Page Load (Homepage)

```
Browser                     GoDaddy              Supabase
   |                           |                     |
   |--- GET index.html ------->|                     |
   |<-- HTML + script tags ----|                     |
   |                           |                     |
   |--- GET script.js -------->|                     |
   |--- GET auth.js ---------->|                     |
   |--- GET events.js -------->|                     |
   |--- GET config.js -------->|                     |
   |--- GET styles.css ------->|                     |
   |<-- static files ----------|                     |
   |                           |                     |
   |  [DOMContentLoaded]       |                     |
   |                           |                     |
   |--- GET common/header.html>|                     |
   |--- GET common/footer.html>|                     |
   |<-- HTML fragments --------|                     |
   |                           |                     |
   |--- auth.getSession() ---------------------------->|
   |<-- session (or null) -----------------------------|
   |                           |                     |
   |--- AIKYAM_Events.fetchPublicEvents() ----------->|
   |    (SELECT * FROM events WHERE status=published)  |
   |<-- { upcoming: [...], past: [...] } --------------|
   |                           |                     |
   |--- GET data/coreTeam.json>|                     |
   |--- GET data/vendors.json->|                     |
   |<-- JSON data -------------|                     |
   |                           |                     |
   |  [Render page]            |                     |
```

### Admin Event Creation

```
Admin Browser                                  Supabase
   |                                              |
   |--- requireAuth('ProgramManager') ----------->|
   |<-- session + profile (role check) -----------|
   |                                              |
   |  [User fills form, clicks Save]              |
   |                                              |
   |--- createEvent({                             |
   |     title, description, start_at, ...        |
   |     status: 'draft',                         |
   |     created_by: user.id                      |
   |   }) ---------------------------------------->|
   |                                              |
   |   [RLS: check user_has_min_role('PM')]       |
   |                                              |
   |<-- { data: event_row } ----------------------|
   |                                              |
   |  [Refresh list]                              |
   |--- fetchAllEvents() ----------------------->|
   |<-- all events -------------------------------|
```

---

## 12. Build & Deployment

### Build Pipeline

```
make build
    |
    +-> make optimize
    |     |-> optimize_all_images.py
    |           |-> WebP conversion (branding, gallery, people)
    |           |-> Responsive variants (800w, 1600w)
    |           |-> JPEG optimization
    |
    +-> make minify
          |-> styles.css    -> styles.min.css
          |-> script.js     -> script.min.js
          |-> auth.js       -> auth.min.js
          |-> events.js     -> events.min.js
          |-> admin-events.js -> admin-events.min.js
```

### Makefile Targets

| Command | Purpose |
|---------|---------|
| `make serve` | Start dev server on port 8000 |
| `make optimize` | Convert images to WebP, generate responsive variants |
| `make optimize-dry` | Preview optimization without changes |
| `make minify` | Minify CSS + all JS files |
| `make build` | Full production build (optimize + minify) |
| `make clean` | Remove all generated files |

### Deployment Checklist

- [ ] Run `make build` for production assets
- [ ] Verify `config.js` is NOT in git (`.gitignored`)
- [ ] Verify `supabase-seed.sql` is NOT in git
- [ ] Test all auth flows (signup, login, reset, logout)
- [ ] Test event CRUD with each role
- [ ] Test JSON fallback (block Supabase URL)
- [ ] Test mobile responsive at 375px, 768px, 1440px
- [ ] Test dark/light theme
- [ ] Check browser console for errors
- [ ] Validate CSP headers
- [ ] Upload to GoDaddy hosting

---

## 13. Environment Setup Guide

### For New Developers

1. **Clone the repository**
   ```bash
   git clone https://github.com/AnRamarao/Akiyam-Webiste.git
   cd Akiyam-Webiste
   ```

2. **Create `config.js`** from the template
   ```bash
   cp config.example.js config.js
   # Edit config.js with actual Supabase credentials
   ```

3. **Start development server**
   ```bash
   make serve
   # Open http://localhost:8000
   ```

4. **Supabase Setup** (one-time, for new projects)
   - Create project at [supabase.com](https://supabase.com)
   - Go to SQL Editor, run `supabase-schema.sql`
   - Run `supabase-seed.sql` to create test users
   - Copy Project URL and anon key to `config.js`

### Test Accounts (from supabase-seed.sql)

| Email | Role | Password |
|-------|------|----------|
| rjramarao@gmail.com | GlobalAdmin | Menifee@92585 |
| orgadmin@aikyamusa.org | OrgAdmin | Menifee@92585 |
| contentmanager@aikyamusa.org | ContentManager | Menifee@92585 |
| programmanager@aikyamusa.org | ProgramManager | Menifee@92585 |
| financestaff@aikyamusa.org | FinanceStaff | Menifee@92585 |
| volunteer@aikyamusa.org | Volunteer | Menifee@92585 |
| donor@aikyamusa.org | Donor | Menifee@92585 |
| support@aikyamusa.org | Support | Menifee@92585 |
| member@aikyamusa.org | Member | Menifee@92585 |

---

## 14. Role Access Matrix

### Full Permissions Matrix

```
Feature                    GlbAdm OrgAdm CntMgr PrgMgr FinStf Volntr Donor  Supprt Member
------------------------------------------------------------------------------------------
View public site              Y      Y      Y      Y      Y      Y      Y      Y      Y
Login / Session               Y      Y      Y      Y      Y      Y      Y      Y      Y
View own profile              Y      Y      Y      Y      Y      Y      Y      Y      Y
Update own name               Y      Y      Y      Y      Y      Y      Y      Y      Y
------------------------------------------------------------------------------------------
See "Admin" nav link          Y      Y      Y      Y      -      -      -      -      -
View all events (admin)       Y      Y      Y      Y      -      -      -      -      -
Create events (draft)         Y      Y      Y      Y      -      -      -      -      -
Edit any event                Y      Y      Y      -      -      -      -      -      -
Edit own events               Y      Y      Y      Y      -      -      -      -      -
Publish / Deactivate          Y      Y      Y      -      -      -      -      -      -
Schedule publish              Y      Y      Y      -      -      -      -      -      -
Delete events                 Y      Y      -      -      -      -      -      -      -
------------------------------------------------------------------------------------------
Read all profiles             Y      Y      -      -      -      -      -      -      -
Read staff profiles           Y      Y      Y      Y      Y      Y      -      -      -
Update any profile role       Y      Y*     -      -      -      -      -      -      -
Delete profiles               Y      -      -      -      -      -      -      -      -
------------------------------------------------------------------------------------------

Y  = Allowed
Y* = Allowed, except cannot promote to GlobalAdmin
-  = Not allowed
```

---

## 15. API Reference

### Supabase Tables (REST API via client)

All queries go through the Supabase JS client which applies RLS automatically.

#### Events

```javascript
// Read published events (public)
client.from('events').select('*').eq('status', 'published')

// Read all events (admin)
client.from('events').select('*').order('created_at', { ascending: false })

// Create event
client.from('events').insert({ title, description, ... }).select().single()

// Update event
client.from('events').update({ title, status, ... }).eq('id', eventId).select().single()

// Delete event
client.from('events').delete().eq('id', eventId)
```

#### Profiles

```javascript
// Read own profile
client.from('profiles').select('*').eq('id', userId).single()

// Update profile
client.from('profiles').update({ full_name }).eq('id', userId)
```

#### RPC Functions

```javascript
// Trigger auto-expire/publish lifecycle
client.rpc('auto_expire_events')
client.rpc('auto_publish_events')
```

---

## 16. Performance & Accessibility

### Performance Optimizations

| Technique | Implementation |
|-----------|---------------|
| Image optimization | WebP with JPEG fallback via `<picture>` |
| Responsive images | Multiple sizes (800w, 1600w) |
| Lazy loading | `loading="lazy"` on below-fold images |
| CSS/JS minification | `make minify` strips comments and whitespace |
| Passive listeners | Scroll handlers use `{ passive: true }` |
| Debounced animations | `requestAnimationFrame` for scroll effects |
| Deferred scripts | All `<script>` tags use `defer` attribute |
| JSON fallback | Prevents blank page if Supabase is slow |

### Accessibility Features

| Feature | Implementation |
|---------|---------------|
| Skip navigation | Hidden link, visible on focus |
| Semantic HTML | `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>` |
| ARIA attributes | `aria-label`, `aria-expanded`, `aria-modal`, `aria-live` |
| Keyboard navigation | Escape closes modals, tab order preserved |
| Screen reader support | `aria-live="polite"` for dynamic content |
| Color contrast | Gold on dark (#ffd700 on #151820) passes WCAG AA |
| Focus indicators | `outline: 2px solid var(--accent)` on focus |
| Reduced motion | `prefers-reduced-motion` media query support |

---

## 17. Future Considerations

### Potential Enhancements

1. **Event Registration** — RSVP/ticket system with attendee tracking
2. **Member Directory** — Searchable member list (Volunteer+ access)
3. **Donation Tracking** — Integration with payment gateway (Stripe/PayPal)
4. **Gallery Management** — Admin UI for uploading/organizing photos
5. **Vendor Management** — Admin UI for vendor CRUD operations
6. **Email Notifications** — Event reminders, registration confirmations
7. **PWA Support** — Service worker for offline access
8. **Analytics Dashboard** — Event attendance, member growth metrics
9. **Multi-language** — i18n support for community diversity
10. **Content Versioning** — Audit trail for event edits

### Scaling Considerations

| Threshold | Action |
|-----------|--------|
| > 500 monthly active users | Monitor Supabase free tier limits (50K auth users, 500MB DB) |
| > 10,000 page views/month | Consider CDN for static assets |
| > 100 events | Add pagination to admin event list |
| Need server-side logic | Supabase Edge Functions (Deno) |
| Need real-time features | Supabase Realtime subscriptions |

---

*This document should be reviewed and updated when significant architectural changes are made to the system.*
