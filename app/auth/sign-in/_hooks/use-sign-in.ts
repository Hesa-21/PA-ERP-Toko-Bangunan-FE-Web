"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { signInRequest } from "@/app/auth/sign-in/_api-clients/auth"
import {
  normalizeSignInEmail,
  validateEmail,
  validatePassword,
} from "@/app/auth/sign-in/_lib/sign-in-utils"

export function useSignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [signInError, setSignInError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const { setUser } = useAuth()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSignInError("")

    const nextEmailError = validateEmail(email)
    const nextPasswordError = validatePassword(password)

    setEmailError(nextEmailError)
    setPasswordError(nextPasswordError)
    if (nextEmailError || nextPasswordError) {
      return
    }

    setIsLoading(true)
    try {
      const { user, redirectTo } = await signInRequest({
        email: normalizeSignInEmail(email),
        password,
      })
      setUser(user)
      router.replace(redirectTo)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat mencoba masuk."
      setSignInError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailChange = (value: string) => {
    setEmail(value)
    if (emailError) setEmailError("")
    if (signInError) setSignInError("")
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    if (passwordError) setPasswordError("")
    if (signInError) setSignInError("")
  }

  const toggleShowPassword = () => setShowPassword((prev) => !prev)

  const dismissSignInError = () => setSignInError("")

  return {
    email,
    password,
    emailError,
    passwordError,
    signInError,
    isLoading,
    showPassword,
    handleSubmit,
    handleEmailChange,
    handlePasswordChange,
    toggleShowPassword,
    dismissSignInError,
  }
}
