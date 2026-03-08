/**
 * @file hooks/useProfile.ts
 * TanStack React Query hooks for the `profiles` table.
 *
 * Profiles are created automatically by a Supabase trigger when a new user
 * is inserted into `auth.users`. The trigger also sets `updated_at` on every
 * update, so we never need to set it manually in mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { Profile } from '../lib/types';
import { profileUpdateSchema } from '../lib/validation';

/**
 * Fetches the authenticated user's profile row.
 *
 * The query is disabled when `user` is null to avoid firing during sign-out.
 *
 * @returns React Query result with `data: Profile | undefined`.
 */
export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user,
  });
}

/**
 * Mutation hook for updating the authenticated user's profile.
 *
 * The update payload is validated with `profileUpdateSchema` before the Supabase
 * call. The schema uses `.strict()` which rejects any keys not explicitly listed
 * (e.g. `id`, `email`, `created_at`) preventing accidental overwrite of
 * server-managed fields.
 *
 * `updated_at` is intentionally omitted from the payload — it is managed
 * automatically by the `set_updated_at` trigger on the `profiles` table.
 *
 * On success, the `['profile', user.id]` query key is invalidated so
 * `useProfile` re-fetches the latest data.
 *
 * @returns A mutation. Call `.mutateAsync(updates)` with a `Partial<Profile>`.
 */
export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      // Validate and strip unexpected fields (id, email, created_at blocked by .strict())
      const validated = profileUpdateSchema.parse(updates);

      // updated_at is handled automatically by the database trigger
      const { data, error } = await supabase
        .from('profiles')
        .update(validated)
        .eq('id', user!.id)
        .select()
        .single();

      if (error) throw error;
      return data as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });
}
