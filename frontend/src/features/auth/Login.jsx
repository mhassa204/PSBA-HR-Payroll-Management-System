import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "./authStore";
import { LoginForm } from "../../components/login-form";
export default function Login() {
 

  return (
    <div className="bg-muted flex min-h-svh w-[100vw] flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-xl md:max-w-5xl">
        <LoginForm />
      </div>
    </div>
  );
}
