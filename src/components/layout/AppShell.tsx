import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "./Sidebar";
import { Loader2, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BackgroundEffects } from "@/components/layout/BackgroundEffects";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  // Presentation Mode Listener & Keyboard Shortcuts
  useEffect(() => {
    const handleToggle = () => setIsSidebarOpen(prev => !prev);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSidebarOpen) {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener("toggle-sidebar", handleToggle);
    window.addEventListener("keydown", handleKeyDown);
    
    return () => {
      window.removeEventListener("toggle-sidebar", handleToggle);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSidebarOpen]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden relative bg-background">
      <BackgroundEffects />
      
      {/* Sidebar Container */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.div
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="h-full z-50 shrink-0"
          >
            <Sidebar />
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 relative z-10 flex flex-col h-full overflow-y-auto">
        {/* Floating Edge Toggle Button */}
        <div className="absolute top-1/2 -translate-y-1/2 left-4 z-50">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="h-14 w-8 rounded-full bg-card/60 backdrop-blur-xl border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-card transition-all shadow-lg shadow-black/5 group flex items-center justify-center"
          >
            {isSidebarOpen ? (
               <PanelLeftClose className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> 
            ) : (
               <PanelLeftOpen className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            )}
          </Button>
        </div>

        <div className="relative z-10 w-full min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
