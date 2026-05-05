import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  User, Camera, Shield, Mail,
  MapPin, Hash, Sparkles, Trophy,
  Save, LogOut, CheckCircle2, BadgeCheck,
  Zap, Github, Linkedin, Twitter, Plus, X,
  Loader2, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Meu Perfil — FortSecure" }] }),
  component: () => <AppShell><ProfilePage /></AppShell>,
});

function ProfilePage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("perfil");
  
  const [realRank, setRealRank] = useState<number | string>("--");
  const [realXP, setRealXP] = useState<number>(0);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [badges, setBadges] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin) {
      toast.error("Administradores não possuem perfil de agente.");
      navigate({ to: "/dashboard" });
      return;
    }
  }, [isAdmin]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const [profRes, rankRes, badgesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.rpc('get_ranking'),
        supabase.from("badges").select("*").eq("user_id", user.id)
      ]);

      if (profRes.data) {
        const data = profRes.data;
        setProfile(data);
        setName(data.full_name || "");
        setBio(data.bio || "");
        setTags(data.tags || ["Cybersecurity", "Closer", "XDR Specialist"]);
        setAvatarUrl(data.avatar_url);
      }

      if (rankRes.data) {
        const ranking = rankRes.data as any[];
        const myIndex = ranking.findIndex(r => r.user_id === user.id);
        const myData = ranking[myIndex];
        if (myIndex !== -1) {
          setRealRank(`#${(myIndex + 1).toString().padStart(2, '0')}`);
          setRealXP(Math.floor((myData.closed_value || 0) / 10));
        }
      }
      setBadges(badgesRes.data ?? []);
      setLoading(false);
    }
    load();
  }, [user]);

  async function handleAvatarClick() { fileInputRef.current?.click(); }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq('id', user.id);
      if (updateError) throw updateError;
      setAvatarUrl(publicUrl);
      toast.success("Foto atualizada!");
    } catch (error: any) { toast.error(error.message || "Erro no upload"); } finally { setUploading(false); }
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: name, bio: bio, tags: tags }).eq("id", user!.id);
    if (error) toast.error(error.message); else toast.success("Perfil atualizado");
    setSaving(false);
  }

  const addTag = () => { if (newTag && !tags.includes(newTag)) { setTags([...tags, newTag]); setNewTag(""); } };
  const removeTag = (t: string) => { setTags(tags.filter(tag => tag !== t)); };

  if (loading) return (
    <div className="h-[80vh] flex flex-col items-center justify-center space-y-6">
      <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
      <span className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.4em]">Sincronizando Identidade...</span>
    </div>
  );

  return (
    <div className="p-8 md:p-12 max-w-[1400px] mx-auto min-h-screen space-y-10 pb-20">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

      {/* Hero Section */}
      <Card className="bg-card/50 backdrop-blur-md rounded-[40px] border-border overflow-hidden shadow-2xl">
        <div className="h-48 bg-secondary/50 border-b border-border relative">
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80" />
        </div>
        <div className="px-10 pb-10 flex flex-col md:flex-row items-center md:items-end gap-10 -mt-16 relative z-10">
          <div className="relative cursor-pointer group" onClick={handleAvatarClick}>
            <Avatar className="h-40 w-40 rounded-3xl border-[6px] border-background shadow-2xl overflow-hidden transition-transform group-hover:scale-[1.02]">
              <AvatarImage src={avatarUrl || undefined} className="object-cover" />
              <AvatarFallback className="bg-secondary">
                <User className="h-16 w-16 text-muted-foreground/30" />
              </AvatarFallback>
              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm">
                <Camera className="h-8 w-8 text-foreground mb-2" />
                <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">Atualizar Foto</span>
              </div>
              {uploading && <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-md"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>}
            </Avatar>
            <div className="absolute bottom-3 right-3 h-5 w-5 rounded-full bg-emerald-500 border-4 border-background shadow-lg" />
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">{name || "Novo Agente"}</h1>
              <BadgeCheck className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30">
               <Badge variant="outline" className="px-3 py-1.5 rounded-xl bg-secondary border-border text-primary">
                 <Shield className="h-3.5 w-3.5 mr-2" /> {profile?.role}
               </Badge>
               <Badge variant="outline" className="px-3 py-1.5 rounded-xl bg-secondary border-border text-muted-foreground/30">
                 <MapPin className="h-3.5 w-3.5 mr-2" /> Base de Operações, BR
               </Badge>
            </div>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving || uploading}
            className="px-10 py-7 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/10"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-3" /> : <Save className="h-4 w-4 mr-3" />} Salvar Perfil
          </Button>
        </div>
      </Card>

      <Tabs defaultValue="perfil" onValueChange={setActiveTab} className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-10">
        <div className="space-y-8">
          <TabsList className="flex flex-col h-auto bg-card/50 backdrop-blur-md rounded-3xl border border-border p-2 space-y-1 shadow-xl">
            {["perfil", "conquistas", "segurança", "preferências"].map(tab => (
              <TabsTrigger 
                key={tab} 
                value={tab}
                className={cn(
                  "w-full justify-between px-6 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all group border border-transparent",
                  "data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=active]:border-border data-[state=active]:shadow-inner",
                  "text-muted-foreground/30 hover:text-muted-foreground/50"
                )}
              >
                {tab} <ChevronRight className={cn("h-4 w-4 transition-transform", activeTab === tab ? "opacity-100 translate-x-1 text-primary" : "opacity-30")} />
              </TabsTrigger>
            ))}
          </TabsList>

          <Card className="bg-card/50 backdrop-blur-md rounded-3xl border-border p-8 text-center shadow-xl">
            <CardHeader className="p-0 mb-8">
              <CardTitle className="text-[10px] text-muted-foreground/30 uppercase font-bold tracking-[0.3em]">ScoreCard do Agente</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex items-center justify-around gap-4">
                 <div>
                    <div className="text-3xl font-black font-mono text-foreground tracking-tighter">{realRank}</div>
                    <div className="text-[10px] text-muted-foreground/20 font-bold uppercase mt-2 tracking-widest">Ranking</div>
                 </div>
                 <Separator orientation="vertical" className="h-10 bg-border" />
                 <div>
                    <div className="text-3xl font-black font-mono text-primary tracking-tighter">{realXP}</div>
                    <div className="text-[10px] text-muted-foreground/20 font-bold uppercase mt-2 tracking-widest">XP Total</div>
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <TabsContent value="perfil" className="m-0 focus-visible:ring-0">
            <Card className="bg-card/50 backdrop-blur-md rounded-3xl border-border p-10 shadow-xl">
              <CardContent className="p-0 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Identificação Completa</Label>
                    <Input value={name} onChange={e => setName(e.target.value)}
                      className="h-14 bg-secondary/50 border-border rounded-xl px-5 text-sm text-foreground focus:ring-1 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/20" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Comunicação Criptografada</Label>
                    <Input value={user?.email} readOnly className="h-14 bg-background border-border rounded-xl px-5 text-sm text-muted-foreground/30 outline-none cursor-not-allowed font-mono" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Bio Estratégica / Especialidades</Label>
                  <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={5} placeholder="Descreva sua atuação no ecossistema..."
                    className="bg-secondary/50 border-border rounded-xl p-5 text-sm text-foreground focus:ring-1 focus:ring-primary/50 outline-none resize-none transition-all placeholder:text-muted-foreground/20 leading-relaxed" />
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Core Capabilities</Label>
                  <div className="flex flex-wrap gap-3">
                    {tags.map(t => (
                      <Badge key={t} variant="outline" className="px-4 py-2 rounded-xl bg-secondary border-border text-muted-foreground text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 group/tag hover:border-primary/50 transition-all">
                        {t} <X onClick={() => removeTag(t)} className="h-3.5 w-3.5 cursor-pointer text-muted-foreground/20 hover:text-destructive transition-colors" />
                      </Badge>
                    ))}
                    <div className="flex items-center gap-3 bg-secondary/50 rounded-xl border border-border px-4 focus-within:border-border/60 transition-all group/input">
                      <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyPress={e => e.key === 'Enter' && addTag()} placeholder="NOVA TAG..."
                        className="bg-transparent h-11 w-28 text-[10px] font-bold uppercase outline-none text-foreground placeholder:text-muted-foreground/20 tracking-widest" />
                      <Plus onClick={addTag} className="h-4 w-4 text-muted-foreground/20 group-focus-within/input:text-primary cursor-pointer hover:scale-110 transition-all" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conquistas" className="m-0 focus-visible:ring-0">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {badges.map(b => (
                <Card key={b.id} className="bg-card/50 backdrop-blur-md rounded-3xl p-8 border-border flex flex-col items-center text-center hover:border-primary/30 transition-all group shadow-lg overflow-hidden">
                  <div className="text-5xl mb-6 group-hover:scale-110 transition-transform">{b.icon || "🏅"}</div>
                  <div className="text-sm font-bold text-foreground mb-2 tracking-tight group-hover:text-primary transition-colors">{b.title}</div>
                  <div className="text-[10px] text-muted-foreground/30 font-bold uppercase tracking-widest leading-relaxed">{b.description}</div>
                </Card>
              ))}
              {badges.length === 0 && <div className="col-span-full py-32 text-center border border-dashed border-border rounded-[40px] text-muted-foreground/20 text-[10px] font-bold uppercase tracking-[0.4em]">Zero Conquistas Detectadas</div>}
            </div>
          </TabsContent>

          <TabsContent value="segurança" className="m-0 focus-visible:ring-0">
            <Card className="bg-card/50 backdrop-blur-md rounded-3xl border-border p-10 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-500">
              <CardHeader className="p-0 mb-8">
                <CardTitle className="text-sm font-bold flex items-center gap-3 text-foreground uppercase tracking-widest"><Shield className="h-5 w-5 text-primary" /> Credenciais de Acesso</CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-8">
                <div className="space-y-6 max-w-md">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Nova Senha de Acesso</Label>
                    <Input type="password" placeholder="Mínimo 12 caracteres" className="h-14 bg-secondary/50 border-border rounded-xl px-5 text-sm outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/20" />
                  </div>
                  <Button variant="outline" className="w-full py-7 rounded-xl bg-secondary border-border text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-foreground hover:text-background transition-all shadow-sm">Atualizar Senha</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferências" className="m-0 focus-visible:ring-0">
            <Card className="bg-card/50 backdrop-blur-md rounded-3xl border-border p-10 space-y-4 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-500">
              <CardContent className="p-0 space-y-4">
                <div className="flex items-center justify-between p-6 rounded-2xl bg-secondary/50 border border-border group hover:border-border transition-all">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-foreground/80 group-hover:text-foreground transition-colors">Notificações em Tempo Real</div>
                  <div className="h-6 w-12 rounded-full bg-primary/10 border border-primary/30 relative cursor-pointer"><div className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-primary shadow-[0_0_8px_rgba(16,185,129,0.5)]" /></div>
                </div>
                <div className="flex items-center justify-between p-6 rounded-2xl bg-secondary/50 border border-border group hover:border-border transition-all">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-foreground/80 group-hover:text-foreground transition-colors">Modo de Alta Performance</div>
                  <div className="h-6 w-12 rounded-full bg-background border border-border relative cursor-pointer"><div className="absolute top-1 left-1 h-3.5 w-3.5 rounded-full bg-muted-foreground/30" /></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
