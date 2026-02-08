-- Lily Demo — Database Schema
-- Run this in Supabase SQL Editor

-- Demo users: identified by phone number, no auth
create table lily_users (
  phone text primary key,
  first_task_sent boolean default false,
  lily_memory text default '',
  created_at timestamptz default now()
);

-- Tasks: what Lily is holding for each user
create table lily_tasks (
  id uuid primary key default gen_random_uuid(),
  phone text not null references lily_users(phone),
  summary text not null,
  reminder_at timestamptz,
  scratch text,
  status text default 'pending'
    check (status in ('pending', 'reminded', 'done')),
  is_preview boolean default false,
  created_at timestamptz default now()
);

create index idx_lily_tasks_sweep
  on lily_tasks(reminder_at) where status = 'pending';
create index idx_lily_tasks_phone
  on lily_tasks(phone, status);

-- Conversation history: AI context for multi-turn understanding
create table lily_conversations (
  id uuid primary key default gen_random_uuid(),
  phone text not null references lily_users(phone),
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

create index idx_lily_conv_phone
  on lily_conversations(phone, created_at desc);
