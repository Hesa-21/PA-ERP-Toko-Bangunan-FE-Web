"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AuthFooter } from "@/app/auth/sign-in/_components/auth-footer"
import { AuthHeader } from "@/app/auth/sign-in/_components/auth-header"
import { SignInCard } from "@/app/auth/sign-in/_components/sign-in-card"
import { useSignIn } from "@/app/auth/sign-in/_hooks/use-sign-in"

export default function SignInClientPage() {
  const {
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
  } = useSignIn()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <AuthHeader />

      <AlertDialog
        open={Boolean(signInError)}
        onOpenChange={(open) => {
          if (!open) dismissSignInError()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gagal masuk</AlertDialogTitle>
            <AlertDialogDescription>{signInError || "Email atau kata sandi salah."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="container mx-auto px-4 pt-16 py-12">
        <SignInCard
          email={email}
          password={password}
          emailError={emailError}
          passwordError={passwordError}
          showPassword={showPassword}
          isLoading={isLoading}
          onEmailChange={handleEmailChange}
          onPasswordChange={handlePasswordChange}
          onToggleShowPassword={toggleShowPassword}
          onSubmit={handleSubmit}
        />

        <AuthFooter />
      </div>
    </div>
  )
}
