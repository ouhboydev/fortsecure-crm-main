import { useEffect, useState } from "react";
import { getGoToMeetings } from "@/server/goto";
import { toast } from "sonner";
import { Loader2, Phone, Calendar as CalendarIcon, Clock, Users, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GoToMeeting {
  meetingKey: number;
  subject: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes typically, or we can calculate from start/end
  meetingType: string;
}

export function GoToMeetingsList() {
  const [meetings, setMeetings] = useState<GoToMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMeetings() {
      try {
        setLoading(true);
        setError(null);
        
        // Chamada via TanStack Start Server Function
        const data = await getGoToMeetings();

        if (data && data.error) {
           throw new Error(data.error);
        }

        // O GoTo pode retornar um array de reuniões diretamente no 'data'
        setMeetings(Array.isArray(data) ? data : data?.meetings || []);
      } catch (err: any) {
        console.error("Erro ao buscar reuniões do GoTo:", err);
        setError(err.message || "Erro desconhecido ao comunicar com a API do GoTo");
        toast.error("Falha ao carregar o histórico de chamadas do GoTo");
      } finally {
        setLoading(false);
      }
    }

    fetchMeetings();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-lg shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-[#3ecf8e] mb-4" />
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Sincronizando com GoTo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-lg shadow-sm">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <Phone className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm font-semibold text-foreground mb-2">Erro de Integração</p>
        <p className="text-xs text-muted-foreground max-w-md text-center">{error}</p>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-lg shadow-sm">
        <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-4">
          <HistoryIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Nenhuma chamada recente encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {meetings.map((meeting) => {
        const startDate = new Date(meeting.startTime);
        const endDate = new Date(meeting.endTime);
        const durationMinutes = meeting.duration || Math.round((endDate.getTime() - startDate.getTime()) / 60000);

        return (
          <div 
            key={meeting.meetingKey}
            className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-card border border-border rounded-lg hover:border-[#3ecf8e]/50 cursor-default transition-all shadow-sm gap-4"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 bg-[#3ecf8e]/10 text-[#3ecf8e]">
                <Phone className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-semibold truncate group-hover:text-[#3ecf8e] transition-colors">
                  {meeting.subject || "Reunião GoTo"}
                </h4>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <CalendarIcon className="h-3 w-3" />
                    {format(startDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  </span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {format(startDate, "HH:mm")}
                  </span>
                  <span className="text-[11px] text-[#3ecf8e] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    {durationMinutes} min
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
              <Badge variant="outline" className="text-[10px] border-border bg-muted/50 uppercase tracking-wider">
                Id: {meeting.meetingKey}
              </Badge>
              <button className="text-xs text-[#3ecf8e] font-medium flex items-center gap-1 hover:underline">
                Detalhes <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HistoryIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
