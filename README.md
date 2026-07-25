# Faculty Leave & Substitute Management Portal (EduFlex HR)

A full-stack, enterprise-grade Next.js + Supabase application for managing faculty leave requests, administrative approval workflows, automated substitute job broadcasts, signed lesson plan document distribution, and peer coverage claiming.

## Features & Highlights

- **Supabase Authentication & Role-Based Access**:
  - Smart 3-way routing to `/teacher`, `/admin`, or `/substitute` based on user roles (`user_role` enum).
  - Secure Row-Level Security (RLS) enforcement.
- **Teacher Dashboard (`/teacher`)**:
  - Live leave balance tracking.
  - Absence request form with dynamic one-to-many `class_schedules` builder.
  - Secure PDF/DOCX file uploads to Supabase Storage (`lesson_plans` bucket).
  - Peer Faculty Coverage Board for claiming class slots when colleagues are absent.
  - Admin denial remarks visibility and substitute coverage tracking.
- **Admin Approvals & Logs (`/admin`)**:
  - Real-time approval queue (oldest first).
  - One-click approvals and denial modal with administrative remarks (`admin_remarks`).
  - Approval History & Logs tab displaying substitute claiming status per class slot.
- **Substitute Job Board (`/substitute`)**:
  - Real-time unclaimed class coverage board.
  - 60-second temporary secure Signed URLs for downloading sub lesson plan attachments.
  - Granular class schedule slot claiming.
- **Supabase Realtime Synchronization**:
  - Live WebSocket listeners (`postgres_changes`) syncing `leave_requests` and `class_schedules` updates seamlessly across all client sessions without page reloads.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Auth Triggers, Realtime WebSockets)
- **Storage**: Supabase Storage (`lesson_plans` private bucket with Signed URLs)
- **Styling**: Tailwind CSS v4 & Lucide React icons

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/GabbyDev0402/faculty-leave-hr-portal.git
   cd faculty-leave-hr-portal
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Database Setup:
   - Run the provided `supabase_schema.sql` script inside the Supabase SQL Editor.
   - Create a private storage bucket named `lesson_plans` in Supabase Storage.

5. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.
