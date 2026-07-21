-- Supabase Schema for CalmTodo
-- Run this in your Supabase SQL Editor: https://ipiuhnopkycycirspeky.supabase.co

-- 1. Create todo_sessions table (Groupings)
CREATE TABLE IF NOT EXISTS todo_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    rank INTEGER NOT NULL DEFAULT 1,
    allocated_date DATE,
    color TEXT DEFAULT '#3B82F6',
    completed BOOLEAN DEFAULT FALSE,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create session_events table (Sub-events inside groupings)
CREATE TABLE IF NOT EXISTS session_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES todo_sessions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    event_time TIME,
    duration_mins INTEGER DEFAULT 60,
    location TEXT DEFAULT '',
    completed BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create external_calendars table
CREATE TABLE IF NOT EXISTS external_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'google', -- 'google' or 'apple'
    url TEXT NOT NULL,
    color TEXT DEFAULT '#10B981',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create app_settings table (stores 4-digit PIN hash/code)
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security) - standard policy allowing public access with project key
ALTER TABLE todo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Create policies to allow access
CREATE POLICY "Allow public select todo_sessions" ON todo_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert todo_sessions" ON todo_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update todo_sessions" ON todo_sessions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete todo_sessions" ON todo_sessions FOR DELETE USING (true);

CREATE POLICY "Allow public select session_events" ON session_events FOR SELECT USING (true);
CREATE POLICY "Allow public insert session_events" ON session_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update session_events" ON session_events FOR UPDATE USING (true);
CREATE POLICY "Allow public delete session_events" ON session_events FOR DELETE USING (true);

CREATE POLICY "Allow public select external_calendars" ON external_calendars FOR SELECT USING (true);
CREATE POLICY "Allow public insert external_calendars" ON external_calendars FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update external_calendars" ON external_calendars FOR UPDATE USING (true);
CREATE POLICY "Allow public delete external_calendars" ON external_calendars FOR DELETE USING (true);

CREATE POLICY "Allow public select app_settings" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert app_settings" ON app_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update app_settings" ON app_settings FOR UPDATE USING (true);
CREATE POLICY "Allow public delete app_settings" ON app_settings FOR DELETE USING (true);

-- Insert default pin setting if not present
INSERT INTO app_settings (key, value) 
VALUES ('pin', '"1234"'::jsonb) 
ON CONFLICT (key) DO NOTHING;
