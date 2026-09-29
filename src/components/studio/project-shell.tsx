import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronDown, Download, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { listProjects } from "@/lib/manuscript.functions";
import type { ReactNode } from "react";

export function ProjectShell({ projectId, projectTitle, mode, children, onExport, status }: {
  projectId: string;
  projectTitle: string;
  mode: "develop" | "book" | "manuscript";
  children: ReactNode;
  onExport?: () => void;
  status?: ReactNode;
}) {
  const navigate = useNavigate();
  const fetchProjects = useServerFn(listProjects);
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => fetchProjects() });
  const linkClass = (active: boolean) => `inline-flex h-9 items-center justify-center border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary ${active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`;
  return (
    <div className="flex h-screen min-h-0 min-w-0 flex-col bg-background">
      <header className="shrink-0 border-b border-border bg-background">
        <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 px-3 sm:px-5">
          <Link to="/studio" className="font-serif text-lg text-foreground hover:text-primary">Storymatic</Link>
          <span className="text-muted-foreground" aria-hidden="true">/</span>
          <label className="sr-only" htmlFor="project-shell-switcher">Switch project</label>
          <span className="relative min-w-0 max-w-[min(46vw,18rem)]">
            <select id="project-shell-switcher" aria-label="Switch project" className="w-full appearance-none truncate bg-transparent py-2 pr-5 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-primary" value={projectId} onChange={(event) => void navigate({ to: "/book/$projectId", params: { projectId: event.target.value } })}>
              {!projects.data?.some((project) => project.id === projectId) && <option value={projectId}>{projectTitle}</option>}
              {projects.data?.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-0 size-3 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          </span>
          <div className="ml-auto flex items-center gap-2">
            {status && <div className="hidden sm:block">{status}</div>}
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Project menu"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild><Link to="/studio"><BookOpen className="size-4" /> All books</Link></DropdownMenuItem>
                {onExport && <DropdownMenuItem onSelect={onExport}><Download className="size-4" /> Export {mode === "manuscript" ? "manuscript" : "book memory"}</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <nav aria-label="Project modes" className="flex items-center gap-1 overflow-x-auto px-3 sm:px-5">
          <Link to="/book/$projectId" params={{ projectId }} search={{}} aria-current={mode === "develop" ? "page" : undefined} className={linkClass(mode === "develop")}>Develop</Link>
          <Link to="/book/$projectId" params={{ projectId }} search={{ view: "book" }} aria-current={mode === "book" ? "page" : undefined} className={linkClass(mode === "book")}>Book</Link>
          <Link to="/p/$projectId" params={{ projectId }} search={{}} aria-current={mode === "manuscript" ? "page" : undefined} className={linkClass(mode === "manuscript")}>Manuscript</Link>
          {status && <div className="ml-auto sm:hidden">{status}</div>}
        </nav>
      </header>
      {children}
    </div>
  );
}
