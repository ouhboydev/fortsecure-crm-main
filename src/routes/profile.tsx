import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  User, Camera, Shield, MapPin,
  Save, BadgeCheck, Zap, Plus, X,
  Loader2, ChevronRight
} from "lucide-react";
import { cn, formatDisplayName } from "@/lib/utils";
import { toast } from "sonner";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      toast.error("Administradores não possuem perfil de vendedor.");
      navigate({ to: "/dashboard" });
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
        setTags(data.tags || []);
        setAvatarUrl(data.avatar_url);
      }

      if (rankRes.data) {
        const ranking = rankRes.data as any[];
        const myIndex = ranking.findIndex(r => r.user_id === user.id);
        if (myIndex !== -1) {
          setRealRank(`#${(myIndex + 1).toString().padStart(2, '0')}`);
          setRealXP(Math.floor((ranking[myIndex].closed_value || 0) / 10));
        }
      }
      setBadges(badgesRes.data ?? []);
      setLoading(false);
    }
    load();
  }, [user]);

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
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq('id', user.id);
      setAvatarUrl(publicUrl);
      toast.success("Foto atualizada!");
    } catch (error: any) { toast.error(error.message); } finally { setUploading(false); }
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: formatDisplayName(name), bio, tags }).eq("id", user!.id);
    if (error) toast.error(error.message); else toast.success("Perfil atualizado");
    setSaving(false);
  }

  const addTag = () => { if (newTag && !tags.includes(newTag)) { setTags([...tags, newTag]); setNewTag(""); } };
  const removeTag = (t: string) => { setTags(tags.filter(tag => tag !== t)); };

  if (loading) return (
    <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-[#3ecf8e]" />
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Carregando perfil...</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-[1200px] mx-auto pb-20">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

      {/* Profile Hero */}
      <Card className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="h-32 bg-gradient-to-r from-[#3ecf8e]/10 via-transparent to-[#1eaedb]/5 border-b border-border" />
        <div className="px-8 pb-8 flex flex-col md:flex-row items-center md:items-end gap-6 -mt-12">
          <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
            <Avatar className="h-24 w-24 rounded-xl border-4 border-background shadow-lg overflow-hidden">
              <AvatarImage src={avatarUrl || undefined} className="object-cover" />
              <AvatarFallback className="bg-secondary"><User className="h-10 w-10 text-muted-foreground" /></AvatarFallback>
              <div className="absolute inset-0 bg-background/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                <Camera className="h-5 w-5 text-foreground mb-1" />
                <span className="text-[9px] font-bold text-foreground uppercase">Trocar</span>
              </div>
              {uploading && <div className="absolute inset-0 flex items-center justify-center bg-background/50"><Loader2 className="h-6 w-6 text-[#3ecf8e] animate-spin" /></div>}
            </Avatar>
            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-[#3ecf8e] border-2 border-background" />
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <h1 className="text-xl font-semibold text-foreground">{formatDisplayName(name) || "Vendedor"}</h1>
              <BadgeCheck className="h-5 w-5 text-[#3ecf8e]" />
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <Badge variant="outline" className="text-[10px] bg-secondary border-border text-[#3ecf8e]">
                <Shield className="h-3 w-3 mr-1" /> {profile?.role || "vendedor"}
              </Badge>
              <Badge variant="outline" className="text-[10px] bg-secondary border-border text-muted-foreground">
                <MapPin className="h-3 w-3 mr-1" /> Brasil
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-center px-4 py-2 bg-secondary border border-border rounded-md">
              <div className="text-lg font-bold font-mono text-foreground">{realRank}</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Ranking</div>
            </div>
            <div className="text-center px-4 py-2 bg-[#3ecf8e]/5 border border-[#3ecf8e]/20 rounded-md">
              <div className="text-lg font-bold font-mono text-[#3ecf8e]">{realXP}</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">XP Total</div>
            </div>
            <Button onClick={handleSave} disabled={saving || uploading} className="h-9 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-[#000] font-semibold text-xs rounded-md px-5 shadow-sm">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-2" />}
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="perfil" onValueChange={setActiveTab} className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
        <TabsList className="flex flex-col h-auto bg-card border border-border rounded-lg p-2 gap-1 shadow-sm">
          {["perfil", "conquistas", "segurança", "preferências"].map(tab => (
            <TabsTrigger
              key={tab}
              value={tab}
              className={cn(
                "w-full justify-between px-4 py-2.5 rounded-md text-[11px] font-medium uppercase tracking-wider transition-all",
                "data-[state=active]:bg-accent data-[state=active]:text-foreground",
                "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
              <ChevronRight className={cn("h-3.5 w-3.5 transition-all", activeTab === tab ? "text-[#3ecf8e] translate-x-0.5" : "opacity-30")} />
            </TabsTrigger>
          ))}
        </TabsList>

        <div>
          <TabsContent value="perfil" className="m-0">
            <Card className="bg-card border border-border rounded-lg shadow-sm">
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Nome Completo</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} className="h-9 bg-background border-border text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Email</Label>
                    <Input value={user?.email} readOnly className="h-9 bg-background border-border text-sm text-muted-foreground cursor-not-allowed font-mono" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Bio / Especialidades</Label>
                  <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} placeholder="Descreva sua atuação..."
                    className="bg-background border-border text-sm leading-relaxed resize-none" />
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-medium text-muted-foreground">Tags / Competências</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(t => (
                      <Badge key={t} variant="outline" className="px-3 py-1 bg-secondary border-border text-muted-foreground text-xs flex items-center gap-2">
                        {t}
                        <X onClick={() => removeTag(t)} className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors" />
                      </Badge>
                    ))}
                    <div className="flex items-center gap-2 bg-secondary border border-border rounded-md px-3 h-7">
                      <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="Nova tag..."
                        className="bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground w-24" />
                      <Plus onClick={addTag} className="h-3.5 w-3.5 text-muted-foreground hover:text-[#3ecf8e] cursor-pointer transition-colors" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conquistas" className="m-0">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {badges.map(b => (
                <Card key={b.id} className="bg-card border border-border rounded-lg p-6 flex flex-col items-center text-center hover:border-[#3ecf8e]/30 transition-all group shadow-sm">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{b.icon || "🏅"}</div>
                  <div className="text-sm font-semibold text-foreground mb-1">{b.title}</div>
                  <div className="text-[10px] text-muted-foreground leading-relaxed">{b.description}</div>
                </Card>
              ))}
              {badges.length === 0 && (
                <div className="col-span-full py-20 text-center border border-dashed border-border rounded-lg text-muted-foreground text-xs font-medium uppercase tracking-widest">
                  Nenhuma conquista desbloqueada
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="segurança" className="m-0">
            <Card className="bg-card border border-border rounded-lg shadow-sm">
              <CardHeader className="px-6 py-4 border-b border-border">
                <CardTitle className="text-sm font-medium flex items-center gap-2"><Shield className="h-4 w-4 text-[#3ecf8e]" /> Credenciais de Acesso</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Nova Senha</Label>
                  <Input type="password" placeholder="Mínimo 12 caracteres" className="h-9 bg-background border-border text-sm" />
                </div>
                <Button variant="outline" className="h-9 border-border bg-secondary text-xs font-medium hover:bg-accent transition-all">
                  Atualizar Senha
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferências" className="m-0">
            <Card className="bg-card border border-border rounded-lg shadow-sm">
              <CardContent className="p-6 space-y-3">
                {[
                  { label: "Notificações em Tempo Real", enabled: true },
                  { label: "Modo de Alta Performance", enabled: false },
                ].map(pref => (
                  <div key={pref.label} className="flex items-center justify-between p-4 rounded-md bg-secondary border border-border hover:border-[#3ecf8e]/20 transition-all">
                    <span className="text-sm font-medium text-foreground">{pref.label}</span>
                    <div className={cn("h-5 w-10 rounded-full relative cursor-pointer transition-colors", pref.enabled ? "bg-[#3ecf8e]/20 border border-[#3ecf8e]/30" : "bg-muted border border-border")}>
                      <div className={cn("absolute top-0.5 h-4 w-4 rounded-full transition-all", pref.enabled ? "right-0.5 bg-[#3ecf8e]" : "left-0.5 bg-muted-foreground")} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

