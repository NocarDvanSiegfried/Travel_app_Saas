'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  Smartphone,
  Key,
  AlertTriangle,
  CheckCircle,
  Clock,
  User
} from 'lucide-react';
import QRCode from 'qrcode';

interface LoginState {
  email: string;
  password: string;
  rememberMe: boolean;
  showPassword: boolean;
  isLoading: boolean;
  error: string | null;
}

interface TwoFactorState {
  method: 'totp' | 'sms';
  code: string;
  phoneNumber: string;
  qrCode: string;
  backupCodes: string[];
  isLoading: boolean;
  error: string | null;
  attempts: number;
  timeRemaining: number;
}

interface CompanyInfo {
  id: string;
  name: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  twoFactorRequired: boolean;
}

export default function B2BPortalLoginPage() {
  const params = useParams();
  const router = useRouter();
  const [companySlug] = useState(params.company as string);

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loginStep, setLoginStep] = useState<'credentials' | 'twofactor' | 'setup'>('credentials');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [loginState, setLoginState] = useState<LoginState>({
    email: '',
    password: '',
    rememberMe: false,
    showPassword: false,
    isLoading: false,
    error: null
  });

  const [twoFactorState, setTwoFactorState] = useState<TwoFactorState>({
    method: 'totp',
    code: '',
    phoneNumber: '',
    qrCode: '',
    backupCodes: [],
    isLoading: false,
    error: null,
    attempts: 0,
    timeRemaining: 0
  });

  // Load company info
  useEffect(() => {
    const loadCompanyInfo = async () => {
      try {
        const response = await fetch(`/api/b2b-portal/${companySlug}/config`);
        if (!response.ok) {
          throw new Error('Company not found');
        }
        const data = await response.json();
        setCompanyInfo(data);

        // Apply company branding
        if (data.primaryColor) {
          document.documentElement.style.setProperty('--company-primary', data.primaryColor);
        }
        if (data.secondaryColor) {
          document.documentElement.style.setProperty('--company-secondary', data.secondaryColor);
        }
      } catch (error) {
        setLoginState(prev => ({
          ...prev,
          error: 'Company not found or access denied'
        }));
      }
    };

    loadCompanyInfo();
  }, [companySlug]);

  // Timer for 2FA code expiry
  useEffect(() => {
    if (twoFactorState.timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTwoFactorState(prev => ({
          ...prev,
          timeRemaining: prev.timeRemaining - 1
        }));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [twoFactorState.timeRemaining]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginState.email || !loginState.password) {
      setLoginState(prev => ({
        ...prev,
        error: 'Please enter email and password'
      }));
      return;
    }

    setLoginState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/b2b-portal/${companySlug}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginState.email,
          password: loginState.password,
          rememberMe: loginState.rememberMe,
          companySlug
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setLoginState(prev => ({
            ...prev,
            error: 'Too many login attempts. Please try again later.',
            isLoading: false
          }));
        } else {
          setLoginState(prev => ({
            ...prev,
            error: data.message || 'Invalid credentials',
            isLoading: false
          }));
        }
        return;
      }

      if (data.requiresTwoFactor) {
        setSessionId(data.sessionId);
        setTwoFactorState(prev => ({
          ...prev,
          qrCode: data.qrCode,
          backupCodes: data.backupCodes || [],
          phoneNumber: data.phoneNumber || '',
          timeRemaining: 600, // 10 minutes
          method: data.twoFactorMethod || 'totp'
        }));
        setLoginStep('twofactor');
      } else if (data.requiresTwoFactorSetup) {
        setSessionId(data.sessionId);
        setTwoFactorState(prev => ({
          ...prev,
          qrCode: data.qrCode,
          backupCodes: data.backupCodes || [],
          timeRemaining: 600
        }));
        setLoginStep('setup');
      } else {
        // Login successful without 2FA
        router.push(`/b2b-portal/${companySlug}`);
      }
    } catch (error) {
      setLoginState(prev => ({
        ...prev,
        error: 'Network error. Please try again.',
        isLoading: false
      }));
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!twoFactorState.code) {
      setTwoFactorState(prev => ({
        ...prev,
        error: 'Please enter verification code'
      }));
      return;
    }

    setTwoFactorState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/b2b-portal/${companySlug}/auth/verify-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          code: twoFactorState.code,
          method: twoFactorState.method
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const newAttempts = twoFactorState.attempts + 1;
        if (newAttempts >= 3) {
          setTwoFactorState(prev => ({
            ...prev,
            error: 'Too many failed attempts. Please login again.',
            attempts: newAttempts,
            isLoading: false
          }));
          setTimeout(() => {
            setLoginStep('credentials');
            setTwoFactorState(prev => ({ ...prev, attempts: 0 }));
          }, 3000);
        } else {
          setTwoFactorState(prev => ({
            ...prev,
            error: data.message || 'Invalid verification code',
            attempts: newAttempts,
            isLoading: false
          }));
        }
        return;
      }

      // 2FA verification successful
      router.push(`/b2b-portal/${companySlug}`);
    } catch (error) {
      setTwoFactorState(prev => ({
        ...prev,
        error: 'Network error. Please try again.',
        isLoading: false
      }));
    }
  };

  const handleSmsRequest = async () => {
    setTwoFactorState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/b2b-portal/${companySlug}/auth/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          phoneNumber: twoFactorState.phoneNumber
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setTwoFactorState(prev => ({
          ...prev,
          error: data.message || 'Failed to send SMS code',
          isLoading: false
        }));
        return;
      }

      setTwoFactorState(prev => ({
        ...prev,
        method: 'sms',
        timeRemaining: 300, // 5 minutes for SMS
        isLoading: false
      }));
    } catch (error) {
      setTwoFactorState(prev => ({
        ...prev,
        error: 'Failed to send SMS code. Please try again.',
        isLoading: false
      }));
    }
  };

  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!companyInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Company Header */}
        <div className="text-center">
          {companyInfo.logo && (
            <img
              src={companyInfo.logo}
              alt={`${companyInfo.name} logo`}
              className="mx-auto h-12 w-auto mb-4"
            />
          )}
          <h2 className="text-3xl font-bold text-gray-900">
            {companyInfo.name}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            B2B Portal Login
          </p>
          {companyInfo.twoFactorRequired && (
            <div className="mt-2 flex items-center justify-center">
              <Shield className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-xs text-green-600">2FA Required</span>
            </div>
          )}
        </div>

        {/* Login Forms */}
        <Card>
          <CardContent className="p-6">
            {loginStep === 'credentials' && (
              <form onSubmit={handleCredentialsSubmit} className="space-y-6">
                {loginState.error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{loginState.error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={loginState.email}
                      onChange={(e) => setLoginState(prev => ({ ...prev, email: e.target.value }))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="relative mt-1">
                      <Input
                        id="password"
                        type={loginState.showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={loginState.password}
                        onChange={(e) => setLoginState(prev => ({ ...prev, password: e.target.value }))}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setLoginState(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                      >
                        {loginState.showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={loginState.rememberMe}
                      onChange={(e) => setLoginState(prev => ({ ...prev, rememberMe: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <Label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                      Remember me
                    </Label>
                  </div>

                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-500"
                    onClick={() => router.push(`/b2b-portal/${companySlug}/forgot-password`)}
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginState.isLoading}
                  style={{
                    backgroundColor: companyInfo.primaryColor || '#3b82f6'
                  }}
                >
                  {loginState.isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Signing in...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Lock className="h-4 w-4 mr-2" />
                      Sign in
                    </div>
                  )}
                </Button>
              </form>
            )}

            {loginStep === 'twofactor' && (
              <div className="space-y-6">
                <div className="text-center">
                  <Shield className="mx-auto h-12 w-12 text-blue-600" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    Two-Factor Authentication
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Enter your verification code to continue
                  </p>
                </div>

                {twoFactorState.error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{twoFactorState.error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-center">
                  {twoFactorState.timeRemaining > 0 && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-1" />
                      Code expires in {formatTimeRemaining(twoFactorState.timeRemaining)}
                    </div>
                  )}
                </div>

                <Tabs value={twoFactorState.method} onValueChange={(value) => setTwoFactorState(prev => ({ ...prev, method: value as 'totp' | 'sms' }))}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="totp" className="flex items-center">
                      <Key className="h-4 w-4 mr-2" />
                      Authenticator App
                    </TabsTrigger>
                    <TabsTrigger value="sms" className="flex items-center">
                      <Smartphone className="h-4 w-4 mr-2" />
                      SMS Code
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="totp" className="space-y-4">
                    {twoFactorState.qrCode && (
                      <div className="flex flex-col items-center space-y-4">
                        <p className="text-sm text-gray-600 text-center">
                          Scan this QR code with your authenticator app
                        </p>
                        <div className="bg-white p-4 rounded-lg border">
                          <img src={twoFactorState.qrCode} alt="QR Code" className="w-48 h-48" />
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="totp-code">Verification Code</Label>
                        <Input
                          id="totp-code"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          placeholder="000000"
                          value={twoFactorState.code}
                          onChange={(e) => setTwoFactorState(prev => ({ ...prev, code: e.target.value }))}
                          className="mt-1 text-center text-lg"
                          autoFocus
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={twoFactorState.isLoading || twoFactorState.code.length !== 6}
                      >
                        {twoFactorState.isLoading ? (
                          'Verifying...'
                        ) : (
                          'Verify Code'
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="sms" className="space-y-4">
                    {!twoFactorState.phoneNumber ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="phone-number">Phone Number</Label>
                          <Input
                            id="phone-number"
                            type="tel"
                            placeholder="+7 (999) 123-45-67"
                            value={twoFactorState.phoneNumber}
                            onChange={(e) => setTwoFactorState(prev => ({ ...prev, phoneNumber: e.target.value }))}
                            className="mt-1"
                          />
                        </div>

                        <Button
                          onClick={handleSmsRequest}
                          className="w-full"
                          disabled={twoFactorState.isLoading || !twoFactorState.phoneNumber}
                        >
                          {twoFactorState.isLoading ? (
                            'Sending...'
                          ) : (
                            <>
                              <Smartphone className="h-4 w-4 mr-2" />
                              Send SMS Code
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="sms-code">SMS Verification Code</Label>
                          <Input
                            id="sms-code"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            placeholder="000000"
                            value={twoFactorState.code}
                            onChange={(e) => setTwoFactorState(prev => ({ ...prev, code: e.target.value }))}
                            className="mt-1 text-center text-lg"
                            autoFocus
                          />
                        </div>

                        <div className="text-center">
                          <button
                            type="button"
                            className="text-sm text-blue-600 hover:text-blue-500"
                            onClick={() => handleSmsRequest()}
                            disabled={twoFactorState.isLoading}
                          >
                            Resend SMS code
                          </button>
                        </div>

                        <Button
                          type="submit"
                          className="w-full"
                          disabled={twoFactorState.isLoading || twoFactorState.code.length !== 6}
                        >
                          {twoFactorState.isLoading ? (
                            'Verifying...'
                          ) : (
                            'Verify SMS Code'
                          )}
                        </Button>
                      </form>
                    )}
                  </TabsContent>
                </Tabs>

                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-gray-600 hover:text-gray-900"
                    onClick={() => {
                      setLoginStep('credentials');
                      setTwoFactorState(prev => ({ ...prev, attempts: 0 }));
                    }}
                  >
                    Back to login
                  </button>
                </div>
              </div>
            )}

            {loginStep === 'setup' && (
              <div className="space-y-6">
                <div className="text-center">
                  <Shield className="mx-auto h-12 w-12 text-yellow-600" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    Setup Two-Factor Authentication
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Your account requires 2FA setup for security
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <Shield className="h-5 w-5 text-blue-400" />
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        Two-factor authentication adds an extra layer of security to your account.
                        You'll need to enter a verification code from your authenticator app.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4">
                      Scan this QR code with your authenticator app
                    </p>
                    <div className="bg-white p-4 rounded-lg border inline-block">
                      <img src={twoFactorState.qrCode} alt="QR Code" className="w-48 h-48" />
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      After scanning, enter the verification code below
                    </p>
                  </div>

                  <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="setup-code">Verification Code</Label>
                      <Input
                        id="setup-code"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="000000"
                        value={twoFactorState.code}
                        onChange={(e) => setTwoFactorState(prev => ({ ...prev, code: e.target.value }))}
                        className="mt-1 text-center text-lg"
                        autoFocus
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={twoFactorState.isLoading || twoFactorState.code.length !== 6}
                    >
                      {twoFactorState.isLoading ? (
                        'Setting up...'
                      ) : (
                        'Complete Setup'
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            This portal is secured with enterprise-grade encryption and authentication.
          </p>
        </div>
      </div>
    </div>
  );
}