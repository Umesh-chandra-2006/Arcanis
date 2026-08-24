import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, AlertCircle } from "lucide-react";
import { Panel } from "@/components/game/panel";

import { ElementIcon } from "@/components/game/element-icon";

const AVATARS = [
  { id: "ashen", element: "Arcane", name: "Ashen" },
  { id: "emberveil", element: "Fire", name: "Emberveil" },
  { id: "tidecaller", element: "Water", name: "Tidecaller" },
  { id: "galeborn", element: "Wind", name: "Galeborn" },
  { id: "stonewarden", element: "Earth", name: "Stonewarden" },
  { id: "voidwalker", element: "Void", name: "Voidwalker" },
  { id: "dawnbringer", element: "Light", name: "Dawnbringer" },
  { id: "chaosborn", element: "Chaos", name: "Chaosborn" },
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
      toast.success("Welcome back, Practitioner!");
      navigate("/dashboard");
    } catch (error: any) {
      const message = error?.message || "Login failed";
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
      toast.success("Mage profile forged! Welcome to Arcanis.");
      navigate("/dashboard");
    } catch (error: any) {
      const message = error?.message || "Registration failed";
      toast.error(message);
      if (message.toLowerCase().includes("email")) {
        setRegisterErrors((prev) => ({ ...prev, email: message }));
      } else if (message.toLowerCase().includes("username")) {
        setRegisterErrors((prev) => ({ ...prev, username: message }));
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        {/* Header */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-primary/40 font-serif text-2xl font-bold text-primary bg-card shadow-md mb-1">
            A
          </div>
          <h1 className="font-serif text-3xl font-semibold tracking-[0.2em] text-foreground">
            ARCANIS
          </h1>
          <p className="text-muted-foreground text-xs font-serif italic">Enter the realm of competitive magic</p>
        </div>

        {/* Auth Panel */}
        <Panel gold className="shadow-2xl">
          <Tabs value={activeTab} onValueChange={(val) => {
            setActiveTab(val);
            setLoginErrors({});
            setRegisterErrors({});
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-secondary p-1 rounded-md border border-border mb-4">
              <TabsTrigger
                value="login"
                className="data-[state=active]:bg-card data-[state=active]:text-primary rounded-sm transition-all py-1.5 text-xs uppercase tracking-wider font-semibold"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="data-[state=active]:bg-card data-[state=active]:text-primary rounded-sm transition-all py-1.5 text-xs uppercase tracking-wider font-semibold"
              >
                Forge Account
              </TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <CardContent className="space-y-4 p-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-xs uppercase tracking-wider text-muted-foreground">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="mage@arcanis.com"
                        value={loginEmail}
                        onChange={(e) => {
                          setLoginEmail(e.target.value);
                          if (loginErrors.email) setLoginErrors((prev) => ({ ...prev, email: undefined }));
                        }}
                        className={`bg-background border-border text-foreground pl-10 focus:ring-primary ${
                          loginErrors.email ? "border-destructive focus:ring-destructive" : ""
                        }`}
                        required
                      />
                    </div>
                    {loginErrors.email && (
                      <p className="text-destructive text-xs flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" /> {loginErrors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="login-password" className="text-xs uppercase tracking-wider text-muted-foreground">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          if (loginErrors.password) setLoginErrors((prev) => ({ ...prev, password: undefined }));
                        }}
                        className={`bg-background border-border text-foreground pl-10 focus:ring-primary ${
                          loginErrors.password ? "border-destructive focus:ring-destructive" : ""
                        }`}
                        required
                      />
                    </div>
                    {loginErrors.password && (
                      <p className="text-destructive text-xs flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" /> {loginErrors.password}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2.5 transition-all shadow-md"
                  >
                    {loginLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Unsealing...
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
              <CardContent className="space-y-4 p-0 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="register-email" className="text-xs uppercase tracking-wider text-muted-foreground">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="mage@arcanis.com"
                        value={registerEmail}
                        onChange={(e) => {
                          setRegisterEmail(e.target.value);
                          if (registerErrors.email) setRegisterErrors((prev) => ({ ...prev, email: undefined }));
                        }}
                        className={`bg-background border-border text-foreground pl-10 focus:ring-primary ${
                          registerErrors.email ? "border-destructive focus:ring-destructive" : ""
                        }`}
                        required
                      />
                    </div>
                    {registerErrors.email && (
                      <p className="text-destructive text-xs flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" /> {registerErrors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="register-username" className="text-xs uppercase tracking-wider text-muted-foreground">
                      Mage Title / Nickname
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-username"
                        type="text"
                        placeholder="Veyra_Solmire"
                        value={registerUsername}
                        onChange={(e) => {
                          setRegisterUsername(e.target.value);
                          if (registerErrors.username) setRegisterErrors((prev) => ({ ...prev, username: undefined }));
                        }}
                        className={`bg-background border-border text-foreground pl-10 focus:ring-primary ${
                          registerErrors.username ? "border-destructive focus:ring-destructive" : ""
                        }`}
                        required
                      />
                    </div>
                    {registerErrors.username && (
                      <p className="text-destructive text-xs flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" /> {registerErrors.username}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="register-password" className="text-xs uppercase tracking-wider text-muted-foreground">
                      Password (min 8 characters)
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerPassword}
                        onChange={(e) => {
                          setRegisterPassword(e.target.value);
                          if (registerErrors.password) setRegisterErrors((prev) => ({ ...prev, password: undefined }));
                        }}
                        className={`bg-background border-border text-foreground pl-10 focus:ring-primary ${
                          registerErrors.password ? "border-destructive focus:ring-destructive" : ""
                        }`}
                        required
                      />
                    </div>
                    {registerErrors.password && (
                      <p className="text-destructive text-xs flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" /> {registerErrors.password}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="register-confirm" className="text-xs uppercase tracking-wider text-muted-foreground">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-confirm"
                        type="password"
                        placeholder="••••••••"
                        value={registerConfirmPassword}
                        onChange={(e) => {
                          setRegisterConfirmPassword(e.target.value);
                          if (registerErrors.confirmPassword) setRegisterErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                        }}
                        className={`bg-background border-border text-foreground pl-10 focus:ring-primary ${
                          registerErrors.confirmPassword ? "border-destructive focus:ring-destructive" : ""
                        }`}
                        required
                      />
                    </div>
                    {registerErrors.confirmPassword && (
                      <p className="text-destructive text-xs flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" /> {registerErrors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {/* Avatar Affinity Selection */}
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1.5">Elemental Affinity</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {AVATARS.map((avatar) => (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => setSelectedAvatar(avatar.id)}
                          className={`p-2 rounded-md border flex flex-col items-center justify-center transition-all ${
                            selectedAvatar === avatar.id
                              ? "border-primary bg-primary/20 text-primary shadow-sm"
                              : "border-border bg-background hover:border-border/80 text-muted-foreground"
                          }`}
                        >
                          <ElementIcon element={avatar.element} size={20} className="mb-1" />
                          <span className="text-[10px] truncate w-full text-center font-medium">
                            {avatar.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={registerLoading}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2.5 transition-all shadow-md mt-2"
                  >
                    {registerLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Forging Profile...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Panel>

        <p className="text-center text-muted-foreground text-xs mt-4 font-serif italic">
          By entering ARCANIS, you agree to the Codex of the Tower.
        </p>
      </motion.div>
    </div>
  );
}
