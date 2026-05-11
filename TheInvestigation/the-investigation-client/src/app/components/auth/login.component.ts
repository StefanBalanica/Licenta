import { Component, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="page">
      <canvas #bgCvs class="bg-canvas"></canvas>
      <div class="scene">
        <div class="card">
          <div class="card-top-line"></div>

          <div class="brand"><img src="assets/logo.svg" class="logo-img" alt="The Investigation"/></div>

          <div class="card-divider">
            <span class="divider-lbl">ACCES SECURIZAT</span>
          </div>

          <h1 class="card-title">Bun Venit</h1>
          <p class="card-sub">Introdu datele tale pentru a te conecta.</p>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="form">

            <div class="field" [class.field-err]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched">
              <label class="lbl">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.2"/><path d="M1 5l7 5 7-5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                EMAIL
              </label>
              <input class="inp" type="email" formControlName="email" placeholder="investigator@politie.ro" autocomplete="email"/>
              <span *ngIf="loginForm.get('email')?.invalid && loginForm.get('email')?.touched" class="err-msg">Email invalid.</span>
            </div>

            <div class="field" [class.field-err]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched">
              <label class="lbl">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="2" y="6" width="12" height="9" rx="2" stroke="currentColor" stroke-width="1.2"/><path d="M5 6V4.5a3 3 0 1 1 6 0V6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="8" cy="10.5" r="1" fill="currentColor"/></svg>
                PAROLA
              </label>
              <div class="inp-wrap">
                <input class="inp" [type]="showPassword ? 'text' : 'password'" formControlName="password" placeholder="••••••••" autocomplete="current-password"/>
                <button type="button" class="eye-btn" (click)="showPassword = !showPassword" tabindex="-1">
                  <svg *ngIf="!showPassword" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.4"/></svg>
                  <svg *ngIf="showPassword" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M1 1l22 22" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                </button>
              </div>
              <span *ngIf="loginForm.get('password')?.invalid && loginForm.get('password')?.touched" class="err-msg">Minimum 6 caractere.</span>
              <a routerLink="/forgot-password" class="forgot-link">Ai uitat parola?</a>
            </div>

            <div *ngIf="errorMessage" class="error-banner">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1L15 15H1L8 1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 6v4M8 12v.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
              {{ errorMessage }}
            </div>

            <button type="submit" class="btn-submit" [disabled]="loginForm.invalid || loading">
              <span *ngIf="!loading">Intrati in sistem</span>
              <span *ngIf="loading" class="spin-wrap"><span class="spin"></span>Se verifica...</span>
            </button>
          </form>

          <p class="footer-link">Nu ai cont? <a routerLink="/register">Inregistreaza-te</a></p>
          <div class="stamp">CONFIDENTIAL</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host{display:block}*{box-sizing:border-box;margin:0;padding:0}

    .page{
      --bg:#f5f2ec;--surface:#fff;--border:rgba(0,0,0,0.07);--border-md:rgba(0,0,0,0.11);
      --amber:#b87208;--navy:#1c2b4a;--ink:#1a1610;--ink2:rgba(26,22,16,0.45);--ink3:rgba(26,22,16,0.22);--red:#9b2020;
      min-height:100vh;background:var(--bg);position:relative;font-family:'Inter',sans-serif;
    }
    .bg-canvas{position:fixed;inset:0;z-index:0;pointer-events:none;}
    .scene{position:relative;z-index:1;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px 20px;}

    .card{
      position:relative;width:100%;max-width:430px;background:var(--surface);
      border:1px solid var(--border-md);border-radius:14px;padding:36px 36px 32px;
      overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);
      animation:fadeUp .55s ease both;
    }
    @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
    .card-top-line{position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(184,114,8,0.55),transparent);}

    .brand{display:flex;align-items:center;justify-content:center;margin-bottom:18px;}
    .logo-img{width:130px;height:130px;object-fit:contain;display:block;margin:0 auto;}

    .card-divider{position:relative;height:1px;background:linear-gradient(90deg,transparent,var(--border-md),transparent);margin-bottom:24px;}
    .divider-lbl{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--surface);padding:0 10px;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--amber);white-space:nowrap;}

    .card-title{font-family:'Playfair Display',serif;font-size:26px;font-weight:400;color:var(--ink);margin-bottom:6px;text-align:center;}
    .card-sub{font-size:13px;color:var(--ink2);font-style:italic;margin-bottom:26px;line-height:1.5;text-align:center;}

    .form{display:flex;flex-direction:column;gap:16px;}
    .field{display:flex;flex-direction:column;gap:6px;}
    .lbl{display:flex;align-items:center;gap:6px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--amber);}
    .inp{padding:11px 13px;border:1px solid var(--border-md);border-radius:8px;background:var(--bg);color:var(--ink);font-size:14px;font-family:'Inter',sans-serif;outline:none;transition:border-color .2s,box-shadow .2s;width:100%;}
    .inp::placeholder{color:var(--ink3);font-style:italic;}
    .inp:focus{border-color:rgba(184,114,8,0.5);box-shadow:0 0 0 3px rgba(184,114,8,0.07);}
    .inp-wrap{position:relative;display:flex;align-items:center;}
    .inp-wrap .inp{padding-right:38px;}
    .eye-btn{position:absolute;right:10px;background:transparent;border:none;cursor:pointer;color:var(--ink3);padding:4px;display:flex;align-items:center;transition:color .15s;}
    .eye-btn:hover{color:var(--ink2);}
    .field-err .inp{border-color:rgba(155,32,32,0.4);}
    .err-msg{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--red);}
    .error-banner{display:flex;align-items:center;gap:8px;padding:10px 13px;border:1px solid rgba(155,32,32,0.2);background:rgba(155,32,32,0.05);border-radius:7px;font-size:13px;color:var(--red);}

    .forgot-link{display:block;text-align:right;margin-top:4px;font-size:11.5px;color:var(--amber);text-decoration:none;border-bottom:1px solid transparent;transition:border-color .15s;}
    .forgot-link:hover{border-color:rgba(184,114,8,0.4);}

    .btn-submit{width:100%;height:42px;border:none;border-radius:8px;background:var(--navy);color:#fff;font-size:13.5px;font-family:'Inter',sans-serif;font-weight:500;cursor:pointer;transition:opacity .2s,transform .2s;margin-top:4px;display:flex;align-items:center;justify-content:center;}
    .btn-submit:hover:not(:disabled){opacity:.88;transform:translateY(-1px);}
    .btn-submit:disabled{opacity:.4;cursor:not-allowed;}
    .spin-wrap{display:flex;align-items:center;gap:8px;}
    .spin{width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block;}
    @keyframes spin{to{transform:rotate(360deg)}}

    .footer-link{margin-top:20px;text-align:center;font-size:13px;color:var(--ink2);}
    .footer-link a{color:var(--amber);text-decoration:none;font-weight:500;margin-left:4px;border-bottom:1px solid rgba(184,114,8,0.3);padding-bottom:1px;transition:border-color .15s;}
    .footer-link a:hover{border-color:var(--amber);}

    .stamp{position:absolute;bottom:14px;right:16px;font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:500;letter-spacing:3px;text-transform:uppercase;color:rgba(155,32,32,0.2);border:1px solid rgba(155,32,32,0.15);padding:2px 7px;border-radius:2px;transform:rotate(7deg);}
  `]
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  @ViewChild('bgCvs') canvasRef!: ElementRef<HTMLCanvasElement>;
  loginForm: FormGroup;
  loading = false;
  errorMessage = '';
  showPassword = false;
  private cleanup?: () => void;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngAfterViewInit() { this.cleanup = this.initCanvas(this.canvasRef.nativeElement); }
  ngOnDestroy() { this.cleanup?.(); }

  async onSubmit() {
    if (this.loginForm.invalid) return;
    this.loading = true; this.errorMessage = '';
    try {
      await this.authService.login(this.loginForm.value.email, this.loginForm.value.password).toPromise();
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage = error.error?.message || 'Date incorecte. Incearca din nou.';
    } finally { this.loading = false; }
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
        if (n[5] === 0) {
          ctx.beginPath(); ctx.arc(px_, py_, n[6] + 4, 0, 6.28); ctx.strokeStyle = 'rgba(28,43,74,0.15)'; ctx.lineWidth = 0.8; ctx.stroke();
          ctx.beginPath(); ctx.arc(px_, py_, n[6], 0, 6.28); ctx.fillStyle = 'rgba(28,43,74,0.18)'; ctx.fill();
        } else if (n[5] === 1) {
          const pr = n[6] + 0.5 * Math.sin(t * 0.0006 + n[7]);
          ctx.beginPath(); ctx.arc(px_, py_, pr, 0, 6.28); ctx.fillStyle = 'rgba(155,32,32,0.12)'; ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(px_, py_, n[6], 0, 6.28); ctx.fillStyle = 'rgba(155,32,32,0.10)'; ctx.fill();
        }
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



