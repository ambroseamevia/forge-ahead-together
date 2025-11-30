import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useWorkExperience = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: experiences = [], isLoading } = useQuery({
    queryKey: ['work_experience', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('work_experience')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const addExperience = useMutation({
    mutationFn: async (experience: any) => {
      if (!user?.id) throw new Error('No user');

      const { data, error } = await supabase
        .from('work_experience')
        .insert({ ...experience, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work_experience', user?.id] });
      toast.success('Experience added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add experience: ${error.message}`);
    },
  });

  const updateExperience = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('work_experience')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work_experience', user?.id] });
      toast.success('Experience updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update experience: ${error.message}`);
    },
  });

  const deleteExperience = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('work_experience')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work_experience', user?.id] });
      toast.success('Experience deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete experience: ${error.message}`);
    },
  });

  const deleteAllExperiences = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user');

      const { error } = await supabase
        .from('work_experience')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work_experience', user?.id] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete experiences: ${error.message}`);
    },
  });

  return {
    experiences,
    isLoading,
    addExperience: addExperience.mutate,
    updateExperience: updateExperience.mutate,
    deleteExperience: deleteExperience.mutate,
    deleteAllExperiences: deleteAllExperiences.mutateAsync,
    isAdding: addExperience.isPending,
    isUpdating: updateExperience.isPending,
    isDeleting: deleteExperience.isPending,
    isDeletingAll: deleteAllExperiences.isPending,
  };
};
