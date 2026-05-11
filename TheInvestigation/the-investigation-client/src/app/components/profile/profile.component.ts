import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import zxcvbn from 'zxcvbn';

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
  const pw  = group.get('newPassword')?.value ?? '';
  const cpw = group.get('confirmNewPassword')?.value ?? '';
  return cpw && pw !== cpw ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  template: `
    <div class="page">
      <!-- Navbar -->
      <nav class="navbar">
        <div class="nav-inner">
          <a routerLink="/dashboard" class="nav-back">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Dashboard
          </a>
          <div class="nav-logo">
            <img src="assets/logo.svg" class="logo-img" alt="The Investigation"/>
          </div>
          <div class="nav-spacer"></div>
        </div>
      </nav>

      <main class="main">
        <div class="content">

          <!-- Account Info Card -->
          <section class="card">
            <div class="card-top-line"></div>
            <div class="section-head">
              <div class="section-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
              </div>
              <div>
                <div class="eyebrow">CONT</div>
                <h2 class="section-title">InformaTii cont</h2>
              </div>
            </div>
            <div class="info-grid">
              <div class="info-row">
                <span class="info-lbl">UTILIZATOR</span>
                <span class="info-val">{{ userName }}</span>
              </div>
              <div class="info-row">
                <span class="info-lbl">EMAIL</span>
                <span class="info-val">{{ userEmail }}</span>
              </div>
              <div class="info-row">
                <span class="info-lbl">CONT CREAT</span>
                <span class="info-val">{{ createdAt }}</span>
              </div>
              <div class="info-row">
                <span class="info-lbl">ROL</span>
                <span class="info-val role-badge">CREATOR</span>
              </div>
            </div>
          </section>

          <!-- Change Password Card -->
          <section class="card">
            <div class="card-top-line"></div>
            <div class="section-head">
              <div class="section-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="10" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="12" cy="16" r="1.5" fill="currentColor"/></svg>
              </div>
              <div>
                <div class="eyebrow">SECURITATE</div>
                <h2 class="section-title">Schimba parola</h2>
              </div>
            </div>

            <div *ngIf="pwSuccess" class="alert-success">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 8.5l2.5 2.5 4-5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Parola a fost actualizata cu succes.
            </div>

            <form [formGroup]="pwForm" (ngSubmit)="changePassword()" class="form">
              <div class="field">
                <label class="lbl">PAROLA CURENTA</label>
                <div class="inp-wrap">
                  <input class="inp" [type]="showCurrentPassword ? 'text' : 'password'" formControlName="currentPassword" autocomplete="current-password"/>
                  <button type="button" class="eye-btn" (click)="showCurrentPassword = !showCurrentPassword" tabindex="-1">
                    <svg *ngIf="!showCurrentPassword" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.4"/></svg>
                    <svg *ngIf="showCurrentPassword" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M1 1l22 22" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                  </button>
                </div>
              </div>
              <div class="field">
                <label class="lbl">PAROLA NOUA</label>
                <div class="inp-wrap">
                  <input class="inp" [type]="showNewPassword ? 'text' : 'password'" formControlName="newPassword" autocomplete="new-password"/>
                  <button type="button" class="eye-btn" (click)="showNewPassword = !showNewPassword" tabindex="-1">
                    <svg *ngIf="!showNewPassword" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.4"/></svg>
                    <svg *ngIf="showNewPassword" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M1 1l22 22" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                  </button>
                </div>
                <!-- Strength bar -->
                <div class="strength-wrap" *ngIf="newPwValue.length > 0">
                  <div class="strength-row">
                    <div class="strength-segs">
                      <div class="seg" [style.background]="strengthScore >= 1 ? strengthColor : ''"></div>
                      <div class="seg" [style.background]="strengthScore >= 2 ? strengthColor : ''"></div>
                      <div class="seg" [style.background]="strengthScore >= 3 ? strengthColor : ''"></div>
                      <div class="seg" [style.background]="strengthScore >= 4 ? strengthColor : ''"></div>
                    </div>
                    <span class="strength-lbl" [style.color]="strengthColor">{{ strengthLabel }}</span>
                  </div>
                </div>
                <!-- Rules -->
                <ul class="pw-rules" *ngIf="newPwValue.length > 0">
                  <li [class.ok]="!newPwErrors['minLength']"><span class="ri">{{ !newPwErrors['minLength'] ? 'aœ“' : 'a—‹' }}</span> Minimum 8 caractere</li>
                  <li [class.ok]="!newPwErrors['uppercase']"><span class="ri">{{ !newPwErrors['uppercase'] ? 'aœ“' : 'a—‹' }}</span> Litera mare (A-Z)</li>
                  <li [class.ok]="!newPwErrors['lowercase']"><span class="ri">{{ !newPwErrors['lowercase'] ? 'aœ“' : 'a—‹' }}</span> Litera mica (a-z)</li>
                  <li [class.ok]="!newPwErrors['digit']"><span class="ri">{{ !newPwErrors['digit'] ? 'aœ“' : 'a—‹' }}</span> Cifra (0-9)</li>
                  <li [class.ok]="!newPwErrors['special']"><span class="ri">{{ !newPwErrors['special'] ? 'aœ“' : 'a—‹' }}</span> Caracter special (!&#64;#$%)</li>
                </ul>
              </div>

              <!-- Confirm new password -->
              <div class="field" [class.field-err]="pwForm.hasError('passwordMismatch') && pwForm.get('confirmNewPassword')?.touched">
                <label class="lbl">CONFIRMA PAROLA NOUA</label>
                <div class="inp-wrap">
                  <input class="inp" [type]="showConfirmNewPassword ? 'text' : 'password'" formControlName="confirmNewPassword" placeholder="repeta parola noua" autocomplete="new-password"/>
                  <button type="button" class="eye-btn" (click)="showConfirmNewPassword = !showConfirmNewPassword" tabindex="-1">
                    <svg *ngIf="!showConfirmNewPassword" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.4"/></svg>
                    <svg *ngIf="showConfirmNewPassword" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M1 1l22 22" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                  </button>
                </div>
                <span *ngIf="pwForm.hasError('passwordMismatch') && pwForm.get('confirmNewPassword')?.touched" class="err-small">Parolele nu coincid.</span>
              </div>

              <div *ngIf="pwError" class="alert-error">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 1L15 15H1L8 1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 6v4M8 12v.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                {{ pwError }}
              </div>

              <button type="submit" class="btn-primary" [disabled]="pwForm.invalid || pwLoading">
                <span *ngIf="!pwLoading">Actualizeaza parola</span>
                <span *ngIf="pwLoading" class="spin-wrap"><span class="spin"></span>Se salveaza...</span>
              </button>
            </form>
          </section>

          <!-- Danger Zone -->
          <section class="card card-danger">
            <div class="section-head">
              <div class="section-icon section-icon-red">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
              </div>
              <div>
                <div class="eyebrow eyebrow-red">ZONA PERICULOASA</div>
                <h2 class="section-title">Sterge contul</h2>
              </div>
            </div>
            <p class="danger-desc">Stergerea contului este <strong>ireversibila</strong>. Toate jocurile, personajele si dispozitivele asociate vor fi sterse permanent.</p>

            <!-- Confirm box (appears after click) -->
            <div *ngIf="confirmDelete" class="confirm-box">
              <p class="confirm-msg">Esti sigur? Scrie <strong>STERGE</strong> pentru a confirma:</p>
              <input class="inp" [(ngModel)]="deleteConfirmText" placeholder="STERGE" [ngModelOptions]="{standalone: true}"/>
              <div class="confirm-acts">
                <button class="btn-ghost" (click)="confirmDelete = false; deleteConfirmText = ''">Anuleaza</button>
                <button class="btn-danger" [disabled]="deleteConfirmText !== 'STERGE' || deleteLoading" (click)="deleteAccount()">
                  <span *ngIf="!deleteLoading">Sterge definitiv</span>
                  <span *ngIf="deleteLoading" class="spin-wrap"><span class="spin spin-red"></span>Se sterge...</span>
                </button>
              </div>
            </div>

            <button *ngIf="!confirmDelete" class="btn-danger-outline" (click)="confirmDelete = true">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 6h10M6 6V4h4v2M13 6l-.8 8H3.8L3 6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Sterge contul meu
            </button>
          </section>

        </div>
      </main>
    </div>
  `,
  styles: [`
    :host{display:block}*{box-sizing:border-box;margin:0;padding:0}
    .page{--bg:#f5f2ec;--surface:#fff;--border:rgba(0,0,0,0.07);--border-md:rgba(0,0,0,0.11);--amber:#b87208;--navy:#1c2b4a;--ink:#1a1610;--ink2:rgba(26,22,16,0.55);--ink3:rgba(26,22,16,0.28);--red:#9b2020;--green:#2d7a3a;min-height:100vh;background:var(--bg);font-family:'Inter',sans-serif;color:var(--ink);}
    /* Navbar */
    .navbar{position:sticky;top:0;z-index:100;height:54px;background:rgba(245,242,236,0.88);backdrop-filter:blur(20px);border-bottom:1px solid var(--border-md);}
    .nav-inner{max-width:860px;margin:0 auto;padding:0 24px;height:100%;display:flex;align-items:center;gap:16px;}
    .nav-back{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:500;color:var(--ink2);text-decoration:none;border:1px solid var(--border-md);border-radius:7px;padding:5px 11px;transition:color .15s,border-color .15s;}
    .nav-back:hover{color:var(--ink);border-color:rgba(0,0,0,0.2);}
    .nav-logo{display:flex;align-items:center;}
    .logo-img{height:44px;width:44px;object-fit:contain;display:block;}
    .nav-spacer{width:80px;}
    /* Layout */
    .main{padding:40px 24px;}
    .content{max-width:600px;margin:0 auto;display:flex;flex-direction:column;gap:20px;}
    /* Cards */
    .card{background:var(--surface);border:1px solid var(--border-md);border-radius:14px;padding:28px;position:relative;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.05);animation:fadeUp .45s ease both;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    .card:nth-child(2){animation-delay:.07s}
    .card:nth-child(3){animation-delay:.14s}
    .card-top-line{position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(184,114,8,0.45),transparent);}
    .card-danger{border-color:rgba(155,32,32,0.18);background:rgba(255,253,251,1);}
    .card-danger .card-top-line{background:linear-gradient(90deg,transparent,rgba(155,32,32,0.4),transparent);}
    /* Section head */
    .section-head{display:flex;align-items:center;gap:12px;margin-bottom:22px;}
    .section-icon{width:34px;height:34px;border:1px solid var(--border-md);border-radius:8px;background:rgba(184,114,8,0.05);display:flex;align-items:center;justify-content:center;color:var(--amber);flex-shrink:0;}
    .section-icon-red{background:rgba(155,32,32,0.05);color:var(--red);border-color:rgba(155,32,32,0.15);}
    .eyebrow{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--amber);margin-bottom:3px;}
    .eyebrow-red{color:var(--red);}
    .section-title{font-family:'Playfair Display',serif;font-size:18px;font-weight:600;color:var(--ink);}
    /* Info grid */
    .info-grid{display:flex;flex-direction:column;gap:0;}
    .info-row{display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--border);}
    .info-row:last-child{border-bottom:none;}
    .info-lbl{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--ink3);}
    .info-val{font-size:13.5px;color:var(--ink);font-weight:500;}
    .role-badge{display:inline-flex;align-items:center;padding:2px 9px;background:rgba(28,43,74,0.06);border:1px solid rgba(28,43,74,0.15);border-radius:20px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;color:var(--navy);letter-spacing:1px;}
    /* Form */
    .form{display:flex;flex-direction:column;gap:14px;}
    .field{display:flex;flex-direction:column;gap:6px;}
    .lbl{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--amber);}
    .inp{padding:10px 13px;border:1px solid var(--border-md);border-radius:8px;background:var(--bg);color:var(--ink);font-size:14px;outline:none;transition:border-color .2s,box-shadow .2s;font-family:'Inter',sans-serif;width:100%;}
    .inp-wrap{position:relative;display:flex;align-items:center;}
    .inp-wrap .inp{padding-right:38px;}
    .inp:focus{border-color:rgba(184,114,8,0.5);box-shadow:0 0 0 3px rgba(184,114,8,0.07);}
    .eye-btn{position:absolute;right:10px;background:transparent;border:none;cursor:pointer;color:var(--ink3);padding:4px;display:flex;align-items:center;transition:color .15s;}
    .eye-btn:hover{color:var(--ink2);}
    .err-small{font-size:11.5px;color:var(--red);}
    /* Strength */
    .strength-wrap{margin-top:4px;}
    .strength-row{display:flex;align-items:center;gap:8px;}
    .strength-segs{display:flex;gap:3px;flex:1;}
    .seg{height:4px;flex:1;border-radius:99px;background:rgba(0,0,0,0.08);transition:background .35s;}
    .strength-lbl{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;min-width:72px;text-align:right;transition:color .3s;}
    .pw-rules{list-style:none;display:flex;flex-direction:column;gap:3px;padding:8px 0 2px;border-top:1px solid var(--border);margin-top:4px;}
    .pw-rules li{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--ink3);transition:color .2s;}
    .pw-rules li.ok{color:var(--green);}
    .ri{font-family:'JetBrains Mono',monospace;font-size:11px;width:14px;text-align:center;}
    /* Alerts */
    .alert-success{display:flex;align-items:center;gap:8px;padding:10px 13px;border:1px solid rgba(45,122,58,0.25);background:rgba(45,122,58,0.06);border-radius:8px;font-size:13px;color:var(--green);margin-bottom:14px;}
    .alert-error{display:flex;align-items:center;gap:8px;padding:10px 13px;border:1px solid rgba(155,32,32,0.2);background:rgba(155,32,32,0.05);border-radius:7px;font-size:13px;color:var(--red);}
    /* Buttons */
    .btn-primary{width:100%;height:40px;border:none;border-radius:8px;background:var(--navy);color:#fff;font-size:13px;font-family:'Inter',sans-serif;font-weight:500;cursor:pointer;transition:opacity .2s,transform .2s;display:flex;align-items:center;justify-content:center;margin-top:4px;}
    .btn-primary:hover:not(:disabled){opacity:.88;transform:translateY(-1px);}
    .btn-primary:disabled{opacity:.4;cursor:not-allowed;}
    .btn-ghost{height:36px;padding:0 14px;border:1px solid var(--border-md);border-radius:7px;background:transparent;color:var(--ink);font-size:13px;cursor:pointer;transition:border-color .15s;}
    .btn-ghost:hover{border-color:rgba(0,0,0,0.25);}
    .btn-danger-outline{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 16px;border:1px solid rgba(155,32,32,0.35);border-radius:7px;background:transparent;color:var(--red);font-size:13px;font-weight:500;cursor:pointer;transition:background .15s,border-color .15s;}
    .btn-danger-outline:hover{background:rgba(155,32,32,0.05);border-color:rgba(155,32,32,0.55);}
    .btn-danger{height:36px;padding:0 16px;border:none;border-radius:7px;background:var(--red);color:#fff;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:opacity .2s;}
    .btn-danger:disabled{opacity:.4;cursor:not-allowed;}
    .btn-danger:hover:not(:disabled){opacity:.88;}
    /* Spin */
    .spin-wrap{display:flex;align-items:center;gap:7px;}
    .spin{width:13px;height:13px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block;}
    .spin-red{border-color:rgba(155,32,32,0.2);border-top-color:var(--red);}
    @keyframes spin{to{transform:rotate(360deg)}}
    /* Danger zone */
    .danger-desc{font-size:13px;color:var(--ink2);line-height:1.65;margin-bottom:18px;}
    .danger-desc strong{color:var(--red);}
    .confirm-box{background:rgba(155,32,32,0.04);border:1px solid rgba(155,32,32,0.15);border-radius:8px;padding:16px;display:flex;flex-direction:column;gap:12px;margin-bottom:0;}
    .confirm-msg{font-size:13px;color:var(--ink2);line-height:1.5;}
    .confirm-acts{display:flex;gap:8px;justify-content:flex-end;}
  `]
})
export class ProfileComponent implements OnInit {
  // User info
  userName = '';
  userEmail = '';
  createdAt = '';

  // Change password
  pwForm: FormGroup;
  pwLoading = false;
  pwError = '';
  pwSuccess = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmNewPassword = false;

  // Delete account
  confirmDelete = false;
  deleteConfirmText = '';
  deleteLoading = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {
    const user = this.authService.currentUserValue;
    this.userEmail = user?.email || '';
    this.userName = `${(user as any)?.firstName || ''} ${(user as any)?.lastName || ''}`.trim() || this.userEmail;

    this.pwForm = this.fb.group({
      currentPassword:  ['', Validators.required],
      newPassword:      ['', [Validators.required, hardRulesValidator]],
      confirmNewPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });
  }

  ngOnInit() {
    // Decode JWT to get createdAt if available, else show today
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const iat = payload.iat ? new Date(payload.iat * 1000) : new Date();
        this.createdAt = iat.toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' });
      } catch { this.createdAt = 'a€”'; }
    }
  }

  // a”€a”€ Strength helpers a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€
  get newPwValue(): string { return this.pwForm.get('newPassword')?.value ?? ''; }
  get newPwErrors(): Record<string, boolean> { return (this.pwForm.get('newPassword')?.errors as Record<string, boolean>) ?? {}; }
  private get _zx() { return this.newPwValue ? zxcvbn(this.newPwValue) : null; }
  get strengthScore(): number { return this._zx?.score ?? 0; }
  get strengthColor(): string { return ['#c0392b','#e67e22','#f39c12','#27ae60','#2ecc71'][this.strengthScore]; }
  get strengthLabel(): string { return ['Foarte slaba','Slaba','Acceptabila','Buna','Excelenta'][this.strengthScore]; }

  // a”€a”€ Change password a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€
  async changePassword() {
    if (this.pwForm.invalid) return;
    this.pwLoading = true;
    this.pwError = '';
    this.pwSuccess = false;
    const token = localStorage.getItem('auth_token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    try {
      await this.http.post(`${environment.apiUrl}/api/auth/change-password`, {
        currentPassword: this.pwForm.value.currentPassword,
        newPassword: this.pwForm.value.newPassword
      }, { headers }).toPromise();
      this.pwSuccess = true;
      this.pwForm.reset();
    } catch (err: any) {
      this.pwError = err.error?.message || 'A aparut o eroare. Incearca din nou.';
    } finally {
      this.pwLoading = false;
    }
  }

  // a”€a”€ Delete account a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€
  async deleteAccount() {
    if (this.deleteConfirmText !== 'STERGE') return;
    this.deleteLoading = true;
    const token = localStorage.getItem('auth_token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    try {
      await this.http.delete(`${environment.apiUrl}/api/auth/account`, { headers }).toPromise();
      this.authService.logout();
      this.router.navigate(['/login']);
    } catch (err: any) {
      alert(err.error?.message || 'Stergerea a esuat. Incearca din nou.');
      this.deleteLoading = false;
    }
  }
}



