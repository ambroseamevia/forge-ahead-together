import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useEducation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: education = [], isLoading } = useQuery({
    queryKey: ['education', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('education')
        .select('*')
        .eq('user_id', user.id)
        .order('graduation_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const addEducation = useMutation({
    mutationFn: async (edu: any) => {
      if (!user?.id) throw new Error('No user');

      const { data, error } = await supabase
        .from('education')
        .insert({ ...edu, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education', user?.id] });
      toast.success('Education added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add education: ${error.message}`);
    },
  });

  const updateEducation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('education')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education', user?.id] });
      toast.success('Education updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update education: ${error.message}`);
    },
  });

  const deleteEducation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('education')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education', user?.id] });
      toast.success('Education deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete education: ${error.message}`);
    },
  });

  return {
    education,
    isLoading,
    addEducation: addEducation.mutate,
    updateEducation: updateEducation.mutate,
    deleteEducation: deleteEducation.mutate,
    isAdding: addEducation.isPending,
    isUpdating: updateEducation.isPending,
    isDeleting: deleteEducation.isPending,
  };
};
