import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { GameService } from '../../services/game.service';
import { Game } from '../../models/models';

@Component({
  selector: 'app-game-builder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="page">
      <canvas #bgCvs class="bg-canvas"></canvas>

      <!-- Navbar -->
      <nav class="navbar">
        <div class="nav-inner">
          <button class="btn-back" routerLink="/dashboard">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Dashboard
          </button>
          <h2 class="nav-title">{{ isEditMode ? 'Editare dosar' : 'Dosar nou' }}</h2>
          <div class="nav-acts">
            <button class="btn-ghost" (click)="saveDraft()" [disabled]="saving">
              {{ saving ? 'Se salveaza…' : 'Salveaza draft' }}
            </button>
            <button class="btn-primary" (click)="publish()" [disabled]="gameForm.invalid || saving">
              Publica
            </button>
          </div>
        </div>
      </nav>

      <!-- Content -->
      <main class="main-wrap">
        <div class="page-header">
          <div class="eyebrow">{{ isEditMode ? 'EDITARE DOSAR' : 'DOSAR NOU' }}</div>
          <h1 class="display-title">{{ isEditMode ? 'Modifica cazul' : 'Creeaza un caz nou' }}</h1>
        </div>

        <form [formGroup]="gameForm" class="form-stack">

          <!-- Basic Info -->
          <div class="form-card">
            <div class="section-head">
              <div class="section-num">01</div>
              <div>
                <div class="section-eyebrow">INFORMATII DE BAZA</div>
                <h3 class="section-title">Titlu & Descriere</h3>
              </div>
            </div>
            <div class="field" [class.field-err]="gameForm.get('title')?.invalid && gameForm.get('title')?.touched">
              <label class="lbl">TITLUL CAZULUI *</label>
              <input class="inp" type="text" formControlName="title" placeholder="Crima din Vila Blackwood"/>
              <span *ngIf="gameForm.get('title')?.invalid && gameForm.get('title')?.touched" class="err-msg">Titlul este obligatoriu.</span>
            </div>
            <div class="field">
              <label class="lbl">DESCRIERE SCURTA</label>
              <textarea class="inp inp-ta" rows="3" formControlName="description" placeholder="O prezentare succinta a misterului…"></textarea>
            </div>
          </div>

          <!-- Story -->
          <div class="form-card">
            <div class="section-head">
              <div class="section-num">02</div>
              <div>
                <div class="section-eyebrow">NARATIUNEA CAZULUI</div>
                <h3 class="section-title">Povestea & Contextul</h3>
              </div>
            </div>
            <div class="field" [class.field-err]="gameForm.get('story')?.invalid && gameForm.get('story')?.touched">
              <label class="lbl">NARATIUNEA *</label>
              <p class="field-hint">Descrierea fundalului, a locului si a imprejurarilor. Aceasta va fi vizibila pentru toti jucatorii.</p>
              <textarea class="inp inp-ta" rows="8" formControlName="story"
                placeholder="Intr-o noapte furtunasa la Vila Blackwood, industriasul milionar Charles Blackwood a fost gasit mort in biroul sau. Politia a concluzionat ca este vorba de crima, iar toti cei prezenti in seara aceea sunt suspecti…"
                [class.err-inp]="gameForm.get('story')?.invalid && gameForm.get('story')?.touched"></textarea>
              <span *ngIf="gameForm.get('story')?.invalid && gameForm.get('story')?.touched" class="err-msg">Naratiunea este obligatorie.</span>
            </div>
          </div>

          <!-- Solution -->
          <div class="form-card form-card--solution">
            <div class="solution-badge">DOAR GAME MASTER</div>
            <div class="section-head">
              <div class="section-num section-num--lock">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="7" width="12" height="8" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M5 7V5a3 3 0 1 1 6 0v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
              </div>
              <div>
                <div class="section-eyebrow">SOLUTIA CAZULUI</div>
                <h3 class="section-title">Cine, cum si de ce</h3>
              </div>
            </div>
            <div class="field" [class.field-err]="gameForm.get('solution')?.invalid && gameForm.get('solution')?.touched">
              <label class="lbl">SOLUTIA *</label>
              <p class="field-hint">Vizibil exclusiv game master-ului. Descrie cine a comis crima, cum si care a fost motivul.</p>
              <textarea class="inp inp-ta" rows="6" formControlName="solution"
                placeholder="Majordomul James Morrison a comis crima cu o otrava rara din perioada militara, din razbunare pentru mostenirea refuzata dupa 30 de ani de serviciu loial…"
                [class.err-inp]="gameForm.get('solution')?.invalid && gameForm.get('solution')?.touched"></textarea>
              <span *ngIf="gameForm.get('solution')?.invalid && gameForm.get('solution')?.touched" class="err-msg">Solutia este obligatorie.</span>
            </div>
          </div>

          <!-- Info box -->
          <div class="info-box">
            <div class="info-title">Pasi urmatori dupa crearea dosarului:</div>
            <ul class="info-list">
              <li><strong>Adauga Suspecti</strong> — Personaje cu motive, aliburi si istorii</li>
              <li><strong>Adauga Dovezi Fizice</strong> — Documente, rapoarte, fragmente de presa</li>
              <li><strong>Adauga Dispozitive Digitale</strong> — Simulatoare de telefon cu mesaje, poze, emailuri</li>
              <li><strong>Exporta & Joaca</strong> — Genereaza PDF-uri si coduri QR</li>
            </ul>
          </div>

          <div *ngIf="errorMessage" class="error-banner">{{ errorMessage }}</div>

        </form>
      </main>
    </div>
  `,
  styles: [`
    :host{display:block}*{box-sizing:border-box;margin:0;padding:0}

    .page{
      --bg:#fcfaf7;--surface:#fff;--border:rgba(0,0,0,0.07);--border-md:rgba(0,0,0,0.11);
      --amber:#d43f33;--amber-l:rgba(212,63,51,0.07);--navy:#1a1a1a;--navy-l:rgba(26,26,26,0.06);
      --ink:#1a1a1a;--ink2:rgba(26,22,16,0.45);--ink3:rgba(26,22,16,0.22);--red:#9b2020;
      min-height:100vh;background:var(--bg);font-family:'Public Sans',sans-serif;color:var(--ink);
    }
    .bg-canvas{position:fixed;inset:0;z-index:0;pointer-events:none;}

    /* Navbar */
    .navbar{position:sticky;top:0;z-index:100;height:54px;background:rgba(252,250,247,0.88);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid var(--border-md);}
    .nav-inner{max-width:860px;margin:0 auto;padding:0 24px;height:100%;display:flex;align-items:center;gap:16px;position:relative;z-index:1;}
    .nav-title{font-family:'Crimson Pro',serif;font-size:15px;font-weight:600;color:var(--ink);flex:1;text-align:center;}
    .nav-acts{display:flex;gap:8px;margin-left:auto;}

    .btn-back{display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 12px;border:1px solid var(--border-md);border-radius:7px;background:transparent;color:var(--ink2);font-size:12.5px;font-family:'Public Sans',sans-serif;cursor:pointer;transition:border-color .2s;}
    .btn-back:hover{border-color:rgba(0,0,0,0.2);color:var(--ink);}
    .btn-ghost{display:inline-flex;align-items:center;height:32px;padding:0 13px;border:1px solid var(--border-md);border-radius:7px;background:transparent;color:var(--ink2);font-size:12.5px;font-family:'Public Sans',sans-serif;cursor:pointer;transition:border-color .2s;}
    .btn-ghost:hover{border-color:rgba(0,0,0,0.2);}
    .btn-ghost:disabled{opacity:.4;cursor:not-allowed;}
    .btn-primary{display:inline-flex;align-items:center;height:32px;padding:0 16px;border:none;border-radius:7px;background:var(--navy);color:#fff;font-size:12.5px;font-family:'Public Sans',sans-serif;font-weight:500;cursor:pointer;transition:opacity .2s;}
    .btn-primary:hover:not(:disabled){opacity:.88;}
    .btn-primary:disabled{opacity:.4;cursor:not-allowed;}

    /* Main */
    .main-wrap{max-width:860px;margin:0 auto;padding:36px 24px 60px;position:relative;z-index:1;}
    .page-header{margin-bottom:28px;animation:fadeUp .5s ease both;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    .eyebrow{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--amber);margin-bottom:6px;}
    .display-title{font-family:'Crimson Pro',serif;font-size:30px;font-weight:400;color:var(--ink);}

    /* Form cards */
    .form-stack{display:flex;flex-direction:column;gap:20px;}
    .form-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:28px;position:relative;overflow:hidden;}
    .form-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(184,114,8,0.35),transparent);}
    .form-card--solution{border-color:rgba(155,32,32,0.18);background:rgba(255,251,251,1);}
    .form-card--solution::before{background:linear-gradient(90deg,transparent,rgba(155,32,32,0.4),transparent);}
    .solution-badge{position:absolute;top:16px;right:18px;font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(155,32,32,0.6);border:1px solid rgba(155,32,32,0.2);padding:2px 8px;border-radius:3px;}

    .section-head{display:flex;align-items:center;gap:14px;margin-bottom:22px;}
    .section-num{width:30px;height:30px;border:1px solid rgba(184,114,8,0.3);border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--amber);flex-shrink:0;}
    .section-num--lock{border-color:rgba(155,32,32,0.3);color:var(--red);}
    .section-eyebrow{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--ink3);margin-bottom:3px;}
    .section-title{font-family:'Crimson Pro',serif;font-size:17px;font-weight:600;color:var(--ink);}

    .field{margin-bottom:16px;}
    .field:last-child{margin-bottom:0;}
    .lbl{display:block;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--amber);margin-bottom:6px;}
    .field-hint{font-size:12.5px;color:var(--ink2);font-style:italic;margin-bottom:8px;line-height:1.5;}
    .inp{width:100%;padding:11px 13px;border:1px solid var(--border-md);border-radius:8px;background:var(--bg);color:var(--ink);font-size:14px;font-family:'Public Sans',sans-serif;outline:none;transition:border-color .2s,box-shadow .2s;}
    .inp-ta{resize:vertical;line-height:1.65;}
    .inp::placeholder{color:var(--ink3);font-style:italic;}
    .inp:focus{border-color:rgba(184,114,8,0.5);box-shadow:0 0 0 3px rgba(212,63,51,0.07);}
    .field-err .inp,.err-inp{border-color:rgba(155,32,32,0.4);}
    .err-msg{display:block;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--red);margin-top:5px;}

    /* Info box */
    .info-box{background:var(--surface);border:1px solid var(--border);border-left:3px solid rgba(28,43,74,0.35);border-radius:10px;padding:22px 24px;}
    .info-title{font-family:'Crimson Pro',serif;font-size:14px;font-weight:600;color:var(--navy);margin-bottom:12px;}
    .info-list{list-style:none;padding:0;}
    .info-list li{font-size:13.5px;color:var(--ink2);margin-bottom:8px;padding-left:16px;position:relative;line-height:1.5;}
    .info-list li::before{content:'—';position:absolute;left:0;color:var(--amber);}
    .info-list strong{color:var(--ink);font-weight:500;}

    .error-banner{padding:11px 14px;border:1px solid rgba(155,32,32,0.2);background:rgba(155,32,32,0.05);border-radius:7px;font-size:13px;color:var(--red);}
  `]
})
export class GameBuilderComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('bgCvs') canvasRef!: ElementRef<HTMLCanvasElement>;
  gameForm: FormGroup;
  isEditMode = false;
  gameId?: number;
  saving = false;
  errorMessage = '';
  private cleanup?: () => void;

  constructor(private fb: FormBuilder, private gameService: GameService, private router: Router, private route: ActivatedRoute) {
    this.gameForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      story: ['', Validators.required],
      solution: ['', Validators.required]
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) { this.isEditMode = true; this.gameId = parseInt(id); this.loadGame(this.gameId); }
  }

  ngAfterViewInit() { this.cleanup = this.initCanvas(this.canvasRef.nativeElement); }
  ngOnDestroy() { this.cleanup?.(); }

  loadGame(id: number) {
    this.gameService.getGame(id).subscribe({
      next: (game) => this.gameForm.patchValue({ title: game.title, description: game.description, story: game.story, solution: game.solution }),
      error: () => { this.errorMessage = 'Eroare la incarcarea dosarului.'; }
    });
  }

  async saveDraft() {
    if (this.gameForm.invalid) return;
    this.saving = true; this.errorMessage = '';
    try {
      const data = { ...this.gameForm.value, isPublished: false };
      if (this.isEditMode && this.gameId) await this.gameService.updateGame(this.gameId, data).toPromise();
      else await this.gameService.createGame(data).toPromise();
      this.router.navigate(['/dashboard']);
    } catch (error: any) { this.errorMessage = error.error?.message || 'Eroare la salvare.'; }
    finally { this.saving = false; }
  }

  async publish() {
    if (this.gameForm.invalid) return;
    this.saving = true; this.errorMessage = '';
    try {
      const data = { ...this.gameForm.value, isPublished: true };
      if (this.isEditMode && this.gameId) {
        await this.gameService.updateGame(this.gameId, data).toPromise();
        await this.gameService.publishGame(this.gameId).toPromise();
      } else {
        const game = await this.gameService.createGame(data).toPromise();
        if (game) await this.gameService.publishGame(game.gameId).toPromise();
      }
      this.router.navigate(['/dashboard']);
    } catch (error: any) { this.errorMessage = error.error?.message || 'Eroare la publicare.'; }
    finally { this.saving = false; }
  }

  private initCanvas(cv: HTMLCanvasElement): () => void {
    const ctx = cv.getContext('2d')!;
    let W = 0, H = 0;
    const rs = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; };
    rs(); addEventListener('resize', rs);
    const r = Math.random;
    const ep = () => r() < 0.5 ? r() * 0.22 : 0.78 + r() * 0.22;
    const ns: number[][] = [];
    for (let i = 0; i < 4; i++) ns.push([ep(), ep(), 0.00022 + r() * 0.00012, r() * 6.28, 24 + r() * 14, 0, 6, r() * 6.28]);
    for (let i = 0; i < 10; i++) ns.push([r() < 0.6 ? ep() : r(), ep(), 0.00018 + r() * 0.0001, r() * 6.28, 18 + r() * 20, 1, 3 + r() * 0.5, r() * 6.28]);
    for (let i = 0; i < 8; i++) ns.push([ep(), r() < 0.6 ? ep() : r(), 0.00015 + r() * 0.0001, r() * 6.28, 18 + r() * 16, 2, 2.5, r() * 6.28]);
    interface E { a: number; b: number; k: number; }
    const es: E[] = [];
    for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++)
      if (Math.hypot(ns[i][0] - ns[j][0], ns[i][1] - ns[j][1]) < 0.38 && r() < 0.55)
        es.push({ a: i, b: j, k: r() < 0.5 ? 0 : r() < 0.7 ? 1 : 2 });
    let rid: number;
    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      const px = ns.map(n => [n[0] * W + Math.sin(t * n[2] + n[3]) * n[4], n[1] * H + Math.cos(t * n[2] * 0.7 + n[3] + 1) * n[4] * 0.6]);
      for (const e of es) {
        const [ax, ay] = px[e.a], [bx, by] = px[e.b];
        const mx = (ax + bx) / 2 + Math.sin(t * 0.0002 + e.a + e.b) * 14;
        const my = (ay + by) / 2 + Math.cos(t * 0.00018 + e.a) * 10;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by);
        if (e.k === 0) { ctx.strokeStyle = 'rgba(155,32,32,0.08)'; ctx.lineWidth = 0.75; ctx.setLineDash([]); }
        else if (e.k === 1) { ctx.strokeStyle = 'rgba(155,32,32,0.06)'; ctx.lineWidth = 0.65; ctx.setLineDash([4, 10]); ctx.lineDashOffset = -(t * 0.012); }
        else { const a = 0.07 + 0.09 * Math.sin(t * 0.0003 + e.a); ctx.strokeStyle = `rgba(155,32,32,${a.toFixed(3)})`; ctx.lineWidth = 0.9; ctx.setLineDash([]); }
        ctx.stroke();
      }
      ctx.setLineDash([]);
      for (let i = 0; i < ns.length; i++) {
        const n = ns[i], [px_, py_] = px[i];
        if (n[5] === 0) { ctx.beginPath(); ctx.arc(px_, py_, n[6] + 4, 0, 6.28); ctx.strokeStyle = 'rgba(28,43,74,0.15)'; ctx.lineWidth = 0.8; ctx.stroke(); ctx.beginPath(); ctx.arc(px_, py_, n[6], 0, 6.28); ctx.fillStyle = 'rgba(28,43,74,0.18)'; ctx.fill(); }
        else if (n[5] === 1) { const pr = n[6] + 0.5 * Math.sin(t * 0.0006 + n[7]); ctx.beginPath(); ctx.arc(px_, py_, pr, 0, 6.28); ctx.fillStyle = 'rgba(155,32,32,0.12)'; ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(px_, py_, n[6], 0, 6.28); ctx.fillStyle = 'rgba(155,32,32,0.10)'; ctx.fill(); }
      }
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.1, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0.2, 'transparent'); vg.addColorStop(0.62, 'rgba(245,242,236,0.50)'); vg.addColorStop(1, 'rgba(245,242,236,0.90)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      rid = requestAnimationFrame(draw);
    };
    rid = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rid); removeEventListener('resize', rs); };
  }
}
