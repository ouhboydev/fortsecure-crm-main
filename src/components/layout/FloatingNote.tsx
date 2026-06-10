import { useState, useEffect, useRef } from "react";
import { PenLine, X, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function FloatingNote() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [note, setNote] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("fortsecure_scratchpad");
    if (saved) setNote(saved);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
    localStorage.setItem("fortsecure_scratchpad", e.target.value);
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Note Panel */}
      {isOpen && (
        <div 
          className={cn(
            "bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col transition-all duration-300 ease-in-out",
            isExpanded ? "w-[400px] h-[500px]" : "w-[300px] h-[340px]"
          )}
        >
          <div className="h-10 bg-secondary/30 border-b border-border flex items-center justify-between px-3 shrink-0 cursor-default">
            <div className="flex items-center gap-2 text-muted-foreground">
              <PenLine className="h-3.5 w-3.5" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">Rascunho Rápido</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground">
                {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 p-0">
            <textarea
              ref={textareaRef}
              value={note}
              onChange={handleChange}
              placeholder="Cole números, recados rápidos ou links. O texto é salvo automaticamente no seu navegador."
              className="w-full h-full p-4 bg-transparent resize-none focus:outline-none text-xs text-foreground placeholder:text-muted-foreground leading-relaxed"
              spellCheck="false"
            />
          </div>
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={toggleOpen}
        className={cn(
          "h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 ring-offset-2 ring-background",
          isOpen ? "bg-secondary text-foreground border border-border" : "bg-[#3ecf8e] text-black"
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <PenLine className="h-6 w-6" />}
      </button>
    </div>
  );
}
