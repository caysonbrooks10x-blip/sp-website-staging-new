-- ROBUST AUTH TRIGGER
-- This script fixes the 500 Internal Server Error during login by making the
-- user creation trigger robust against errors (like duplicate usernames).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_username text;
BEGIN
  -- 1. Generate a safe username
  -- Try to use name from metadata, otherwise email prefix, otherwise user ID segment
  v_username := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    'user_' || substr(new.id::text, 1, 8)
  );

  -- 2. Create Profile (Safely)
  BEGIN
    INSERT INTO public.profiles (id, username, avatar_url, role, credits)
    VALUES (
      new.id,
      v_username,
      new.raw_user_meta_data->>'avatar_url',
      'user',
      100 -- Default credits
    );
  EXCEPTION WHEN unique_violation THEN
    -- If username taken, try appending random suffix
    BEGIN
        INSERT INTO public.profiles (id, username, avatar_url, role, credits)
        VALUES (
            new.id,
            v_username || '_' || floor(random() * 1000)::text,
            new.raw_user_meta_data->>'avatar_url',
            'user',
            100
        );
    EXCEPTION WHEN OTHERS THEN
        -- If even that fails, just log it and continue. 
        -- DO NOT BLOCK LOGIN.
        RAISE WARNING 'Could not create profile for user %: %', new.id, SQLERRM;
    END;
  WHEN OTHERS THEN
    RAISE WARNING 'Unexpected error creating profile: %', SQLERRM;
  END;

  -- 3. Create Credits (Safely)
  BEGIN
    INSERT INTO public.user_credits (user_id, balance)
    VALUES (new.id, 100)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not create user_credits: %', SQLERRM;
  END;

  RETURN new;
END;
$$;

-- Re-create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
