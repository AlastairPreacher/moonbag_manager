/*
  # Add user ownership to assets

  1. Changes
    - Add user_id column to assets table
    - Update RLS policies for assets table to be user-specific
    
  2. Security
    - Assets are now owned by users
    - Users can only view and manage their own assets
*/

-- Add user_id column to assets
ALTER TABLE assets 
ADD COLUMN user_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

-- Drop existing policies
DROP POLICY IF EXISTS "Assets are viewable by everyone" ON assets;
DROP POLICY IF EXISTS "Users can insert assets" ON assets;

-- Create new user-specific policies
CREATE POLICY "Users can view own assets"
  ON assets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own assets"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own assets"
  ON assets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own assets"
  ON assets FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());