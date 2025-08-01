import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "../features/auth/authStore"; // Adjust path
import LoginImage from "../assets/login image.jpg"; // or use import.meta.url if using Vite

export function LoginForm({ className, ...props }) {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ email, password });
      // You can redirect here (e.g., to dashboard)
      // navigate("/dashboard") or use Next.js router.push("/dashboard")
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="min-h-[600px] flex flex-col justify-center">
        <CardContent className="grid p-0 md:grid-cols-2 h-full">
          {/* LEFT SIDE - FORM */}
          <form onSubmit={handleSubmit} className="p-6 md:p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-muted-foreground text-balance">
                  Login to your Acme Inc account
                </p>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center -mt-2">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
            </div>
          </form>

          {/* RIGHT SIDE - IMAGE */}
          <div className="bg-muted relative hidden md:block">
            <img
              src={LoginImage}
              alt="Login"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
            <div className="absolute inset-0" />
          </div>
        </CardContent>
      </Card>

      {/* Optional Footer */}
      {/* <div className="text-muted-foreground text-center text-xs">
        By clicking login, you agree to our{" "}
        <a href="#" className="underline hover:text-primary">
          Terms
        </a>{" "}
        and{" "}
        <a href="#" className="underline hover:text-primary">
          Privacy Policy
        </a>.
      </div> */}
    </div>
  );
}
