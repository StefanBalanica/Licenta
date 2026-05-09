import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="page">
      <div class="scene">
        <div class="card">
          <div class="card-top-line"></div>

          <div class="brand">
            <img src="assets/logo.svg" class="logo-img" alt="The Investigation"/>
          </div>

          <!-- Success state -->
          <div *ngIf="sent" class="success-box">
            <div class="success-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#2d7a3a" stroke-width="1.4"/>
                <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#2d7a3a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h2 class="success-title">Email trimis!</h2>
            <p class="success-msg">
              Dacă adresa <strong>{{ emailSent }}</strong> este înregistrată, vei primi un link de resetare în câteva minute.<br>
              Verifică și folderul <em>Spam</em>.
            </p>
            <a routerLink="/login" class="btn-back">Înapoi la autentificare</a>
          </div>

          <!-- Form state -->
          <ng-container *ngIf="!sent">
            <h1 class="card-title">Ai uitat parola?</h1>
            <p class="card-sub">Introdu emailul contului tău și îȚi trimitem un link securizat de resetare.</p>

            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form">
              <div class="field" [class.field-err]="form.get('email')?.invalid && form.get('email')?.touched">
                <label class="lbl">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.2"/><path d="M1 5l7 5 7-5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                  EMAIL
                </label>
                <input class="inp" type="email" formControlName="email" placeholder="investigator&#64;politie.ro" autocomplete="email"/>
                <span *ngIf="form.get('email')?.invalid && form.get('email')?.touched" class="err-msg">Email invalid.</span>
              </div>

              <div *ngIf="errorMessage" class="error-banner">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1L15 15H1L8 1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 6v4M8 12v.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                {{ errorMessage }}
              </div>

              <button type="submit" class="btn-submit" [disabled]="form.invalid || loading">
                <span *ngIf="!loading">Trimite link de resetare</span>
                <span *ngIf="loading" class="spin-wrap"><span class="spin"></span>Se trimiteâ€¦</span>
              </button>
            </form>

            <p class="footer-link"><a routerLink="/login">&#8592; Înapoi la autentificare</a></p>
          </ng-container>

          <div class="stamp">CONFIDENȚIAL</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host{display:block}*{box-sizing:border-box;margin:0;padding:0}
    .page{--bg:#f5f2ec;--surface:#fff;--border-md:rgba(0,0,0,0.11);--amber:#b87208;--navy:#1c2b4a;--ink:#1a1610;--ink2:rgba(26,22,16,0.45);--ink3:rgba(26,22,16,0.22);--red:#9b2020;min-height:100vh;background:var(--bg);font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;padding:32px 20px;}
    .scene{width:100%;max-width:430px;}
    .card{position:relative;background:var(--surface);border:1px solid var(--border-md);border-radius:14px;padding:36px 36px 32px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);animation:fadeUp .5s ease both;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    .card-top-line{position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(184,114,8,0.55),transparent);}
    .brand{display:flex;align-items:center;justify-content:center;margin-bottom:22px;}
    .logo-img{width:130px;height:130px;object-fit:contain;display:block;margin:0 auto;}
    .card-title{font-family:'Playfair Display',serif;font-size:24px;font-weight:400;color:var(--ink);margin-bottom:8px;}
    .card-sub{font-size:13px;color:var(--ink2);line-height:1.6;margin-bottom:24px;}
    .form{display:flex;flex-direction:column;gap:16px;}
    .field{display:flex;flex-direction:column;gap:6px;}
    .lbl{display:flex;align-items:center;gap:6px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--amber);}
    .inp{padding:11px 13px;border:1px solid var(--border-md);border-radius:8px;background:var(--bg);color:var(--ink);font-size:14px;outline:none;transition:border-color .2s,box-shadow .2s;}
    .inp:focus{border-color:rgba(184,114,8,0.5);box-shadow:0 0 0 3px rgba(184,114,8,0.07);}
    .field-err .inp{border-color:rgba(155,32,32,0.4);}
    .err-msg{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--red);}
    .error-banner{display:flex;align-items:center;gap:8px;padding:10px 13px;border:1px solid rgba(155,32,32,0.2);background:rgba(155,32,32,0.05);border-radius:7px;font-size:13px;color:var(--red);}
    .btn-submit{width:100%;height:42px;border:none;border-radius:8px;background:var(--navy);color:#fff;font-size:13.5px;font-family:'Inter',sans-serif;font-weight:500;cursor:pointer;transition:opacity .2s,transform .2s;display:flex;align-items:center;justify-content:center;}
    .btn-submit:hover:not(:disabled){opacity:.88;transform:translateY(-1px);}
    .btn-submit:disabled{opacity:.4;cursor:not-allowed;}
    .spin-wrap{display:flex;align-items:center;gap:8px;}
    .spin{width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block;}
    @keyframes spin{to{transform:rotate(360deg)}}
    .footer-link{margin-top:20px;text-align:center;font-size:13px;}
    .footer-link a{color:var(--amber);text-decoration:none;font-weight:500;border-bottom:1px solid rgba(184,114,8,0.3);padding-bottom:1px;}
    /* Success */
    .success-box{display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding:8px 0 4px;}
    .success-icon{width:56px;height:56px;border-radius:50%;background:rgba(45,122,58,0.08);border:1px solid rgba(45,122,58,0.2);display:flex;align-items:center;justify-content:center;}
    .success-title{font-family:'Playfair Display',serif;font-size:22px;color:var(--ink);}
    .success-msg{font-size:13.5px;color:var(--ink2);line-height:1.7;max-width:320px;}
    .btn-back{margin-top:8px;padding:10px 24px;border:1px solid var(--border-md);border-radius:8px;color:var(--ink);text-decoration:none;font-size:13px;transition:background .2s;}
    .btn-back:hover{background:var(--bg);}
    .stamp{position:absolute;bottom:14px;right:16px;font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:3px;text-transform:uppercase;color:rgba(28,43,74,0.2);border:1px solid rgba(28,43,74,0.15);padding:2px 7px;border-radius:2px;transform:rotate(7deg);}
  `]
})
export class ForgotPasswordComponent {
  form: FormGroup;
  loading = false;
  sent = false;
  emailSent = '';
  errorMessage = '';

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMessage = '';
    const email = this.form.value.email;
    try {
      await this.http.post('http://localhost:5230/api/auth/forgot-password', { email }).toPromise();
      this.emailSent = email;
      this.sent = true;
    } catch {
      this.errorMessage = 'A apărut o eroare. Încearcă din nou.';
    } finally {
      this.loading = false;
    }
  }
}



