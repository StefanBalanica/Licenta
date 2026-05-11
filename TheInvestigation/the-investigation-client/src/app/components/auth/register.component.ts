import { Component, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { debounceTime, distinctUntilChanged, switchMap, map, catchError, first } from 'rxjs/operators';
import { of, timer } from 'rxjs';
import zxcvbn from 'zxcvbn';

// a”€a”€ Hard rules (field-level) a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€
function hardRulesValidator(control: AbstractControl): ValidationErrors | null {
  const v: string = control.value ?? '';
  if (!v) return null;
  const e: Record<string, boolean> = {};
  if (v.length < 8) e['minLength'] = true;
  if (!/[A-Z]/.test(v)) e['uppercase'] = true;
  if (!/[a-z]/.test(v)) e['lowercase'] = true;
  if (!/[0-9]/.test(v)) e['digit'] = true;
  if (!/[!@#$%^&*()\-_=+\[\]{}|;:'",.<>?/\\`~]/.test(v)) e['special'] = true;
  return Object.keys(e).length ? e : null;
}

// a”€a”€ zxcvbn cross-field validator (form-level) a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€
function zxcvbnGroupValidator(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value ?? '';
  if (!pw) return null;
  const hardErrors = group.get('password')?.errors;
  const hardFailed = hardErrors && ['minLength', 'uppercase', 'lowercase', 'digit', 'special'].some(k => hardErrors[k]);
  if (hardFailed) return null;
  const inputs = [group.get('firstName')?.value, group.get('lastName')?.value, group.get('email')?.value].filter(Boolean);
  const result = zxcvbn(pw, inputs);
  return result.score < 2 ? { zxcvbnWeak: true } : null;
}

// a”€a”€ Password match validator (form-level) a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€
function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value ?? '';
  const cpw = group.get('confirmPassword')?.value ?? '';
  return cpw && pw !== cpw ? { passwordMismatch: true } : null;
}

// a”€a”€ Feedback translations a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€
const WARN_RO: Record<string, string> = {
  'This is a top-10 common password': 'Aceasta este printre cele mai comune 10 parole',
  'This is a top-100 common password': 'Aceasta este printre cele mai comune 100 parole',
  'This is a very common password': 'Parola foarte comuna',
  'This is similar to a commonly used password': 'Similara cu o parola des utilizata',
  "Straight rows of keys are easy to guess": 'Model de tastatura usor de ghicit',
  "Short keyboard patterns are easy to guess": 'Model scurt de tastatura',
  'Sequences like abc or 6543 are easy to guess': 'SecvenTe simple, usor de ghicit',
  'Repeats like "abcabc" are only slightly harder to guess than "abc"': 'RepetiTiile sunt usor de ghicit',
  'Recent years are easy to guess': 'Ani recenTi, usor de ghicit',
  'Dates are often easy to guess': 'Datele sunt usor de ghicit',
  'A word by itself is easy to guess': 'Un singur cuvant, usor de ghicit',
  'Names and surnames by themselves are easy to guess': 'Numele si prenumele sunt usor de ghicit',
  'Common names and surnames are easy to guess': 'Nume comune, usor de ghicit',
};
const SUGG_RO: Record<string, string> = {
  'Add another word or two. Uncommon words are better.': 'Adauga un cuvant sau doua. Cuvintele neobisnuite sunt mai bune.',
  'Use a longer keyboard pattern with more turns': 'Foloseste un model mai lung pe tastatura, cu mai multe schimbari de direcTie.',
  'Avoid repeated words and characters': 'Evita cuvintele si caracterele repetate.',
  'Avoid sequences': 'Evita secvenTele (abc, 123).',
  'Avoid recent years': 'Evita anii recenTi.',
  'Avoid years that are associated with you': 'Evita ani asociaTi cu tine.',
  'Avoid dates and years that are associated with you': 'Evita datele si anii asociaTi cu tine.',
  "Capitalization doesn't help very much": 'Majusculele singure nu ajuta prea mult.',
  "Reversed words aren't much harder to guess": 'Cuvintele inversate nu sunt mult mai sigure.',
  "Predictable substitutions like '@' instead of 'a' don't help very much": 'SubstituTiile predictibile (ex. @ in loc de a) nu ajuta prea mult.',
};
const tr = (map: Record<string, string>, s: string) => map[s] ?? s;

@Component({
  selector: 'app-register',
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
            <span class="divider-lbl">DOSAR NOU</span>
          </div>

          <h1 class="card-title">Creeaza cont</h1>
          <p class="card-sub">Completeaza formularul pentru a accesa platforma.</p>

          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="form">
            <div class="form-row">
              <div class="field" [class.field-err]="registerForm.get('firstName')?.invalid && registerForm.get('firstName')?.touched">
                <label class="lbl">PRENUME</label>
                <input class="inp" type="text" formControlName="firstName" placeholder="Ion"/>
                <span *ngIf="registerForm.get('firstName')?.invalid && registerForm.get('firstName')?.touched" class="err-msg">Camp obligatoriu.</span>
              </div>
              <div class="field" [class.field-err]="registerForm.get('lastName')?.invalid && registerForm.get('lastName')?.touched">
                <label class="lbl">NUME</label>
                <input class="inp" type="text" formControlName="lastName" placeholder="Popescu"/>
                <span *ngIf="registerForm.get('lastName')?.invalid && registerForm.get('lastName')?.touched" class="err-msg">Camp obligatoriu.</span>
              </div>
            </div>

            <div class="field" [class.field-err]="registerForm.get('email')?.invalid && registerForm.get('email')?.touched">
              <label class="lbl">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.2"/><path d="M1 5l7 5 7-5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                EMAIL
              </label>
              <div class="inp-wrap">
                <input class="inp" type="email" formControlName="email" placeholder="investigator&#64;politie.ro"/>
                <span class="inp-status" *ngIf="registerForm.get('email')?.value">
                  <span *ngIf="registerForm.get('email')?.pending" class="status-spin"></span>
                  <span *ngIf="!registerForm.get('email')?.pending && registerForm.get('email')?.valid" class="status-ok">aœ“</span>
                  <span *ngIf="!registerForm.get('email')?.pending && registerForm.get('email')?.hasError('emailTaken')" class="status-err">aœ—</span>
                </span>
              </div>
              <span *ngIf="registerForm.get('email')?.hasError('email') && registerForm.get('email')?.touched" class="err-msg">Email invalid.</span>
              <span *ngIf="registerForm.get('email')?.hasError('emailTaken') && registerForm.get('email')?.touched" class="err-msg">Email deja inregistrat. <a routerLink="/login">Autentifica-te</a></span>
            </div>

            <div class="field" [class.field-err]="(registerForm.get('password')?.invalid || registerForm.hasError('zxcvbnWeak')) && registerForm.get('password')?.touched">
              <label class="lbl">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="6" width="12" height="9" rx="2" stroke="currentColor" stroke-width="1.2"/><path d="M5 6V4.5a3 3 0 1 1 6 0V6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                PAROLA
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
                <ul class="pw-suggestions" *ngIf="zxcvbnSuggestions.length > 0">
                  <li *ngFor="let s of zxcvbnSuggestions">{{ s }}</li>
                </ul>
              </div>

              <!-- Hard rules checklist -->
              <ul class="pw-rules" *ngIf="registerForm.get('password')?.touched || pwValue.length > 0">
                <li [class.ok]="!pwErrors['minLength']"><span class="ri">{{ !pwErrors['minLength'] ? '▪️' : '' }}</span> Minimum 8 caractere</li>
                <li [class.ok]="!pwErrors['uppercase']"><span class="ri">{{ !pwErrors['uppercase'] ? '▪️' : '' }}</span> Cel puTin o litera mare (A-Z)</li>
                <li [class.ok]="!pwErrors['lowercase']"><span class="ri">{{ !pwErrors['lowercase'] ? '▪️' : '' }}</span> Cel puTin o litera mica (a-z)</li>
                <li [class.ok]="!pwErrors['digit']"><span class="ri">{{ !pwErrors['digit'] ? '▪️' : '' }}</span> Cel puTin o cifra (0-9)</li>
                <li [class.ok]="!pwErrors['special']"><span class="ri">{{ !pwErrors['special'] ? '▪️' : '' }}</span> Cel puTin un caracter special (!&#64;#$%^&amp;*)</li>
              </ul>
            </div>

            <!-- Confirm password -->
            <div class="field" [class.field-err]="registerForm.hasError('passwordMismatch') && registerForm.get('confirmPassword')?.touched">
              <label class="lbl">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="6" width="12" height="9" rx="2" stroke="currentColor" stroke-width="1.2"/><path d="M5 6V4.5a3 3 0 1 1 6 0V6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M7 10l2 2 4-4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                CONFIRMA PAROLA
              </label>
              <div class="inp-wrap">
                <input class="inp" [type]="showConfirmPassword ? 'text' : 'password'" formControlName="confirmPassword" placeholder="repeta parola" autocomplete="new-password"/>
                <button type="button" class="eye-btn" (click)="showConfirmPassword = !showConfirmPassword" tabindex="-1">
                  <svg *ngIf="!showConfirmPassword" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.4"/></svg>
                  <svg *ngIf="showConfirmPassword" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M1 1l22 22" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                </button>
              </div>
              <span *ngIf="registerForm.hasError('passwordMismatch') && registerForm.get('confirmPassword')?.touched" class="err-msg">Parolele nu coincid.</span>
            </div>

            <div *ngIf="errorMessage" class="error-banner">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1L15 15H1L8 1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 6v4M8 12v.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
              {{ errorMessage }}
            </div>

            <button type="submit" class="btn-submit" [disabled]="registerForm.invalid || registerForm.pending || loading">
              <span *ngIf="!loading">Creeaza cont</span>
              <span *ngIf="loading" class="spin-wrap"><span class="spin"></span>Se creeaza...</span>
            </button>
          </form>

          <p class="footer-link">Ai deja cont? <a routerLink="/login">Autentifica-te</a></p>
          <div class="stamp">RECRUIT</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host{display:block}*{box-sizing:border-box;margin:0;padding:0}

    .page{
      --bg:#fcfaf7;--surface:#fff;--border:rgba(0,0,0,0.07);--border-md:rgba(0,0,0,0.11);
      --amber:#d43f33;--navy:#1a1a1a;--ink:#1a1a1a;--ink2:rgba(26,22,16,0.45);--ink3:rgba(26,22,16,0.22);--red:#9b2020;
      min-height:100vh;background:var(--bg);position:relative;font-family:'Public Sans',sans-serif;
    }
    .bg-canvas{position:fixed;inset:0;z-index:0;pointer-events:none;}
    .scene{position:relative;z-index:1;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px 20px;}

    .card{position:relative;width:100%;max-width:480px;background:var(--surface);border:1px solid var(--border-md);border-radius:14px;padding:36px 36px 32px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);animation:fadeUp .55s ease both;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
    .card-top-line{position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(184,114,8,0.55),transparent);}

    .brand{display:flex;align-items:center;justify-content:center;margin-bottom:18px;}
    .logo-img{width:130px;height:130px;object-fit:contain;display:block;margin:0 auto;}
    .card-divider{position:relative;height:1px;background:linear-gradient(90deg,transparent,var(--border-md),transparent);margin-bottom:24px;}
    .divider-lbl{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--surface);padding:0 10px;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--amber);white-space:nowrap;}
    .card-title{font-family:'Crimson Pro',serif;font-size:26px;font-weight:400;color:var(--ink);margin-bottom:6px;text-align:center;}
    .card-sub{font-size:13px;color:var(--ink2);font-style:italic;margin-bottom:26px;line-height:1.5;text-align:center;}

    .form{display:flex;flex-direction:column;gap:14px;}
    .form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    .field{display:flex;flex-direction:column;gap:5px;}
    .lbl{display:flex;align-items:center;gap:6px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--amber);}
    .inp{padding:11px 13px;border:1px solid var(--border-md);border-radius:8px;background:var(--bg);color:var(--ink);font-size:14px;font-family:'Public Sans',sans-serif;outline:none;transition:border-color .2s,box-shadow .2s;}
    .inp::placeholder{color:var(--ink3);font-style:italic;}
    .inp:focus{border-color:rgba(184,114,8,0.5);box-shadow:0 0 0 3px rgba(212,63,51,0.07);}
    .field-err .inp{border-color:rgba(155,32,32,0.4);}
    .err-msg{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--red);}
    .error-banner{display:flex;align-items:center;gap:8px;padding:10px 13px;border:1px solid rgba(155,32,32,0.2);background:rgba(155,32,32,0.05);border-radius:7px;font-size:13px;color:var(--red);}
    .btn-submit{width:100%;height:42px;border:none;border-radius:8px;background:var(--navy);color:#fff;font-size:13.5px;font-family:'Public Sans',sans-serif;font-weight:500;cursor:pointer;transition:opacity .2s,transform .2s;margin-top:4px;display:flex;align-items:center;justify-content:center;}
    .btn-submit:hover:not(:disabled){opacity:.88;transform:translateY(-1px);}
    .btn-submit:disabled{opacity:.4;cursor:not-allowed;}
    .spin-wrap{display:flex;align-items:center;gap:8px;}
    .spin{width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block;}
    @keyframes spin{to{transform:rotate(360deg)}}
    .footer-link{margin-top:20px;text-align:center;font-size:13px;color:var(--ink2);}
    .footer-link a{color:var(--amber);text-decoration:none;font-weight:500;margin-left:4px;border-bottom:1px solid rgba(184,114,8,0.3);padding-bottom:1px;transition:border-color .15s;}
    .footer-link a:hover{border-color:var(--amber);}
    .stamp{position:absolute;bottom:14px;right:16px;font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:500;letter-spacing:3px;text-transform:uppercase;color:rgba(28,43,74,0.2);border:1px solid rgba(28,43,74,0.15);padding:2px 7px;border-radius:2px;transform:rotate(7deg);}

    .inp-wrap{position:relative;display:flex;align-items:center;}
    .inp-wrap .inp{flex:1;padding-right:34px;}
    .inp-status{position:absolute;right:11px;font-size:14px;line-height:1;}
    .status-spin{display:inline-block;width:13px;height:13px;border:2px solid rgba(0,0,0,0.1);border-top-color:var(--amber);border-radius:50%;animation:spin .6s linear infinite;}
    .status-ok{color:#2d7a3a;font-size:15px;}
    .status-err{color:var(--red);font-size:15px;}
    .err-msg a{color:var(--amber);text-decoration:none;border-bottom:1px solid rgba(184,114,8,0.4);}
    /* a”€a”€ Eye toggle a”€a”€ */
    .eye-btn{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:transparent;border:none;cursor:pointer;color:var(--ink3);padding:4px;display:flex;align-items:center;transition:color .15s;}
    .eye-btn:hover{color:var(--ink2);}
    .strength-wrap{margin-top:6px;display:flex;flex-direction:column;gap:4px;}
    .strength-row{display:flex;align-items:center;gap:8px;}
    .strength-segs{display:flex;gap:3px;flex:1;}
    .seg{height:4px;flex:1;border-radius:99px;background:rgba(0,0,0,0.08);transition:background .35s;}
    .strength-lbl{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;white-space:nowrap;transition:color .3s;min-width:80px;text-align:right;}
    .pw-warning{display:flex;align-items:center;gap:5px;font-size:11.5px;color:#c06010;font-style:italic;}
    .pw-suggestions{list-style:none;padding-left:4px;display:flex;flex-direction:column;gap:2px;}
    .pw-suggestions li::before{content:'>';position:absolute;left:0;color:var(--ink3);}
    .pw-suggestions li::before{content:'▪️';position:absolute;left:0;color:var(--ink3);}
    /* a”€a”€ Hard rules checklist a”€a”€ */
    .pw-rules{list-style:none;display:flex;flex-direction:column;gap:3px;padding:8px 0 2px;border-top:1px solid var(--border);margin-top:4px;}
    .pw-rules li{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--ink3);transition:color .2s;}
    .pw-rules li.ok{color:#2d7a3a;}
    .ri{font-family:'JetBrains Mono',monospace;font-size:11px;width:14px;text-align:center;}
  `]
})
export class RegisterComponent implements AfterViewInit, OnDestroy {
  @ViewChild('bgCvs') canvasRef!: ElementRef<HTMLCanvasElement>;
  registerForm: FormGroup;
  loading = false;
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;
  private cleanup?: () => void;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router, private http: HttpClient) {
    this.registerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email], [this.emailAvailabilityValidator.bind(this)]],
      password: ['', [Validators.required, hardRulesValidator]],
      confirmPassword: ['', Validators.required]
    }, { validators: [zxcvbnGroupValidator, passwordMatchValidator] });
  }

  // a”€a”€ Async email validator a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€

  emailAvailabilityValidator(control: AbstractControl) {
    if (!control.value || control.hasError('email')) return of(null);
    return timer(600).pipe(
      switchMap(() =>
        this.http.get<{ exists: boolean }>(`${environment.apiUrl}/api/auth/check-email?email=${encodeURIComponent(control.value)}`).pipe(
          map(res => res.exists ? { emailTaken: true } : null),
          catchError(() => of(null))
        )
      ),
      first()
    );
  }

  // a”€a”€ Password strength helpers a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€

  get pwValue(): string { return this.registerForm.get('password')?.value ?? ''; }

  get pwErrors(): Record<string, boolean> {
    return (this.registerForm.get('password')?.errors as Record<string, boolean>) ?? {};
  }

  get strengthScore(): number {
    const z = this._zxcvbn;
    return z ? z.score : 0; // 0-4
  }

  get strengthColor(): string {
    return ['#c0392b', '#e67e22', '#f39c12', '#27ae60', '#2ecc71'][this.strengthScore] ?? '#c0392b';
  }

  get strengthLabel(): string {
    return ['Foarte slaba', 'Slaba', 'Acceptabila', 'Buna', 'Excelenta'][this.strengthScore] ?? 'Foarte slaba';
  }

  private get _zxcvbn() {
    if (!this.pwValue) return null;
    const inputs = [
      this.registerForm.get('firstName')?.value,
      this.registerForm.get('lastName')?.value,
      this.registerForm.get('email')?.value
    ].filter(Boolean);
    return zxcvbn(this.pwValue, inputs);
  }

  get zxcvbnWarning(): string {
    const w = this._zxcvbn?.feedback?.warning ?? '';
    return w ? tr(WARN_RO, w) : '';
  }

  get zxcvbnSuggestions(): string[] {
    return (this._zxcvbn?.feedback?.suggestions ?? []).map(s => tr(SUGG_RO, s));
  }

  // a”€a”€ Lifecycle & submit a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€a”€

  ngAfterViewInit() { this.cleanup = this.initCanvas(this.canvasRef.nativeElement); }
  ngOnDestroy() { this.cleanup?.(); }

  async onSubmit() {
    if (this.registerForm.invalid) return;
    this.loading = true; this.errorMessage = '';
    try {
      await this.authService.register(this.registerForm.value).toPromise();
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage = error.error?.message || 'Inregistrarea a esuat. Incearca din nou.';
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



