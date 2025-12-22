/*
  # Create Particle Presets and Community Gallery Schema

  1. New Tables
    - `user_presets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, optional for anonymous users)
      - `name` (text, preset name)
      - `template` (text, particle template type)
      - `color` (text, hex color code)
      - `particle_count` (integer, number of particles)
      - `particle_size` (integer, size of particles)
      - `rainbow_mode` (boolean, rainbow color mode)
      - `is_public` (boolean, visible in community gallery)
      - `likes_count` (integer, number of likes)
      - `views_count` (integer, number of views)
      - `created_at` (timestamptz, creation timestamp)
      - `updated_at` (timestamptz, last update timestamp)
    
    - `preset_likes`
      - `id` (uuid, primary key)
      - `preset_id` (uuid, foreign key to user_presets)
      - `user_id` (uuid, user who liked)
      - `created_at` (timestamptz, like timestamp)
    
    - `preset_comments`
      - `id` (uuid, primary key)
      - `preset_id` (uuid, foreign key to user_presets)
      - `user_id` (uuid, commenter)
      - `comment` (text, comment content)
      - `created_at` (timestamptz, comment timestamp)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own presets
    - Add policies for public read access to public presets
    - Add policies for likes and comments
*/

CREATE TABLE IF NOT EXISTS user_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  template text NOT NULL,
  color text NOT NULL,
  particle_count integer NOT NULL DEFAULT 12000,
  particle_size integer NOT NULL DEFAULT 6,
  rainbow_mode boolean DEFAULT false,
  is_public boolean DEFAULT false,
  likes_count integer DEFAULT 0,
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS preset_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id uuid NOT NULL REFERENCES user_presets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(preset_id, user_id)
);

CREATE TABLE IF NOT EXISTS preset_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id uuid NOT NULL REFERENCES user_presets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE preset_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE preset_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public presets"
  ON user_presets
  FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view own presets"
  ON user_presets
  FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Anyone can create presets"
  ON user_presets
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own presets"
  ON user_presets
  FOR UPDATE
  USING (user_id IS NULL OR auth.uid() = user_id)
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can delete own presets"
  ON user_presets
  FOR DELETE
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Anyone can view likes"
  ON preset_likes
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create likes"
  ON preset_likes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete own likes"
  ON preset_likes
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view comments"
  ON preset_comments
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create comments"
  ON preset_comments
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own comments"
  ON preset_comments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON preset_comments
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_presets_public ON user_presets(is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_presets_likes ON user_presets(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_preset_likes_preset ON preset_likes(preset_id);
CREATE INDEX IF NOT EXISTS idx_preset_comments_preset ON preset_comments(preset_id);
