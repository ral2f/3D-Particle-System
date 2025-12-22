/*
  # Create RPC Functions for Preset Operations

  1. Functions
    - `increment_likes` - Increment likes count for a preset
    - `decrement_likes` - Decrement likes count for a preset
    - `increment_views` - Increment views count for a preset
  
  2. Notes
    - These functions ensure atomic updates of counters
    - Prevents race conditions when multiple users interact simultaneously
*/

CREATE OR REPLACE FUNCTION increment_likes(preset_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE user_presets
  SET likes_count = likes_count + 1
  WHERE id = preset_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_likes(preset_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE user_presets
  SET likes_count = GREATEST(0, likes_count - 1)
  WHERE id = preset_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_views(preset_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE user_presets
  SET views_count = views_count + 1
  WHERE id = preset_id;
END;
$$ LANGUAGE plpgsql;
