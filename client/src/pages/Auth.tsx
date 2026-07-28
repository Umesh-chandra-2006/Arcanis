import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Wand2, Loader2, Mail, Lock, User, AlertCircle, Check } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";

const AVATARS = [
  { id: "ashen", emoji: "🩶", name: "Ashen" },
  { id: "emberveil", emoji: "🔥", name: "Emberveil" },
  { id: "tidecaller", emoji: "💧", name: "Tidecaller" },
  { id: "galeborn", emoji: "💨", name: "Galeborn" },
  { id: "stonewarden", emoji: "🪨", name: "Stonewarden" },
  { id: "voidwalker", emoji: "🌑", name: "Voidwalker" },
  { id: "dawnbringer", emoji: "✨", name: "Dawnbringer" },
  { id: "chaosborn", emoji: "⚡", name: "Chaosborn" },
];

export default function Auth() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthContext();
  const [activeTab, setActiveTab] = useState("login");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});

  // Register form state
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("ashen");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerErrors, setRegisterErrors] = useState<{
    email?: string;
    username?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // tRPC mutations
  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // Client-side validations
  const validateLogin = () => {
    const errors: typeof loginErrors = {};
    if (!loginEmail) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(loginEmail)) {
      errors.email = "Please enter a valid email address";
    }
    if (!loginPassword) {
      errors.password = "Password is required";
    }
    setLoginErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateRegister = () => {
    const errors: typeof registerErrors = {};
    if (!registerEmail) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(registerEmail)) {
      errors.email = "Please enter a valid email address";
    }

    if (!registerUsername) {
      errors.username = "Username is required";
    } else if (registerUsername.length < 3) {
      errors.username = "Username must be at least 3 characters";
    } else if (registerUsername.length > 30) {
      errors.username = "Username must be under 30 characters";
    }

    if (!registerPassword) {
      errors.password = "Password is required";
    } else if (registerPassword.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (registerPassword !== registerConfirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setRegisterErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;

    setLoginLoading(true);
    try {
      const result = await loginMutation.mutateAsync({
        email: loginEmail,
        password: loginPassword,
      });

      login(result.token, result.user);
      toast.success("Welcome back, Mage!");
      navigate("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      toast.error(message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRegister()) return;

    setRegisterLoading(true);
    try {
      const result = await registerMutation.mutateAsync({
        email: registerEmail,
        username: registerUsername,
        password: registerPassword,
        avatar: selectedAvatar as any,
      });

      login(result.token, result.user);
      toast.success("Account created! Welcome to Arcanis.");
      navigate("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed";
      toast.error(message);
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white flex items-center justify-center p-4 relative overflow-hidden">
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="inline-block mb-3"
          >
            <div className="p-3 bg-purple-500/10 rounded-full border border-purple-500/30 shadow-lg shadow-purple-500/10">
              <Wand2 className="h-10 w-10 text-purple-400" />
            </div>
          </motion.div>
          <h1 className="text-5xl font-extrabold tracking-wider bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-sm">
            ARCANIS
          </h1>
          <p className="text-gray-400 mt-2 text-sm font-medium tracking-wide">Enter the realm of competitive magic</p>
        </div>

        {/* Auth Card */}
        <Card className="bg-slate-900/60 border-purple-500/20 backdrop-blur-md shadow-2xl shadow-purple-950/20">
          <Tabs value={activeTab} onValueChange={(val) => {
            setActiveTab(val);
            setLoginErrors({});
            setRegisterErrors({});
          }} className="w-full">
            <TabsList className="grid w-[calc(100%-2rem)] grid-cols-2 bg-slate-950/50 m-4 p-1 rounded-lg border border-purple-500/10">
              <TabsTrigger
                value="login"
                className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 rounded-md transition-all py-2"
              >
                Login
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 rounded-md transition-all py-2"
              >
                Register
              </TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <CardContent className="space-y-4 pt-2">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-gray-300 text-sm font-semibold">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginEmail}
                        onChange={(e) => {
                          setLoginEmail(e.target.value);
                          if (loginErrors.email) setLoginErrors((prev) => ({ ...prev, email: undefined }));
                        }}
                        className={`bg-slate-950/50 border-purple-500/20 text-white placeholder:text-gray-600 pl-10 focus-visible:ring-purple-500 ${
                          loginErrors.email ? "border-red-500/50 focus-visible:ring-red-500" : ""
                        }`}
                        required
                      />
                    </div>
                    {loginErrors.email && (
                      <p className="text-red-400 text-xs flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" /> {loginErrors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-gray-300 text-sm font-semibold">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          if (loginErrors.password) setLoginErrors((prev) => ({ ...prev, password: undefined }));
                        }}
                        className={`bg-slate-950/50 border-purple-500/20 text-white placeholder:text-gray-600 pl-10 focus-visible:ring-purple-500 ${
                          loginErrors.password ? "border-red-500/50 focus-visible:ring-red-500" : ""
                        }`}
                        required
                      />
                    </div>
                    {loginErrors.password && (
                      <p className="text-red-400 text-xs flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" /> {loginErrors.password}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-semibold py-2.5 transition-all shadow-lg shadow-purple-500/10"
                  >
                    {loginLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Channeling login...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register">
              <CardContent className="space-y-4 pt-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-gray-300 text-sm font-semibold">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="mage@arcanis.com"
                        value={registerEmail}
                        onChange={(e) => {
                          setRegisterEmail(e.target.value);
                          if (registerErrors.email) setRegisterErrors((prev) => ({ ...prev, email: undefined }));
                        }}
                        className={`bg-slate-950/50 border-purple-500/20 text-white placeholder:text-gray-600 pl-10 focus-visible:ring-purple-500 ${
                          registerErrors.email ? "border-red-500/50 focus-visible:ring-red-500" : ""
                        }`}
                        required
                      />
                    </div>
                    {registerErrors.email && (
                      <p className="text-red-400 text-xs flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" /> {registerErrors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-username" className="text-gray-300 text-sm font-semibold">
                      Mage Nickname
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                      <Input
                        id="register-username"
                        type="text"
                        placeholder="Albus_13"
                        value={registerUsername}
                        onChange={(e) => {
                          setRegisterUsername(e.target.value);
                          if (registerErrors.username) setRegisterErrors((prev) => ({ ...prev, username: undefined }));
                        }}
                        className={`bg-slate-950/50 border-purple-500/20 text-white placeholder:text-gray-600 pl-10 focus-visible:ring-purple-500 ${
                          registerErrors.username ? "border-red-500/50 focus-visible:ring-red-500" : ""
                        }`}
                        required
                      />
                    </div>
                    {registerErrors.username && (
                      <p className="text-red-400 text-xs flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" /> {registerErrors.username}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-gray-300 text-sm font-semibold">
                      Password (min 8 chars)
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerPassword}
                        onChange={(e) => {
                          setRegisterPassword(e.target.value);
                          if (registerErrors.password) setRegisterErrors((prev) => ({ ...prev, password: undefined }));
                        }}
                        className={`bg-slate-950/50 border-purple-500/20 text-white placeholder:text-gray-600 pl-10 focus-visible:ring-purple-500 ${
                          registerErrors.password ? "border-red-500/50 focus-visible:ring-red-500" : ""
                        }`}
                        required
                      />
                    </div>
                    {registerErrors.password && (
                      <p className="text-red-400 text-xs flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" /> {registerErrors.password}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm" className="text-gray-300 text-sm font-semibold">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                      <Input
                        id="register-confirm"
                        type="password"
                        placeholder="••••••••"
                        value={registerConfirmPassword}
                        onChange={(e) => {
                          setRegisterConfirmPassword(e.target.value);
                          if (registerErrors.confirmPassword) setRegisterErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                        }}
                        className={`bg-slate-950/50 border-purple-500/20 text-white placeholder:text-gray-600 pl-10 focus-visible:ring-purple-500 ${
                          registerErrors.confirmPassword ? "border-red-500/50 focus-visible:ring-red-500" : ""
                        }`}
                        required
                      />
                    </div>
                    {registerErrors.confirmPassword && (
                      <p className="text-red-400 text-xs flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" /> {registerErrors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {/* Avatar Selection */}
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm font-semibold block mb-2">Choose Avatar Affinity</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {AVATARS.map((avatar) => (
                        <motion.button
                          key={avatar.id}
                          type="button"
                          onClick={() => setSelectedAvatar(avatar.id)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                            selectedAvatar === avatar.id
                              ? "border-purple-400 bg-purple-500/20 shadow-lg shadow-purple-500/5"
                              : "border-purple-500/10 bg-slate-950/40 hover:border-purple-500/30"
                          }`}
                        >
                          <span className="text-2xl mb-1">{avatar.emoji}</span>
                          <span className="text-[10px] text-gray-400 font-medium truncate w-full text-center">
                            {avatar.name}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={registerLoading}
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-semibold py-2.5 transition-all shadow-lg shadow-purple-500/10 mt-4"
                  >
                    {registerLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating spellbook...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-4 tracking-wide font-medium">
          By joining ARCANIS, you agree to our terms of service and rules of the Tower.
        </p>
      </motion.div>
    </div>
  );
}
