"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react"

export type SignInCardProps = {
  email: string
  password: string
  emailError: string
  passwordError: string
  showPassword: boolean
  isLoading: boolean
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onToggleShowPassword: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}

export function SignInCard(props: SignInCardProps) {
  const {
    email,
    password,
    emailError,
    passwordError,
    showPassword,
    isLoading,
    onEmailChange,
    onPasswordChange,
    onToggleShowPassword,
    onSubmit,
  } = props

  return (
    <div className="max-w-md mx-auto">
      <Card className="shadow-xl border-0">
        <CardHeader className="text-center pb-8 pt-8">
          <CardTitle className="text-3xl font-bold text-gray-900">Selamat Datang</CardTitle>
          <CardDescription className="text-gray-600 mt-2">
            Masuk untuk mengakses Dashboard Toko Bangunan
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Alamat Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Masukkan alamat email Anda"
                  className={`pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${
                    emailError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                  }`}
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  required
                  autoComplete="username"
                  aria-invalid={emailError ? "true" : "false"}
                />
                {emailError && (
                  <p className="mt-2 text-sm text-red-600" role="alert">
                    {emailError}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Kata Sandi
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan kata sandi Anda"
                  className={`pl-10 pr-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 ${
                    passwordError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                  }`}
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  required
                  autoComplete="current-password"
                  aria-invalid={passwordError ? "true" : "false"}
                />
                <button
                  type="button"
                  onClick={onToggleShowPassword}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  {passwordError}
                </p>
              )}
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Jika Anda lupa email/kata sandi, silakan hubungi owner untuk bantuan reset.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sedang masuk...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Masuk
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
