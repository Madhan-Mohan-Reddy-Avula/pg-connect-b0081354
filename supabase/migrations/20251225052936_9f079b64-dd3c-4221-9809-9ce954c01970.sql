-- Create a function to link guest record when user signs up
CREATE OR REPLACE FUNCTION public.link_guest_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's a guest record with matching email
  UPDATE public.guests 
  SET user_id = NEW.id
  WHERE email = NEW.email 
    AND user_id != NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to run after user signup
DROP TRIGGER IF EXISTS on_auth_user_created_link_guest ON auth.users;
CREATE TRIGGER on_auth_user_created_link_guest
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.link_guest_on_signup();