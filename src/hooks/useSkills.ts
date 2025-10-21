import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useSkills = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: skills = [], isLoading } = useQuery({
    queryKey: ['skills', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const addSkill = useMutation({
    mutationFn: async (skill: { name: string; type: string; proficiency: string }) => {
      if (!user?.id) throw new Error('No user');

      const { data, error } = await supabase
        .from('skills')
        .insert({
          user_id: user.id,
          skill_name: skill.name,
          skill_type: skill.type as 'technical' | 'soft' | 'language',
          proficiency_level: skill.proficiency,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills', user?.id] });
      toast.success('Skill added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add skill: ${error.message}`);
    },
  });

  const updateSkill = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('skills')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills', user?.id] });
      toast.success('Skill updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update skill: ${error.message}`);
    },
  });

  const deleteSkill = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('skills')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills', user?.id] });
      toast.success('Skill deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete skill: ${error.message}`);
    },
  });

  const groupedSkills = {
    technical: skills.filter((s) => s.skill_type === 'technical'),
    soft: skills.filter((s) => s.skill_type === 'soft'),
    language: skills.filter((s) => s.skill_type === 'language'),
  };

  return {
    skills,
    groupedSkills,
    isLoading,
    addSkill: addSkill.mutate,
    updateSkill: updateSkill.mutate,
    deleteSkill: deleteSkill.mutate,
    isAdding: addSkill.isPending,
    isUpdating: updateSkill.isPending,
    isDeleting: deleteSkill.isPending,
  };
};
