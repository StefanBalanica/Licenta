import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import zxcvbn from 'zxcvbn';

// â”€â”€ Same hard-rules validator as register â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function hardRulesValidator(control: AbstractControl): ValidationErrors | null {
  const v: string = control.value ?? '';
  if (!v) return null;
  const e: Record<string, boolean> = {};
  if (v.length < 8)                                        e['minLength'] = true;
  if (!/[A-Z]/.test(v))                                   e['uppercase'] = true;
  if (!/[a-z]/.test(v))                                   e['lowercase'] = true;
  if (!/[0-9]/.test(v))                                   e['digit']     = true;
  if (!/[!@#$%^&*()\-_=+\[\]{}|;:'",.<>?/\\`~]/.test(v)) e['special']  = true;
  return Object.keys(e).length ? e : null;
}

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pw  = group.get('password')?.value ?? '';
  const cpw = group.get('confirmPassword')?.value ?? '';
  return cpw && pw !== cpw ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
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

          <!-- Invalid / missing token -->
          <div *ngIf="!token" class="error-state">
            <p class="error-state-msg">Link invalid. <a routerLink="/forgot-password">Solicită un link nou</a>.</p>
          </div>

          <!-- Success state -->
          <div *ngIf="done" class="success-box">
            <div class="success-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#2d7a3a" stroke-width="1.4"/>
                <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#2d7a3a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h2 class="success-title">Parolă actualizată!</h2>
            <p class="success-msg">Parola ta a fost schimbată cu succes. Acum te poȚi autentifica.</p>
            <a routerLink="/login" class="btn-primary">Mergi la autentificare</a>
          </div>

          <!-- Form state -->
          <ng-container *ngIf="token && !done">
            <h1 class="card-title">Setează parola nouă</h1>
            <p class="card-sub">Alege o parolă nouă pentru contul tău.</p>

            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form">
            <div class="field" [class.field-err]="form.get('password')?.invalid && form.get('password')?.touched">
                <label class="lbl">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="6" width="12" height="9" rx="2" stroke="currentColor" stroke-width="1.2"/><path d="M5 6V4.5a3 3 0 1 1 6 0V6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                  PAROLĂ NOUĂ
                </label>
                <div class="inp-wrap">
                  <input class="inp" [type]="showPassword ? 'text' : 'password'" formControlName="password" placeholder="minimum 8 caractere" autocomplete="new-password"/>
                  <button type="button" class="eye-btn" (click)="showPassword = !showPassword" tabindex="-1">
                    <svg *ngIf="!showPassword" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.4"/></svg>
                    <svg *ngIf="showPassword" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M1 1l22 22" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                  </button>
                </div>

                <!-- Strength bar -->
                <div class="strength-wrap" *ngIf="pwValue.length > 0">
                  <div class="strength-row">
                    <div class="strength-segs">
                      <div class="seg" [style.background]="strengthScore >= 1 ? strengthColor : ''"></div>
                      <div class="seg" [style.background]="strengthScore >= 2 ? strengthColor : ''"></div>
                      <div class="seg" [style.background]="strengthScore >= 3 ? strengthColor : ''"></div>
                      <div class="seg" [style.background]="strengthScore >= 4 ? strengthColor : ''"></div>
                    </div>
                    <span class="strength-lbl" [style.color]="strengthColor">{{ strengthLabel }}</span>
                  </div>
                  <div class="pw-warning" *ngIf="zxcvbnWarning">
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 2L14 14H2L8 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 7v3M8 12v.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                    {{ zxcvbnWarning }}
                  </div>
                </div>

                <!-- Rules checklist -->
                <ul class="pw-rules" *ngIf="form.get('password')?.touched || pwValue.length > 0">
                  <li [class.ok]="!pwErrors['minLength']"><span class="ri">{{ !pwErrors['minLength'] ? 'âœ“' : 'â—‹' }}</span> Minimum 8 caractere</li>
                  <li [class.ok]="!pwErrors['uppercase']"><span class="ri">{{ !pwErrors['uppercase'] ? 'âœ“' : 'â—‹' }}</span> Cel puȚin o literă mare (A-Z)</li>
                  <li [class.ok]="!pwErrors['lowercase']"><span class="ri">{{ !pwErrors['lowercase'] ? 'âœ“' : 'â—‹' }}</span> Cel puȚin o literă mică (a-z)</li>
                  <li [class.ok]="!pwErrors['digit']"><span class="ri">{{ !pwErrors['digit'] ? 'âœ“' : 'â—‹' }}</span> Cel puȚin o cifră (0-9)</li>
                  <li [class.ok]="!pwErrors['special']"><span class="ri">{{ !pwErrors['special'] ? 'âœ“' : 'â—‹' }}</span> Cel puȚin un caracter special (!&#64;#$%^&amp;*)</li>
                </ul>
              </div>

              <!-- Confirm password -->
              <div class="field" [class.field-err]="form.hasError('passwordMismatch') && form.get('confirmPassword')?.touched">
                <label class="lbl">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="6" width="12" height="9" rx="2" stroke="currentColor" stroke-width="1.2"/><path d="M5 6V4.5a3 3 0 1 1 6 0V6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M7 10l2 2 4-4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  CONFIRMĂ PAROLA
                </label>
                <div class="inp-wrap">
                  <input class="inp" [type]="showConfirmPassword ? 'text' : 'password'" formControlName="confirmPassword" placeholder="repetă parola" autocomplete="new-password"/>
                  <button type="button" class="eye-btn" (click)="showConfirmPassword = !showConfirmPassword" tabindex="-1">
                    <svg *ngIf="!showConfirmPassword" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.4"/></svg>
                    <svg *ngIf="showConfirmPassword" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M1 1l22 22" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                  </button>
                </div>
                <span *ngIf="form.hasError('passwordMismatch') && form.get('confirmPassword')?.touched" class="err-msg">Parolele nu coincid.</span>
              </div>

              <div *ngIf="errorMessage" class="error-banner">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1L15 15H1L8 1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 6v4M8 12v.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                {{ errorMessage }}
                <a *ngIf="showRetryLink" routerLink="/forgot-password" class="retry-link">Solicită un link nou</a>
              </div>

              <button type="submit" class="btn-submit" [disabled]="form.invalid || loading">
                <span *ngIf="!loading">Salvează parola</span>
                <span *ngIf="loading" class="spin-wrap"><span class="spin"></span>Se salveazăâ€¦</span>
              </button>
            </form>
          </ng-container>

          <div class="stamp">SECURIZAT</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host{display:block}*{box-sizing:border-box;margin:0;padding:0}
    .page{--bg:#f5f2ec;--surface:#fff;--border:rgba(0,0,0,0.07);--border-md:rgba(0,0,0,0.11);--amber:#b87208;--navy:#1c2b4a;--ink:#1a1610;--ink2:rgba(26,22,16,0.45);--ink3:rgba(26,22,16,0.22);--red:#9b2020;min-height:100vh;background:var(--bg);font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;padding:32px 20px;}
    .scene{width:100%;max-width:430px;}
    .card{position:relative;background:var(--surface);border:1px solid var(--border-md);border-radius:14px;padding:36px 36px 32px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);animation:fadeUp .5s ease both;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    .card-top-line{position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(184,114,8,0.55),transparent);}
    .brand{display:flex;align-items:center;justify-content:center;margin-bottom:18px;}
    .logo-img{width:130px;height:130px;object-fit:contain;display:block;margin:0 auto;}
    .card-title{font-family:'Playfair Display',serif;font-size:24px;font-weight:400;color:var(--ink);margin-bottom:8px;text-align:center;}
    .card-sub{font-size:13px;color:var(--ink2);line-height:1.6;margin-bottom:24px;text-align:center;}
    .form{display:flex;flex-direction:column;gap:14px;}
    .field{display:flex;flex-direction:column;gap:5px;}
    .lbl{display:flex;align-items:center;gap:6px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--amber);}
    .inp{padding:11px 13px;border:1px solid var(--border-md);border-radius:8px;background:var(--bg);color:var(--ink);font-size:14px;outline:none;transition:border-color .2s,box-shadow .2s;width:100%;}
    .inp-wrap{position:relative;display:flex;align-items:center;}
    .inp-wrap .inp{padding-right:38px;}
    .inp:focus{border-color:rgba(184,114,8,0.5);box-shadow:0 0 0 3px rgba(184,114,8,0.07);}
    .field-err .inp{border-color:rgba(155,32,32,0.4);}
    .error-banner{display:flex;align-items:center;gap:8px;padding:10px 13px;border:1px solid rgba(155,32,32,0.2);background:rgba(155,32,32,0.05);border-radius:7px;font-size:13px;color:var(--red);flex-wrap:wrap;}
    .retry-link{color:var(--amber);text-decoration:none;border-bottom:1px solid rgba(184,114,8,0.4);margin-left:4px;font-size:12px;}
    .btn-submit{width:100%;height:42px;border:none;border-radius:8px;background:var(--navy);color:#fff;font-size:13.5px;font-family:'Inter',sans-serif;font-weight:500;cursor:pointer;transition:opacity .2s,transform .2s;display:flex;align-items:center;justify-content:center;}
    .btn-submit:hover:not(:disabled){opacity:.88;transform:translateY(-1px);}
    .btn-submit:disabled{opacity:.4;cursor:not-allowed;}
    .spin-wrap{display:flex;align-items:center;gap:8px;}
    .spin{width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block;}
    @keyframes spin{to{transform:rotate(360deg)}}
    /* Strength */
    .strength-wrap{margin-top:6px;display:flex;flex-direction:column;gap:4px;}
    .strength-row{display:flex;align-items:center;gap:8px;}
    .strength-segs{display:flex;gap:3px;flex:1;}
    .seg{height:4px;flex:1;border-radius:99px;background:rgba(0,0,0,0.08);transition:background .35s;}
    .strength-lbl{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;white-space:nowrap;transition:color .3s;min-width:80px;text-align:right;}
    .pw-warning{display:flex;align-items:center;gap:5px;font-size:11.5px;color:#c06010;font-style:italic;}
    .pw-rules{list-style:none;display:flex;flex-direction:column;gap:3px;padding:8px 0 2px;border-top:1px solid var(--border);margin-top:4px;}
    .pw-rules li{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--ink3);transition:color .2s;}
    .pw-rules li.ok{color:#2d7a3a;}
    .ri{font-family:'JetBrains Mono',monospace;font-size:11px;width:14px;text-align:center;}
    .err-msg{font-size:11.5px;color:var(--red);}
    .eye-btn{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:transparent;border:none;cursor:pointer;color:var(--ink3);padding:4px;display:flex;align-items:center;transition:color .15s;}
    .eye-btn:hover{color:var(--ink2);}
    /* Success */
    .success-box{display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding:8px 0 4px;}
    .success-icon{width:56px;height:56px;border-radius:50%;background:rgba(45,122,58,0.08);border:1px solid rgba(45,122,58,0.2);display:flex;align-items:center;justify-content:center;}
    .success-title{font-family:'Playfair Display',serif;font-size:22px;color:var(--ink);}
    .success-msg{font-size:13.5px;color:var(--ink2);line-height:1.7;max-width:320px;}
    .btn-primary{margin-top:8px;padding:11px 28px;background:var(--navy);color:#fff;border-radius:8px;text-decoration:none;font-size:13.5px;font-weight:500;transition:opacity .2s;}
    .btn-primary:hover{opacity:.88;}
    /* Error state */
    .error-state{padding:8px 0;}
    .error-state-msg{font-size:14px;color:var(--ink2);line-height:1.6;}
    .error-state-msg a{color:var(--amber);text-decoration:none;border-bottom:1px solid rgba(184,114,8,0.3);}
    .stamp{position:absolute;bottom:14px;right:16px;font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:3px;text-transform:uppercase;color:rgba(28,43,74,0.2);border:1px solid rgba(28,43,74,0.15);padding:2px 7px;border-radius:2px;transform:rotate(7deg);}
  `]
})
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  token = '';
  loading = false;
  done = false;
  errorMessage = '';
  showRetryLink = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(private fb: FormBuilder, private http: HttpClient, private route: ActivatedRoute, private router: Router) {
    this.form = this.fb.group({
      password:        ['', [Validators.required, hardRulesValidator]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });
  }

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  // â”€â”€ Strength helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  get pwValue(): string { return this.form.get('password')?.value ?? ''; }
  get pwErrors(): Record<string, boolean> { return (this.form.get('password')?.errors as Record<string, boolean>) ?? {}; }

  private get _zxcvbn() { return this.pwValue ? zxcvbn(this.pwValue) : null; }
  get strengthScore(): number { return this._zxcvbn?.score ?? 0; }
  get strengthColor(): string { return ['#c0392b','#e67e22','#f39c12','#27ae60','#2ecc71'][this.strengthScore] ?? '#c0392b'; }
  get strengthLabel(): string { return ['Foarte slabă','Slabă','Acceptabilă','Bună','Excelentă'][this.strengthScore] ?? 'Foarte slabă'; }
  get zxcvbnWarning(): string {
    const w = this._zxcvbn?.feedback?.warning ?? '';
    return w || '';
  }

  async onSubmit() {
    if (this.form.invalid || !this.token) return;
    this.loading = true;
    this.errorMessage = '';
    this.showRetryLink = false;
    try {
      await this.http.post('http://localhost:5230/api/auth/reset-password', {
        token: this.token,
        newPassword: this.form.value.password
      }).toPromise();
      this.done = true;
    } catch (err: any) {
      this.errorMessage = err.error?.message || 'A apărut o eroare. Încearcă din nou.';
      this.showRetryLink = this.errorMessage.includes('expirat') || this.errorMessage.includes('invalid') || this.errorMessage.includes('utilizat');
    } finally {
      this.loading = false;
    }
  }
}



