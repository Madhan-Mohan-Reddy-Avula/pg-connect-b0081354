import { useState, useEffect } from 'react';

type Role = 'owner' | 'guest' | 'manager';

const ONBOARDING_KEY_PREFIX = 'pg_manager_onboarding_completed_';

export function useOnboarding(role: Role, userId?: string) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  const storageKey = userId ? `${ONBOARDING_KEY_PREFIX}${role}_${userId}` : null;

  useEffect(() => {
    // Don't run until we have a userId
    if (!userId || !storageKey) {
      setIsLoading(false);
      return;
    }

    // Only check once per mount with valid userId
    if (hasChecked) return;

    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
    setHasChecked(true);
    setIsLoading(false);
  }, [storageKey, userId, hasChecked]);

  const completeOnboarding = () => {
    localStorage.setItem(storageKey, 'true');
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(storageKey);
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    isLoading,
    completeOnboarding,
    resetOnboarding,
  };
}
