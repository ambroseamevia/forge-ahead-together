import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useCVs = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: cvs = [], isLoading } = useQuery({
    queryKey: ['cvs', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('cvs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const deleteCv = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cvs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cvs', user?.id] });
      toast.success('CV deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete CV: ${error.message}`);
    },
  });

  const deleteAllCVs = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user');

      const { error } = await supabase
        .from('cvs')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cvs', user?.id] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete CVs: ${error.message}`);
    },
  });

  return {
    cvs,
    isLoading,
    deleteCv: deleteCv.mutate,
    deleteAllCVs: deleteAllCVs.mutateAsync,
    isDeleting: deleteCv.isPending,
    isDeletingAll: deleteAllCVs.isPending,
  };
};
