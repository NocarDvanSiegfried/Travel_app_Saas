'use client';

import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface SessionTimeoutContextType {
  isActive: boolean;
  timeRemaining: number;
  extendSession: () => void;
  logout: () => void;
  resetTimer: () => void;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | null>(null);

interface SessionTimeoutProviderProps {
  children: React.ReactNode;
  timeoutMinutes?: number;
  warningMinutes?: number;
}

export const SessionTimeoutProvider: React.FC<SessionTimeoutProviderProps> = ({
  children,
  timeoutMinutes = 15,
  warningMinutes = 2
}) => {
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(warningMinutes * 60);
  const [countdownActive, setCountdownActive] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningRef = useRef<NodeJS.Timeout>();
  const countdownRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    // Reset state
    setIsActive(false);
    setCountdownActive(false);
    setTimeRemaining(warningMinutes * 60);
    lastActivityRef.current = Date.now();

    // Set warning timer (timeout - warning)
    const warningTime = (timeoutMinutes - warningMinutes) * 60 * 1000;
    warningRef.current = setTimeout(() => {
      setIsActive(true);
      setCountdownActive(true);
      startCountdown();
    }, warningTime);

    // Set session timeout
    const timeoutTime = timeoutMinutes * 60 * 1000;
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, timeoutTime);
  }, [timeoutMinutes, warningMinutes]);

  const startCountdown = useCallback(() => {
    let timeLeft = warningMinutes * 60;

    countdownRef.current = setInterval(() => {
      timeLeft -= 1;
      setTimeRemaining(timeLeft);

      if (timeLeft <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        handleLogout();
      }
    }, 1000);
  }, [warningMinutes]);

  const extendSession = useCallback(() => {
    resetTimer();
    setIsActive(false);
    setCountdownActive(false);
  }, [resetTimer]);

  const handleLogout = useCallback(async () => {
    try {
      // Clear all timers
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);

      // Call logout API
      await fetch('/api/b2b-portal/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      // Redirect to login
      window.location.href = window.location.pathname.includes('/b2b-portal/')
        ? `/b2b-portal${window.location.pathname.split('/b2b-portal')[1]}/login`
        : '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Fallback redirect
      window.location.href = '/login';
    }
  }, []);

  // Track user activity
  useEffect(() => {
    const events = [
      'mousedown', 'mousemove', 'keypress',
      'scroll', 'touchstart', 'touchmove',
      'click', 'focus', 'blur'
    ];

    const handleActivity = () => {
      // Throttle activity detection to prevent excessive resets
      const now = Date.now();
      if (now - lastActivityRef.current > 1000) { // 1 second throttle
        resetTimer();
        lastActivityRef.current = now;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if session is still valid when tab becomes visible
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        const maxInactiveTime = timeoutMinutes * 60 * 1000;

        if (timeSinceLastActivity > maxInactiveTime) {
          handleLogout();
        } else {
          resetTimer();
        }
      }
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, {
        passive: true,
        capture: true
      });
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [resetTimer, timeoutMinutes, handleLogout]);

  // Prevent tab from being cached (for security)
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Page was restored from back/forward cache
        handleLogout();
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [handleLogout]);

  const contextValue: SessionTimeoutContextType = {
    isActive,
    timeRemaining,
    extendSession,
    logout: handleLogout,
    resetTimer
  };

  return (
    <SessionTimeoutContext.Provider value={contextValue}>
      {children}
      {isActive && <SecurityOverlay timeRemaining={timeRemaining} onExtend={extendSession} />}
    </SessionTimeoutContext.Provider>
  );
};

export const useSessionTimeout = () => {
  const context = useContext(SessionTimeoutContext);
  if (!context) {
    throw new Error('useSessionTimeout must be used within SessionTimeoutProvider');
  }
  return context;
};

interface SecurityOverlayProps {
  timeRemaining: number;
  onExtend: () => void;
}

const SecurityOverlay: React.FC<SecurityOverlayProps> = ({ timeRemaining, onExtend }) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (seconds: number): string => {
    if (seconds > 60) return 'text-yellow-600';
    if (seconds > 30) return 'text-orange-600';
    return 'text-red-600';
  };

  const getProgressPercentage = (): number => {
    return ((2 * 60 - timeRemaining) / (2 * 60)) * 100; // 2 minutes total
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 shadow-2xl border-2 border-red-200">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            {/* Warning Icon */}
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <Lock className="h-8 w-8 text-red-600" />
            </div>

            {/* Warning Title */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Сессия будет завершена
              </h2>
              <p className="text-gray-600">
                В целях безопасности ваша сессия будет автоматически завершена
              </p>
            </div>

            {/* Countdown Timer */}
            <div className="space-y-3">
              <div className="relative">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 transition-all duration-1000 ease-linear"
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
              </div>

              <div className={`text-4xl font-mono font-bold ${getTimeColor(timeRemaining)}`}>
                {formatTime(timeRemaining)}
              </div>

              <p className="text-sm text-gray-500">
                {timeRemaining > 60
                  ? 'Осталось больше минуты'
                  : timeRemaining > 30
                    ? 'Менее минуты до завершения'
                    : 'Сессия завершится очень скоро'
                }
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                className="w-full h-12 text-base font-semibold"
                onClick={onExtend}
              >
                Продолжить работу
              </Button>

              <Button
                variant="outline"
                className="w-full h-12 text-base"
                onClick={() => window.location.reload()}
              >
                Выйти сейчас
              </Button>
            </div>

            {/* Security Info */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                <AlertTriangle className="h-3 w-3" />
                <span>
                  Автоматическое завершение сессии защищает вашу учетную запись
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};