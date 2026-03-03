# Student Hostel Booking Application - Complete Setup Guide

## Table of Contents
1. [Application Overview](#application-overview)
2. [Technology Stack](#technology-stack)
3. [Application Architecture](#application-architecture)
4. [Database Setup](#database-setup)
5. [Admin Role Creation](#admin-role-creation)
6. [Development Setup](#development-setup)
7. [Features Guide](#features-guide)
8. [Troubleshooting](#troubleshooting)

---

## Application Overview

The Student Hostel Booking Application is a web-based platform designed to help students find and browse available hostels. The application provides:

- **Public Interface**: Browse, search, and filter hostels by location, price, and room type
- **Admin Dashboard**: Manage hostels, room types, and view statistics (admin access only)
- **Authentication**: Secure admin login using Supabase Auth

### Key Features
- Search hostels by name
- Filter by location, price range, and room types
- View detailed hostel information with images
- Admin panel for hostel management
- Real-time updates with Supabase
- Responsive design for mobile and desktop

---

## Technology Stack

### Frontend
- **React 18.3.1** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling framework
- **Shadcn/ui** - UI component library
- **Lucide React** - Icon library
- **React Router DOM** - Client-side routing
- **React Query** - Data fetching and caching

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication
  - Row Level Security (RLS)
  - Storage for images
  - Real-time subscriptions

---

## Application Architecture

### Pages
1. **Index (`/`)** - Main landing page with hostel listings
2. **Admin Dashboard (`/admin`)** - Admin panel for managing hostels
3. **Admin Login (`/admin/login`)** - Authentication page for admins
4. **404 Page** - Not found page

### Key Components

#### Public Components
- `HostelCard` - Displays individual hostel preview
- `HostelFilters` - Search and filter functionality
- `HostelDetailsModal` - Full hostel information display
- `Header` - Navigation header

#### Admin Components
- `AddHostelModal` - Create new hostels
- `EditHostelModal` - Update existing hostels
- Alert dialogs for delete confirmation

### Database Schema

#### Tables

**1. hostels**
```sql
- id (uuid, primary key)
- name (text)
- description (text)
- location (text)
- address (text)
- manager_name (text)
- manager_email (text)
- manager_phone (text)
- google_maps_link (text, nullable)
- images (text[], array of image URLs)
- total_rooms (integer)
- available_rooms (integer)
- starting_price (integer)
- created_at (timestamp)
- updated_at (timestamp)
```

**2. room_types**
```sql
- id (uuid, primary key)
- hostel_id (uuid, foreign key to hostels)
- type (text) - e.g., "Single (1-in-1)", "Double (2-in-1)", "Quad (4-in-1)"
- price_per_student (integer)
- available_rooms (integer)
- created_at (timestamp)
```

**3. profiles**
```sql
- id (uuid, primary key, references auth.users)
- email (text)
- full_name (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

**4. user_roles**
```sql
- id (uuid, primary key)
- user_id (uuid, references auth.users)
- role (app_role enum: 'admin', 'moderator', 'user')
- created_at (timestamp)
```

#### Storage Buckets
- **hostel-images** - Public bucket for hostel images

---

## Database Setup

### Step 1: Create Database Tables

Execute the following SQL in your Supabase SQL Editor:

```sql
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  UNIQUE(user_id, role)
);

-- Create hostels table
CREATE TABLE public.hostels (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  address TEXT NOT NULL,
  manager_name TEXT NOT NULL,
  manager_email TEXT NOT NULL,
  manager_phone TEXT NOT NULL,
  google_maps_link TEXT,
  images TEXT[] DEFAULT '{}'::TEXT[],
  total_rooms INTEGER NOT NULL DEFAULT 0,
  available_rooms INTEGER NOT NULL DEFAULT 0,
  starting_price INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Create room_types table
CREATE TABLE public.room_types (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  hostel_id UUID NOT NULL REFERENCES public.hostels ON DELETE CASCADE,
  type TEXT NOT NULL,
  price_per_student INTEGER NOT NULL,
  available_rooms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);
```

### Step 2: Create Database Functions

```sql
-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  new.updated_at = NOW();
  RETURN new;
END;
$$;
```

### Step 3: Create Triggers

```sql
-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update hostels updated_at
CREATE TRIGGER update_hostels_updated_at
  BEFORE UPDATE ON public.hostels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### Step 4: Enable Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- User roles policies (admin only)
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Hostels policies
CREATE POLICY "Anyone can view hostels"
  ON public.hostels FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert hostels"
  ON public.hostels FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update hostels"
  ON public.hostels FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete hostels"
  ON public.hostels FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Room types policies
CREATE POLICY "Anyone can view room types"
  ON public.room_types FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert room types"
  ON public.room_types FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update room types"
  ON public.room_types FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete room types"
  ON public.room_types FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
```

### Step 5: Create Storage Bucket

1. Go to **Storage** in your Supabase dashboard
2. Create a new bucket named `hostel-images`
3. Make it **public**
4. Add the following storage policies:

```sql
-- Allow public read access
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hostel-images');

-- Allow admins to upload
CREATE POLICY "Admin Upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'hostel-images' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Allow admins to delete
CREATE POLICY "Admin Delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'hostel-images' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );
```

---

## Admin Role Creation

### Method 1: Using Supabase Dashboard (Recommended)

#### Step 1: Create an Admin User
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add user** → **Create new user**
4. Enter email and password for the admin account
5. Check **Auto Confirm User** to skip email verification
6. Click **Create user**
7. Copy the **User UID** from the users list

#### Step 2: Assign Admin Role
1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New query**
3. Execute the following SQL (replace `YOUR_USER_ID` with the actual UUID):

```sql
-- Insert admin role for the user
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_USER_ID', 'admin'::app_role);
```

4. Click **Run** to execute

#### Step 3: Verify Admin Access
1. Go to your application
2. Navigate to `/admin/login`
3. Login with the admin credentials
4. You should be redirected to the admin dashboard

### Method 2: Using SQL for First Admin

If you're setting up the first admin and need to insert directly:

```sql
-- Create user and assign admin role in one go
-- First, get the user ID from auth.users after creating the account
SELECT id, email FROM auth.users WHERE email = 'admin@example.com';

-- Then insert the admin role
INSERT INTO public.user_roles (user_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@example.com'),
  'admin'::app_role
);
```

### Method 3: Programmatic Admin Creation

For development/testing, you can create a setup script:

```typescript
// admin-setup.ts
import { supabase } from '@/integrations/supabase/client';

async function createAdmin(email: string, password: string) {
  // 1. Sign up the user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    console.error('Error creating user:', authError);
    return;
  }

  console.log('User created:', authData.user?.id);

  // 2. Assign admin role (requires another admin to be logged in)
  // OR execute the following SQL manually in Supabase dashboard:
  // INSERT INTO public.user_roles (user_id, role)
  // VALUES ('USER_ID_HERE', 'admin'::app_role);
}

// Usage
createAdmin('admin@example.com', 'secure_password_here');
```

### Adding Additional Admins

Once you have one admin, you can add more admins through:

1. **SQL Editor** (as shown above)
2. **Future Admin Panel Feature** (can be built to allow admins to promote users)
3. **Edge Function** (for automated admin management)

### Security Best Practices for Admins

1. **Strong Passwords**: Use complex passwords (12+ characters, mixed case, numbers, symbols)
2. **Email Verification**: Enable email confirmation in production
3. **2FA**: Consider enabling two-factor authentication in Supabase Auth settings
4. **Audit Logging**: Monitor admin actions through Supabase logs
5. **Limit Admin Accounts**: Only create admin accounts for trusted personnel
6. **Regular Review**: Periodically review and remove inactive admin accounts

---

## Development Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- Git

### Installation Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd student-hostel-booking
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Supabase**

Create a `.env` file in the root directory (if not exists):

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://coruxfhqovudriizlemc.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Note**: The project already has these configured in `src/integrations/supabase/client.ts`

4. **Run database migrations**

All migrations are in `supabase/migrations/` directory. Execute them in order in your Supabase SQL Editor, or follow the [Database Setup](#database-setup) section above.

5. **Start development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the port shown in terminal)

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

---

## Features Guide

### For Regular Users

#### Browse Hostels
1. Visit the home page
2. Hostels are displayed in a grid layout with basic information
3. Scroll through the available hostels

#### Search and Filter
1. Click the **Search & Filter Hostels** button at the top of the page
2. Use the search bar to find hostels by name
3. Apply filters:
   - **Location**: Select specific location or "All Locations"
   - **Price Range**: Adjust slider between ₵300 - ₵5000
   - **Room Types**: Check boxes for Single, Double, or Quad rooms
4. Click **Reset** to clear all filters

#### View Hostel Details
1. Click **View Details** on any hostel card
2. Modal displays:
   - Image gallery (navigate with arrows)
   - Complete hostel information
   - Available room types and prices
   - Manager contact information
   - Google Maps link (if available)

### For Administrators

#### Access Admin Dashboard
1. Navigate to `/admin/login`
2. Enter your admin email and password
3. Click **Login**
4. You'll be redirected to the admin dashboard

#### Admin Dashboard Overview
The dashboard displays:
- **Total Hostels**: Count of all hostels in system
- **Total Rooms**: Sum of all rooms across hostels
- **Available Rooms**: Count of currently available rooms

#### Add New Hostel
1. Click **Add New Hostel** button
2. Fill in the form:
   - **Basic Information**: Name, location, address, description
   - **Manager Details**: Name, email, phone
   - **Room Information**: Total rooms, available rooms, starting price
   - **Image**: Upload hostel image
   - **Google Maps Link**: Optional
3. Add room types:
   - Click **Add Room Type**
   - Select type (Single/Double/Quad)
   - Enter price per student
   - Enter available rooms
   - Click **Add** or remove with X button
4. Click **Add Hostel** to save

#### Edit Existing Hostel
1. Find the hostel in the admin dashboard table
2. Click the **Edit** button (pencil icon)
3. Modify any fields as needed
4. Update room types or add new ones
5. Upload a new image if desired (appends to existing images)
6. Click **Update Hostel**

#### Delete Hostel
1. Find the hostel in the admin dashboard table
2. Click the **Delete** button (trash icon)
3. Confirm deletion in the dialog
4. Hostel and all associated room types will be removed

#### Logout
Click the **Logout** button in the top right corner of the admin dashboard

---

## Troubleshooting

### Common Issues

#### 1. "Row violates row-level security policy" Error
**Problem**: Trying to perform admin actions without admin role

**Solution**:
- Verify you're logged in as admin
- Check that your user has admin role in `user_roles` table
- Run this query to verify:
```sql
SELECT * FROM public.user_roles WHERE user_id = 'YOUR_USER_ID';
```

#### 2. Hostels Not Displaying
**Problem**: Blank page or no hostels showing

**Solution**:
- Check browser console for errors
- Verify database connection in Supabase dashboard
- Ensure RLS policies allow public SELECT on hostels table
- Check if there are hostels in the database:
```sql
SELECT COUNT(*) FROM public.hostels;
```

#### 3. Images Not Uploading
**Problem**: Image upload fails or doesn't display

**Solution**:
- Verify `hostel-images` bucket exists and is public
- Check storage policies allow admin INSERT
- Verify file size is under limit (typically 50MB)
- Check browser console for error messages

#### 4. Can't Login to Admin Panel
**Problem**: Login fails or redirects back to login

**Solution**:
- Verify email and password are correct
- Check if user exists in Supabase Auth → Users
- Verify admin role is assigned in `user_roles` table
- Check browser console for auth errors
- Clear browser cache and cookies

#### 5. Search/Filter Not Working
**Problem**: Filtering doesn't show expected results

**Solution**:
- Verify hostel data has correct location values
- Check price ranges match your hostel prices
- Ensure room_types table has data for hostels
- Review browser console for JavaScript errors

### Debug Mode

To enable detailed logging:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Check for error messages
4. Look for network tab to see API calls

### Getting Help

If you encounter issues:

1. Check the console logs for detailed error messages
2. Review Supabase logs in your project dashboard
3. Verify your database schema matches this documentation
4. Check that all migrations have been run successfully
5. Ensure environment variables are correctly configured

---

## Additional Resources

### Supabase Dashboard Links
- **Project URL**: https://coruxfhqovudriizlemc.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/coruxfhqovudriizlemc
- **SQL Editor**: https://supabase.com/dashboard/project/coruxfhqovudriizlemc/sql/new
- **Authentication**: https://supabase.com/dashboard/project/coruxfhqovudriizlemc/auth/users
- **Storage**: https://supabase.com/dashboard/project/coruxfhqovudriizlemc/storage/buckets

### Documentation
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)

---

## Maintenance and Updates

### Regular Maintenance Tasks

1. **Monitor Storage Usage**: Check hostel-images bucket size regularly
2. **Review Admin Accounts**: Audit admin users quarterly
3. **Database Backups**: Supabase automatically backs up, but verify in dashboard
4. **Update Dependencies**: Run `npm update` monthly to get security patches
5. **Monitor Logs**: Check Supabase logs for unusual activity

### Future Enhancements

Potential features to consider:
- Student booking system with payments
- Room availability calendar
- Email notifications for bookings
- Student reviews and ratings
- Multi-language support
- Advanced search with map view
- Hostel comparison feature
- Mobile app version

---

**Last Updated**: 2025-10-07
**Version**: 1.0.0
**Documentation Maintained By**: Development Team
