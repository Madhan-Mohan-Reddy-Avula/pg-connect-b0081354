import { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface ManagerPermissions {
  can_view_guests: boolean;
  can_manage_guests: boolean;
  can_view_rents: boolean;
  can_manage_rents: boolean;
  can_view_payments: boolean;
  can_verify_payments: boolean;
  can_view_complaints: boolean;
  can_manage_complaints: boolean;
  can_view_expenses: boolean;
  can_manage_expenses: boolean;
  can_view_rooms: boolean;
  can_manage_rooms: boolean;
  can_view_announcements: boolean;
  can_manage_announcements: boolean;
  can_view_analytics: boolean;
}

interface ManagerData {
  id: string;
  pg_id: string;
  name: string;
  email: string;
  permissions: ManagerPermissions;
}

interface ManagerContextType {
  isManager: boolean;
  isOwner: boolean;
  managerData: ManagerData | null;
  pgId: string | null;
  loading: boolean;
  hasPermission: (permission: keyof ManagerPermissions) => boolean;
}

const ManagerContext = createContext<ManagerContextType | undefined>(undefined);

export function ManagerProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();

  // Check if user is a manager
  const { data: managerInfo, isLoading: managerLoading } = useQuery({
    queryKey: ['manager-info', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('managers')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && role === 'owner',
  });

  // Check if user is an owner (has their own PG)
  const { data: ownerPg, isLoading: ownerLoading } = useQuery({
    queryKey: ['owner-pg-check', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pgs')
        .select('id')
        .eq('owner_id', user!.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && role === 'owner',
  });

  const isOwner = !!ownerPg;
  const isManager = !isOwner && !!managerInfo;

  const managerData: ManagerData | null = managerInfo ? {
    id: managerInfo.id,
    pg_id: managerInfo.pg_id,
    name: managerInfo.name,
    email: managerInfo.email,
    permissions: {
      can_view_guests: managerInfo.can_view_guests,
      can_manage_guests: managerInfo.can_manage_guests,
      can_view_rents: managerInfo.can_view_rents,
      can_manage_rents: managerInfo.can_manage_rents,
      can_view_payments: managerInfo.can_view_payments,
      can_verify_payments: managerInfo.can_verify_payments,
      can_view_complaints: managerInfo.can_view_complaints,
      can_manage_complaints: managerInfo.can_manage_complaints,
      can_view_expenses: managerInfo.can_view_expenses,
      can_manage_expenses: managerInfo.can_manage_expenses,
      can_view_rooms: managerInfo.can_view_rooms,
      can_manage_rooms: managerInfo.can_manage_rooms,
      can_view_announcements: managerInfo.can_view_announcements,
      can_manage_announcements: managerInfo.can_manage_announcements,
      can_view_analytics: managerInfo.can_view_analytics,
    },
  } : null;

  // Determine the PG ID to use
  const pgId = isOwner ? ownerPg?.id : managerData?.pg_id || null;

  const hasPermission = (permission: keyof ManagerPermissions): boolean => {
    // Owners have all permissions
    if (isOwner) return true;
    // Managers check their specific permissions
    if (isManager && managerData) {
      return managerData.permissions[permission];
    }
    return false;
  };

  return (
    <ManagerContext.Provider 
      value={{ 
        isManager, 
        isOwner, 
        managerData, 
        pgId,
        loading: managerLoading || ownerLoading,
        hasPermission,
      }}
    >
      {children}
    </ManagerContext.Provider>
  );
}

export function useManager() {
  const context = useContext(ManagerContext);
  if (context === undefined) {
    throw new Error('useManager must be used within a ManagerProvider');
  }
  return context;
}
