import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { GameService } from '../../services/game.service';
import { CharacterService } from '../../services/character.service';
import { DeviceService } from '../../services/device.service';
import { Game, Character, DigitalDevice } from '../../models/models';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { createDeviceSlug } from '../../utils/slug.util';

interface UploadTarget {
  appId: number;
  appType: 'Photos' | 'Files' | 'Calls' | 'Phone';
  fileName: string;
  allowedTypes: string;
  sizeHint: string;
}

@Component({
  selector: 'app-game-details',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="details-container">
      <canvas #bgCvs class="bg-canvas"></canvas>

      <div class="fixed-logo-wrap"><img src="assets/logo_final.svg" class="fixed-logo-img" alt=""></div>
      <!-- Navbar -->
      <nav class="nb">
        <div class="nb-inner">
          <button class="btn-back" routerLink="/dashboard">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Dashboard
          </button>
          <div class="nb-title-wrap">
            <span class="nb-case">{{  game ? 'DOSAR — ' + game.title : 'DETALII DOSAR' }}</span>
            <span class="nb-badge" [class.badge-pub]="game?.isPublished" [class.badge-draft]="!game?.isPublished">
              {{ game?.isPublished ? 'PUBLICAT' : 'DRAFT' }}
            </span>
          </div>
          <button class="btn-edit" [routerLink]="['/games', gameId, 'edit']">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-9 9H2v-3L11 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
            Editeaza
          </button>
        </div>
      </nav>

      <!-- Tabs -->
      <div class="tabs-bar">
        <div class="tabs-inner">
          <button class="tab-pill" [class.tab-active]="activeTab === 'overview'" (click)="activeTab = 'overview'">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M5 6h6M5 9h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
            Prezentare
          </button>
          <button class="tab-pill" [class.tab-active]="activeTab === 'characters'" (click)="activeTab = 'characters'">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="3" stroke="currentColor" stroke-width="1.3"/><path d="M2 15c0-2.7 2.7-4.5 6-4.5s6 1.8 6 4.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
            Personaje <span class="tab-count">{{ characters.length }}</span>
          </button>
          <button class="tab-pill" [class.tab-active]="activeTab === 'devices'" (click)="activeTab = 'devices'">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><rect x="3" y="1" width="10" height="14" rx="2" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="11" r="1" fill="currentColor"/></svg>
            Dispozitive <span class="tab-count">{{ suspectDevices.length }}</span>
          </button>
          <button class="tab-pill tab-pill-special" [class.tab-active]="activeTab === 'investigator'" (click)="activeTab = 'investigator'">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="3" stroke="currentColor" stroke-width="1.3"/><path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M12 2l1.5 1.5L11 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Dispozitivele Anchetatorului <span class="tab-count tab-count-inv">{{ investigatorDevices.length }}</span>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="details-content">
        <!-- Overview Tab -->
        <div *ngIf="activeTab === 'overview'" class="tab-content">
          <div class="ov-card">
            <div class="ov-card-top"></div>
            <div class="ov-label">NARATIUNEA CAZULUI</div>
            <h3 class="ov-title">Povestea</h3>
            <p class="ov-body">{{ game?.story }}</p>
          </div>
          <div class="ov-card ov-solution">
            <div class="ov-card-top"></div>
            <div class="solution-badge-sm">GAME MASTER</div>
            <div class="ov-label">SOLUTIA</div>
            <h3 class="ov-title">Rezolvarea cazului</h3>
            <p class="ov-body">{{ game?.solution }}</p>
          </div>
        </div>

        <!-- Characters Tab -->
        <div *ngIf="activeTab === 'characters'" class="tab-content">
          <div class="sec-head">
            <div>
              <div class="eyebrow">DOSARUL CAZULUI</div>
              <h2 class="sec-title">Personaje &amp; Suspecti</h2>
            </div>
            <button class="btn-primary" (click)="showCharacterForm = true" *ngIf="!showCharacterForm">
              + Personaj nou
            </button>
          </div>

          <!-- Add Character Form -->
          <div *ngIf="showCharacterForm" class="character-form">
            <h3>{{ editingCharacter ? 'Edit Character' : 'New Character' }}</h3>
            <form [formGroup]="characterForm">
              <div class="form-row">
                <div class="form-group">
                  <label>Name *</label>
                  <input type="text" formControlName="name" placeholder="James Morrison">
                </div>
                <div class="form-group">
                  <label>Role *</label>
                  <select formControlName="role">
                    <option value="Victim">Victim</option>
                    <option value="Suspect">Suspect</option>
                    <option value="Witness">Witness</option>
                    <option value="Investigator">Investigator</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Description</label>
                <textarea formControlName="description" rows="2" placeholder="Physical appearance and personality..."></textarea>
              </div>

              <div class="form-group">
                <label>Backstory</label>
                <textarea formControlName="backstory" rows="3" placeholder="Their history and relationship to the victim..."></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Motive</label>
                  <textarea formControlName="motive" rows="2" placeholder="Why they might have done it..."></textarea>
                </div>
                <div class="form-group">
                  <label>Alibi</label>
                  <textarea formControlName="alibi" rows="2" placeholder="Where they claim to have been..."></textarea>
                </div>
              </div>

              <div class="form-actions">
                <button type="button" class="btn-secondary" (click)="cancelCharacterForm()">Cancel</button>
                <button type="button" class="btn-primary" (click)="saveCharacter()" [disabled]="characterForm.invalid">
                  {{ editingCharacter ? 'Update' : 'Add' }} Character
                </button>
              </div>
            </form>
          </div>

          <!-- Characters List -->
          <div class="characters-grid">
            <div *ngFor="let character of characters" class="character-card">
              <div class="character-header">
                <h3>{{ character.name }}</h3>
                <span class="character-role">{{ character.role }}</span>
              </div>
              <p class="character-description">{{ character.description }}</p>
              <div class="character-details">
                <div class="detail" *ngIf="character.backstory">
                  <strong>Poveste:</strong> {{ character.backstory }}
                </div>
                <div class="detail" *ngIf="character.motive">
                  <strong>Motiv:</strong> {{ character.motive }}
                </div>
                <div class="detail" *ngIf="character.alibi">
                  <strong>Alibi:</strong> {{ character.alibi }}
                </div>
              </div>
              <div class="character-actions">
                <button class="btn-icon" (click)="editCharacter(character)">✏️</button>
                <button class="btn-icon" (click)="deleteCharacter(character.characterId)">🗑️</button>
                <button class="btn-action-outline btn-character-photo" (click)="triggerCharacterPhotoUpload(character.characterId)">
                  📷 Incarca poza
                </button>
                <button class="btn-action-outline btn-character-pdf" (click)="generateCharacterProfilePdf(character)" [disabled]="isGeneratingCharacterPdf[character.characterId]">
                  {{ isGeneratingCharacterPdf[character.characterId] ? 'Generez...' : 'Genereaza profil PDF' }}
                </button>
              </div>
              <div class="character-photo-warning" *ngIf="!characterPhotos[character.characterId]">
                Inainte de generare, incarca poza personajului.
              </div>
              <div class="character-photo-ready" *ngIf="characterPhotos[character.characterId]">
                Poza selectata: {{ characterPhotos[character.characterId].name }}
              </div>
              <input
                [id]="'character-photo-' + character.characterId"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                style="display:none"
                (change)="onCharacterPhotoSelected(character.characterId, $event)"
              />
            </div>
          </div>

          <div *ngIf="characters.length === 0 && !showCharacterForm" class="empty-state">
            <div class="empty-icon">👥</div>
            <h3>No characters yet</h3>
            <p>Add suspects, witnesses, and investigators to your mystery</p>
          </div>
        </div>

        <!-- Devices Tab -->
        <div *ngIf="activeTab === 'devices'" class="tab-content">
          <div class="sec-head">
            <div>
              <div class="eyebrow">DOVEZI DIGITALE</div>
              <h2 class="sec-title">Dispozitive</h2>
            </div>
            <button class="btn-primary" (click)="showDeviceForm = true">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
              Dispozitiv nou
            </button>
          </div>

          <!-- Devices List - suspect devices only -->
          <div class="inv-devices-grid">
            <div *ngFor="let device of suspectDevices" class="sus-device-card">
              <div class="sus-card-top-line"></div>
              <div class="sus-owner-badge">{{ device.ownerName }}</div>
              <div class="inv-device-icon">
                {{ getDeviceIcon(device.deviceType) }}
              </div>
              <div class="inv-device-type">{{ device.deviceType }}</div>
              <div class="inv-device-desc">Device simulator for {{ device.ownerName }}</div>
              <div class="sus-card-meta">
                <span class="sus-meta-pill">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><rect x="3" y="1" width="10" height="14" rx="2" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="11" r="1" fill="currentColor"/></svg>
                  {{ device.deviceType }}
                </span>
                <span class="sus-meta-pill">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M5 3V2a3 3 0 0 1 6 0v1" stroke="currentColor" stroke-width="1.3"/></svg>
                  {{ formatDate(device.createdAt) }}
                </span>
              </div>
              <div *ngIf="deviceUploadRequirements[device.deviceId]?.length" class="sus-upload-notice">
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 3v7M5 6l3-3 3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 12h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                {{ deviceUploadRequirements[device.deviceId].join(' | ') }}
              </div>
              <!-- hidden file input -->
              <input
                *ngIf="deviceUploadTargets[device.deviceId]?.length"
                [id]="'device-upload-' + device.deviceId"
                type="file"
                style="display:none"
                [accept]="getDeviceUploadAccept(device.deviceId)"
                (change)="onDeviceUploadSelected(device.deviceId, $event)"
              />
              <div class="sus-card-actions">
                <button class="btn-primary" style="width:100%" [routerLink]="['/games', gameId, 'devices', createDeviceSlug(device.deviceType, device.ownerName), 'simulator']">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2l6 4v4l-6 4-6-4V6l6-4z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
                  Deschide {{ device.deviceType }}
                </button>
                <button class="btn-secondary" style="margin-top:6px;width:100%" (click)="downloadQRCodePDF(device)">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="10" y="10" width="1.5" height="1.5" fill="currentColor"/><rect x="12.5" y="10" width="1.5" height="1.5" fill="currentColor"/><rect x="10" y="12.5" width="1.5" height="1.5" fill="currentColor"/><rect x="12.5" y="12.5" width="1.5" height="1.5" fill="currentColor"/></svg>
                  QR Code PDF
                </button>
                <button class="btn-action-outline" style="margin-top:6px;width:100%" (click)="configureDeviceApps(device)">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.54 11.54l1.41 1.41M3.05 12.95l1.42-1.42M11.54 4.46l1.41-1.41" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                  Configurare aplicatii
                </button>
                <button class="btn-action-outline" style="margin-top:6px;width:100%" (click)="editDevice(device)">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-9 9H2v-3L11 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
                  Editeaza dispozitiv
                </button>
                <button class="btn-action-danger" style="margin-top:6px;width:100%" (click)="deleteDevice(device.deviceId)">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 5h10M6 5V3h4v2M6 8v5M10 8v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                  Sterge dispozitiv
                </button>
                <button class="btn-action-outline" style="margin-top:6px;width:100%" *ngIf="deviceUploadTargets[device.deviceId]?.length" (click)="triggerDeviceUpload(device.deviceId)">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 3v7M5 6l3-3 3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 12h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                  Incarca fisier (foto/media)
                </button>
                <!-- Audio apeluri: direct button for phones -->
                <div *ngIf="device.deviceType === 'iPhone' || device.deviceType === 'Android'" style="margin-top:6px;">
                  <label class="btn-action-audio" style="width:100%;cursor:pointer;" title="Ncarca MP3 — se atribuie automat apelului corespunzator">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 2h4v9a2 2 0 1 1-4 0V2z" stroke="currentColor" stroke-width="1.2"/><path d="M3 7h2M11 7h2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                    Incarca audio apel (MP3)
                    <input type="file" accept=".mp3,.m4a,.ogg,.wav" style="display:none" (change)="onCardCallAudioUpload(device, $event)">
                  </label>
                  <button class="btn-action-outline" style="margin-top:4px;width:100%;font-size:11.5px;" (click)="configureDeviceAppsOnTab(device, 'calls')">
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.54 11.54l1.41 1.41M3.05 12.95l1.42-1.42M11.54 4.46l1.41-1.41" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                    Gestioneaza apeluri
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="suspectDevices.length === 0" class="empty-state">
            <div class="empty-icon">📱</div>
            <h3>No devices yet</h3>
            <p>Create digital device simulators with messages, photos, and emails</p>
          </div>
        </div>

        <!-- ===== MODAL: Add / Edit Device ===== -->
        <div class="modal-backdrop" *ngIf="showDeviceForm" (click)="cancelDeviceForm()">
          <div class="modal-panel" (click)="$event.stopPropagation()">
            <div class="modal-top-bar"></div>
            <div class="modal-header">
              <div>
                <div class="modal-eyebrow">{{ editingDevice ? 'EDITARE' : 'DISPOZITIV NOU' }}</div>
                <h2 class="modal-title">{{ editingDevice ? 'Editeaza dispozitivul' : 'Adauga dispozitiv' }}</h2>
              </div>
              <button class="modal-close" (click)="cancelDeviceForm()">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
              </button>
            </div>
            <form [formGroup]="deviceForm">
              <div class="form-row">
                <div class="form-group">
                  <label>Tip dispozitiv *</label>
                  <select formControlName="deviceType">
                    <option value="iPhone">📱 iPhone</option>
                    <option value="Android">📱 Android</option>
                    <option value="Laptop">💻 Laptop</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Nume proprietar *</label>
                  <input type="text" formControlName="ownerName" placeholder="Ex: Elodiei Ghinescu">
                </div>
              </div>
              <div class="info-box">
                <p><strong>Nota:</strong> Dupa creare, vei putea adauga aplicatii, mesaje, fotografii si alte continuturi.</p>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-secondary" (click)="cancelDeviceForm()">Anuleaza</button>
                <button type="button" class="btn-primary" (click)="saveDevice()" [disabled]="deviceForm.invalid">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  {{ editingDevice ? 'Actualizeaza' : 'Adauga' }} dispozitiv
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- ===== MODAL: Configure Apps ===== -->
        <div class="modal-backdrop modal-backdrop-wide" *ngIf="configuringDevice" (click)="cancelAppConfig()">
          <div class="modal-panel modal-panel-wide" (click)="$event.stopPropagation()">
            <div class="modal-top-bar"></div>
            <div class="modal-header">
              <div>
                <div class="modal-eyebrow">CONFIGURARE APLICATII</div>
                <h2 class="modal-title">{{ configuringDevice.ownerName }}'s {{ configuringDevice.deviceType }}</h2>
              </div>
              <button class="modal-close" (click)="cancelAppConfig()">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
              </button>
            </div>

            <!-- App Tabs -->
            <div class="app-tabs">
              <button [class.active]="activeAppTab === 'messages'" (click)="activeAppTab = 'messages'" class="app-tab-btn">💬 Messages</button>
              <button [class.active]="activeAppTab === 'photos'" (click)="activeAppTab = 'photos'" class="app-tab-btn">📷 Photos</button>
              <button [class.active]="activeAppTab === 'email'" (click)="activeAppTab = 'email'" class="app-tab-btn">✉️ Email</button>
              <button [class.active]="activeAppTab === 'notes'" (click)="activeAppTab = 'notes'" class="app-tab-btn">📝 Notes</button>
              <button [class.active]="activeAppTab === 'files'" (click)="activeAppTab = 'files'" class="app-tab-btn">📁 Files</button>
              <button [class.active]="activeAppTab === 'calls'" (click)="activeAppTab = 'calls'" class="app-tab-btn">📞 Apeluri</button>
            </div>

            <div class="modal-scrollable">
              <!-- Messages -->
              <div *ngIf="activeAppTab === 'messages'" class="app-config-content">
                <h4>Messages App</h4>
                <div *ngFor="let conv of messagesData; let i = index" class="conversation-item">
                  <div class="conv-header">
                    <strong>Conversation {{ i + 1 }}</strong>
                    <button class="btn-icon" (click)="removeConversation(i)">🗑️</button>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Contact Name</label>
                      <input [(ngModel)]="conv.contact" placeholder="John Doe">
                    </div>
                    <div class="form-group">
                      <label>Avatar (emoji)</label>
                      <input [(ngModel)]="conv.avatar" placeholder="👤" style="width:60px">
                    </div>
                  </div>
                  <div class="messages-list">
                    <div *ngFor="let msg of conv.messages; let j = index" class="message-item">
                      <div class="msg-row">
                        <input [(ngModel)]="msg.sender" placeholder="Sender">
                        <input [(ngModel)]="msg.content" placeholder="Message content">
                        <input [(ngModel)]="msg.timestamp" placeholder="10:30 AM">
                        <label><input type="checkbox" [(ngModel)]="msg.isOutgoing"> Outgoing</label>
                        <button class="btn-icon" (click)="removeMessage(i, j)">×</button>
                      </div>
                    </div>
                    <button class="btn-secondary btn-sm" (click)="addMessage(i)">+ Add Message</button>
                  </div>
                </div>
                <button class="btn-primary" (click)="addConversation()">+ Add Conversation</button>
              </div>
              <!-- Photos -->
              <div *ngIf="activeAppTab === 'photos'" class="app-config-content">
                <h4>Photos App</h4>
                <div *ngFor="let photo of photosData; let i = index" class="photo-item">
                  <div class="form-row">
                    <div class="form-group" style="flex:2">
                      <label>Photo URL</label>
                      <input [(ngModel)]="photo.url" placeholder="https://example.com/photo.jpg">
                    </div>
                    <div class="form-group" style="flex:1">
                      <label>Caption</label>
                      <input [(ngModel)]="photo.caption" placeholder="Crime scene">
                    </div>
                    <button class="btn-icon" (click)="removePhoto(i)" style="margin-top:28px">🗑️</button>
                  </div>
                </div>
                <button class="btn-primary" (click)="addPhoto()">+ Add Photo</button>
              </div>
              <!-- Email -->
              <div *ngIf="activeAppTab === 'email'" class="app-config-content">
                <h4>Email App</h4>
                <div *ngFor="let email of emailsData; let i = index" class="email-item">
                  <div class="form-group"><label>From</label><input [(ngModel)]="email.from" placeholder="detective@police.com"></div>
                  <div class="form-group"><label>Subject</label><input [(ngModel)]="email.subject" placeholder="Urgent Investigation"></div>
                  <div class="form-group"><label>Preview</label><textarea [(ngModel)]="email.preview" rows="2" placeholder="Email content preview..."></textarea></div>
                  <div class="form-row">
                    <div class="form-group"><label>Time</label><input [(ngModel)]="email.time" placeholder="10:30 AM"></div>
                    <button class="btn-icon" (click)="removeEmail(i)" style="margin-top:28px">🗑️</button>
                  </div>
                  <hr>
                </div>
                <button class="btn-primary" (click)="addEmail()">+ Add Email</button>
              </div>
              <!-- Notes -->
              <div *ngIf="activeAppTab === 'notes'" class="app-config-content">
                <h4>Notes App</h4>
                <div *ngFor="let note of notesData; let i = index" class="note-item">
                  <div class="form-group"><label>Title</label><input [(ngModel)]="note.title" placeholder="Important Note"></div>
                  <div class="form-group"><label>Content</label><textarea [(ngModel)]="note.content" rows="3" placeholder="Note content..."></textarea></div>
                  <div class="form-row">
                    <div class="form-group"><label>Time</label><input [(ngModel)]="note.time" placeholder="Oct 20"></div>
                    <button class="btn-icon" (click)="removeNote(i)" style="margin-top:28px">🗑️</button>
                  </div>
                  <hr>
                </div>
                <button class="btn-primary" (click)="addNote()">+ Add Note</button>
              </div>
              <!-- Files -->
              <div *ngIf="activeAppTab === 'files'" class="app-config-content">
                <h4>Files App</h4>
                <div *ngFor="let file of filesData; let i = index" class="note-item">
                  <div class="form-row">
                    <div class="form-group">
                      <label>File Name</label>
                      <input [(ngModel)]="file.name" placeholder="Raport_autopsie.docx">
                    </div>
                    <div class="form-group">
                      <label>Type</label>
                      <select [(ngModel)]="file.type">
                        <option value="Document">Document</option>
                        <option value="Encrypted">Encrypted</option>
                        <option value="Folder">Folder</option>
                        <option value="Image">Image</option>
                        <option value="Screenshot">Screenshot</option>
                      </select>
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Format</label>
                      <select [(ngModel)]="file.fileFormat">
                        <option value="">Auto</option>
                        <option value="docx">DOCX</option>
                        <option value="pdf">PDF</option>
                        <option value="xlsx">XLSX</option>
                        <option value="txt">TXT</option>
                        <option value="csv">CSV</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label>Size</label>
                      <input [(ngModel)]="file.size" placeholder="128 KB">
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Modified At</label>
                      <input [(ngModel)]="file.modifiedAt" placeholder="18.04.2026 09:42">
                    </div>
                    <div class="form-group">
                      <label>Description</label>
                      <input [(ngModel)]="file.description" placeholder="Scurt context pentru fisier">
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Content (DOCX/PDF/TXT)</label>
                    <textarea [(ngModel)]="file.content" rows="3" placeholder="Continut preview pentru document..."></textarea>
                  </div>
                  <div class="form-group">
                    <label>Spreadsheet Rows (JSON pentru XLSX/CSV)</label>
                    <textarea [(ngModel)]="file.rowsJson" rows="3" placeholder='[{"ColoanaA":"Valoare","Suma":120}]'></textarea>
                  </div>
                  <div class="form-row">
                    <button class="btn-icon" (click)="removeFile(i)" style="margin-top:4px">🗑️</button>
                  </div>
                  <hr>
                </div>
                <button class="btn-primary" (click)="addFile()">+ Add File</button>
              </div>
              <!-- Calls -->
              <div *ngIf="activeAppTab === 'calls'" class="app-config-content">
                <h4>Apeluri telefonice</h4>
                <div class="calls-info-box">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M8 5v3.5M8 11h.01" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                  Poti atasa un fisier audio <strong>MP3</strong> per apel. Fisierul va aparea in simulatorul de telefon la apasarea apelului.
                </div>
                <div *ngFor="let call of callsData; let i = index" class="call-item">
                  <div class="call-item-header">
                    <span class="call-item-num"># {{ i + 1 }}</span>
                    <button class="btn-icon" (click)="removeCall(i)">🗑️</button>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Tip apel</label>
                      <select [(ngModel)]="call.type">
                        <option value="Primit">📥 Primit</option>
                        <option value="Efectuat">📤 Efectuat</option>
                        <option value="Pierdut">📵 Pierdut</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label>Numar / Nume</label>
                      <input [(ngModel)]="call.contact" placeholder="Sorina Cioaca sau 0756-***-***">
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Data</label>
                      <input [(ngModel)]="call.date" placeholder="21.10.2007">
                    </div>
                    <div class="form-group">
                      <label>Ora</label>
                      <input [(ngModel)]="call.time" placeholder="17:02">
                    </div>
                    <div class="form-group">
                      <label>Durata</label>
                      <input [(ngModel)]="call.duration" placeholder="4 min 51 sec sau —">
                    </div>
                  </div>
                  <!-- Audio upload section -->
                  <div class="call-audio-row">
                    <div class="call-audio-label">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M6 2h4v9a2 2 0 1 1-4 0V2z" stroke="currentColor" stroke-width="1.2"/><path d="M3 7h2M11 7h2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                      Inregistrare audio (optional)
                    </div>
                    <div *ngIf="!call.audioUrl || call.audioUrl.startsWith('upload-required://')" class="call-audio-upload">
                      <span class="call-audio-filename" *ngIf="call.audioFileName">{{ call.audioFileName }}</span>
                      <span class="call-audio-filename call-audio-empty" *ngIf="!call.audioFileName">Niciun fisier selectat</span>
                      <label class="btn-audio-pick">
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 3v7M5 6l3-3 3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 12h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                        Alege MP3
                        <input type="file" accept=".mp3,.m4a,.ogg,.wav" style="display:none" (change)="onCallAudioSelected(i, $event)">
                      </label>
                    </div>
                    <div *ngIf="call.audioUrl && !call.audioUrl.startsWith('upload-required://')" class="call-audio-ready">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      {{ call.audioFileName || 'Audio incarcat' }}
                      <button class="call-audio-remove" (click)="call.audioUrl=''; call.audioFileName=''" title="Sterge audio">×</button>
                    </div>
                  </div>
                  <hr>
                </div>
                <button class="btn-primary" (click)="addCall()">+ Adauga apel</button>
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="cancelAppConfig()">Anuleaza</button>
              <button type="button" class="btn-primary" (click)="saveAppConfig()">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Salveaza configurarea
              </button>
            </div>
          </div>
        </div>

        <!-- Investigator Devices Tab -->
        <div *ngIf="activeTab === 'investigator'" class="tab-content">
          <div class="sec-head">
            <div>
              <div class="eyebrow" style="color:#8b1a1a">DISPOZITIVE SPECIALE</div>
              <h2 class="sec-title">Dispozitivele Anchetatorului</h2>
            </div>
          </div>
          <p style="font-size:13.5px;color:var(--ink2);font-style:italic;margin-bottom:24px;line-height:1.7">
            Aceste dispozitive apartin anchetatorului si au fost generate automat pe baza dosarului.
            Laptopul contine baze de date clasificate, interogatorii si harti. iPhone-ul contine apeluri inregistrate cu entitatile cazului.
          </p>
          <div *ngIf="investigatorDevices.length === 0" class="empty-state">
            <div class="empty-icon">🔍</div>
            <h3>Dispozitivele nu sunt disponibile</h3>
            <p>Creati un dosar nou pentru a genera automat dispozitivele anchetatorului.</p>
          </div>
          <div class="inv-devices-grid">
            <div *ngFor="let device of investigatorDevices" class="inv-device-card">
              <div class="inv-card-top-line"></div>
              <div class="inv-badge">ANCHETATOR</div>
              <div class="inv-device-icon">
                {{ device.deviceType === 'Laptop' ? '💻' : '📱' }}
              </div>
              <div class="inv-device-type">{{ device.deviceType }}</div>
              <div class="inv-device-desc">
                <span *ngIf="device.deviceType === 'Laptop'">Baze de date suspecti · Interogatorii · Camere CCTV · Harti</span>
                <span *ngIf="device.deviceType === 'iPhone'">Apeluri inregistrate · Mesaje · Note de ancheta</span>
              </div>
              <!-- upload notice for investigator devices -->
              <div *ngIf="deviceUploadRequirements[device.deviceId]?.length" class="sus-upload-notice">
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 3v7M5 6l3-3 3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 12h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                {{ deviceUploadRequirements[device.deviceId].join(' | ') }}
              </div>
              <input
                *ngIf="deviceUploadTargets[device.deviceId]?.length"
                [id]="'device-upload-' + device.deviceId"
                type="file"
                style="display:none"
                [accept]="getDeviceUploadAccept(device.deviceId)"
                (change)="onDeviceUploadSelected(device.deviceId, $event)"
              />
              <div class="inv-device-actions">
                <button class="btn-primary" style="width:100%" [routerLink]="['/games', gameId, 'devices', createDeviceSlug(device.deviceType, device.ownerName), 'simulator']">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2l6 4v4l-6 4-6-4V6l6-4z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
                  Deschide {{ device.deviceType }}
                </button>
                <button class="btn-secondary" style="margin-top:6px;width:100%" (click)="downloadQRCodePDF(device)">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="10" y="10" width="1.5" height="1.5" fill="currentColor"/><rect x="12.5" y="10" width="1.5" height="1.5" fill="currentColor"/><rect x="10" y="12.5" width="1.5" height="1.5" fill="currentColor"/><rect x="12.5" y="12.5" width="1.5" height="1.5" fill="currentColor"/></svg>
                  QR Code PDF
                </button>
                <button class="btn-action-outline" style="margin-top:6px;width:100%" (click)="configureDeviceApps(device)">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.54 11.54l1.41 1.41M3.05 12.95l1.42-1.42M11.54 4.46l1.41-1.41" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                  Configurare aplicatii
                </button>
                <button class="btn-action-outline" style="margin-top:6px;width:100%" *ngIf="deviceUploadTargets[device.deviceId]?.length" (click)="triggerDeviceUpload(device.deviceId)">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 3v7M5 6l3-3 3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 12h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                  Incarca fisier (foto/media)
                </button>
                <!-- Audio apeluri: direct button for investigator phones -->
                <div *ngIf="device.deviceType === 'iPhone' || device.deviceType === 'Android'" style="margin-top:6px;">
                  <label class="btn-action-audio" style="width:100%;cursor:pointer;" title="Incarca MP3 — se atribuie automat apelului corespunzator">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 2h4v9a2 2 0 1 1-4 0V2z" stroke="currentColor" stroke-width="1.2"/><path d="M3 7h2M11 7h2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                    Incarca audio apel (MP3)
                    <input type="file" accept=".mp3,.m4a,.ogg,.wav" style="display:none" (change)="onCardCallAudioUpload(device, $event)">
                  </label>
                  <button class="btn-action-outline" style="margin-top:4px;width:100%;font-size:11.5px;" (click)="configureDeviceAppsOnTab(device, 'calls')">
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.54 11.54l1.41 1.41M3.05 12.95l1.42-1.42M11.54 4.46l1.41-1.41" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                    Gestioneaza apeluri
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host{display:block}*{box-sizing:border-box;margin:0;padding:0}
    .details-container {
      --bg:#fcfaf7;--surface:#fff;--border:rgba(0,0,0,0.07);--border-md:rgba(0,0,0,0.11);
      --amber:#d43f33;--amber-l:rgba(212,63,51,0.07);--navy:#1a1a1a;--navy-l:rgba(26,26,26,0.06);
      --ink:#1a1a1a;--ink2:rgba(26,22,16,0.62);--ink3:rgba(26,22,16,0.40);--green:#4a7a56;--red:#9b2020;
      --crimson:#8b1a1a;--crimson-l:rgba(139,26,26,0.08);
      min-height:100vh;background:var(--bg);font-family:'Public Sans',sans-serif;color:var(--ink);
    }
    .bg-canvas{position:fixed;inset:0;z-index:0;pointer-events:none;}

    /* Fixed logo watermark */
    .fixed-logo-wrap{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:500;mix-blend-mode:screen;}
    .fixed-logo-img{width:min(85vw,85vh);height:min(85vw,85vh);object-fit:contain;filter:invert(1);opacity:0.12;animation:logoBreath 8s ease-in-out infinite;}
    @keyframes logoBreath{0%,100%{opacity:0.10;transform:scale(1);}50%{opacity:0.16;transform:scale(1.015);}}
    /* Navbar */
    .nb{position:sticky;top:0;z-index:100;height:54px;background:rgba(252,250,247,0.88);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid var(--border-md);}
    .nb-inner{max-width:1200px;margin:0 auto;padding:0 24px;height:100%;display:flex;align-items:center;gap:12px;position:relative;z-index:1;}
    .btn-back{display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 12px;border:1px solid var(--border-md);border-radius:7px;background:transparent;color:var(--ink);font-size:12.5px;font-weight:500;font-family:'Public Sans',sans-serif;cursor:pointer;transition:border-color .2s;flex-shrink:0;}
    .btn-back:hover{border-color:rgba(0,0,0,0.25);color:var(--ink);}
    .btn-edit{display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 12px;border:1px solid rgba(28,43,74,0.35);border-radius:7px;background:transparent;color:var(--navy);font-size:12.5px;font-weight:600;font-family:'Public Sans',sans-serif;cursor:pointer;transition:background .2s;margin-left:auto;flex-shrink:0;}
    .btn-edit:hover{background:var(--navy-l);}
    .nb-title-wrap{flex:1;display:flex;align-items:center;gap:10px;justify-content:center;}
    .nb-case{font-family:'Crimson Pro',serif;font-size:15px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:400px;}
    .nb-badge{font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:1.5px;text-transform:uppercase;padding:2px 8px;border-radius:4px;flex-shrink:0;font-weight:600;}
    .badge-pub{background:rgba(74,122,86,0.12);color:var(--green);border:1px solid rgba(74,122,86,0.4);}
    .badge-draft{background:rgba(184,114,8,0.10);color:var(--amber);border:1px solid rgba(184,114,8,0.35);}
    /* Tabs */
    .tabs-bar{background:rgba(245,242,236,0.7);border-bottom:1px solid var(--border);position:sticky;top:54px;z-index:90;backdrop-filter:blur(12px);}
    .tabs-inner{max-width:1200px;margin:0 auto;padding:0 24px;display:flex;gap:4px;height:46px;align-items:center;position:relative;z-index:1;}
    .tab-pill{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 14px;border-radius:20px;border:1px solid transparent;background:transparent;font-size:12.5px;font-weight:500;font-family:'Public Sans',sans-serif;color:var(--ink2);cursor:pointer;transition:background .2s,border-color .2s,color .2s;}
    .tab-pill:hover{background:var(--amber-l);color:var(--amber);}
    .tab-active{background:var(--surface);border-color:var(--border-md);color:var(--ink);font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,0.06);}
    .tab-pill-special:hover{background:var(--crimson-l);color:var(--crimson);}
    .tab-pill-special.tab-active{border-color:rgba(139,26,26,0.3);}
    .tab-count{font-family:'JetBrains Mono',monospace;font-size:9.5px;font-weight:600;color:var(--amber);background:rgba(184,114,8,0.12);border-radius:10px;padding:1px 6px;}
    .tab-count-inv{color:var(--crimson);background:rgba(139,26,26,0.12);}
    /* Shared Device Grid */
    .inv-devices-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;}
    /* Investigator Devices */
    .inv-device-card{background:var(--surface);border:1px solid rgba(139,26,26,0.18);border-radius:14px;padding:28px 24px 20px;position:relative;overflow:hidden;text-align:center;transition:box-shadow .25s,transform .25s;}
    .inv-device-card:hover{transform:translateY(-3px);box-shadow:0 8px 32px rgba(139,26,26,0.12);}
    .inv-card-top-line{position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,rgba(139,26,26,0.6),transparent);}
    .inv-badge{position:absolute;top:14px;right:14px;font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:rgba(139,26,26,0.75);border:1px solid rgba(139,26,26,0.35);padding:2px 8px;border-radius:4px;}
    .inv-device-icon{font-size:48px;margin-bottom:14px;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.12));}
    .inv-device-type{font-family:'Crimson Pro',serif;font-size:20px;font-weight:700;color:var(--ink);margin-bottom:8px;}
    .inv-device-desc{font-size:12.5px;color:var(--ink2);line-height:1.6;font-style:italic;margin-bottom:14px;min-height:38px;}
    .inv-device-actions{display:flex;flex-direction:column;gap:0;}
    /* Suspect Devices (same visual style as investigator) */
    .sus-device-card{background:var(--surface);border:1px solid var(--border-md);border-radius:14px;padding:28px 24px 20px;position:relative;overflow:hidden;text-align:center;transition:box-shadow .25s,transform .25s;}
    .sus-device-card:hover{transform:translateY(-3px);box-shadow:0 8px 32px rgba(28,43,74,0.10);}
    .sus-card-top-line{position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,rgba(28,43,74,0.5),transparent);}
    .sus-owner-badge{position:absolute;top:14px;right:14px;font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:var(--amber);border:1px solid rgba(184,114,8,0.4);padding:2px 8px;border-radius:4px;max-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .sus-card-meta{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:16px;}
    .sus-meta-pill{display:inline-flex;align-items:center;gap:4px;font-family:'JetBrains Mono',monospace;font-size:9.5px;color:var(--ink3);background:rgba(0,0,0,0.04);border:1px solid var(--border);border-radius:20px;padding:2px 8px;}
    .sus-upload-notice{font-size:11.5px;color:var(--amber);background:var(--amber-l);border:1px solid rgba(184,114,8,0.2);border-radius:6px;padding:6px 10px;display:flex;align-items:flex-start;gap:5px;margin-bottom:12px;text-align:left;line-height:1.5;}
    .sus-card-actions{display:flex;flex-direction:column;gap:0;}
    /* Outline action button (Configure, Edit, Upload) */
    .btn-action-outline{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:34px;padding:0 14px;border:1px solid var(--border-md);border-radius:7px;background:transparent;color:var(--ink);font-size:12.5px;font-weight:500;font-family:'Public Sans',sans-serif;cursor:pointer;transition:border-color .2s,background .2s,color .2s;}
    .btn-action-outline:hover{border-color:rgba(28,43,74,0.4);background:var(--navy-l);color:var(--navy);}
    /* Danger action button (Delete) */
    .btn-action-danger{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:34px;padding:0 14px;border:1px solid rgba(155,32,32,0.25);border-radius:7px;background:transparent;color:var(--red);font-size:12.5px;font-weight:500;font-family:'Public Sans',sans-serif;cursor:pointer;transition:border-color .2s,background .2s;}
    .btn-action-danger:hover{border-color:rgba(155,32,32,0.5);background:rgba(155,32,32,0.06);}
    /* Modal overlay */
    .modal-backdrop{position:fixed;inset:0;z-index:400;background:rgba(26,22,16,0.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeBackdrop .22s ease both;}
    @keyframes fadeBackdrop{from{opacity:0}to{opacity:1}}
    .modal-panel{background:var(--surface);border-radius:16px;width:100%;max-width:560px;box-shadow:0 24px 80px rgba(0,0,0,0.22);position:relative;overflow:hidden;animation:slideUp .28s cubic-bezier(.22,.8,.36,1) both;}
    .modal-panel-wide{max-width:860px;}
    @keyframes slideUp{from{opacity:0;transform:translateY(28px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
    .modal-top-bar{height:3px;background:linear-gradient(90deg,transparent,rgba(28,43,74,0.55),transparent);}
    .modal-header{display:flex;align-items:flex-start;justify-content:space-between;padding:22px 26px 18px;}
    .modal-eyebrow{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:var(--amber);font-weight:600;margin-bottom:4px;}
    .modal-title{font-family:'Crimson Pro',serif;font-size:20px;font-weight:700;color:var(--ink);}
    .modal-close{width:32px;height:32px;border:1px solid var(--border-md);border-radius:8px;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--ink2);transition:background .15s,border-color .15s;flex-shrink:0;}
    .modal-close:hover{background:rgba(0,0,0,0.05);border-color:rgba(0,0,0,0.2);}
    .modal-panel form,.modal-panel .app-tabs,.modal-panel .modal-scrollable{padding:0 26px;}
    .modal-scrollable{max-height:60vh;overflow-y:auto;padding-right:18px;scrollbar-width:thin;scrollbar-color:rgba(0,0,0,0.12) transparent;}
    .modal-actions{display:flex;gap:10px;justify-content:flex-end;padding:16px 26px 22px;border-top:1px solid var(--border);margin-top:4px;}
    /* Calls tab */
    .calls-info-box{display:flex;align-items:flex-start;gap:7px;background:rgba(26,26,26,0.06);border:1px solid rgba(28,43,74,0.14);border-radius:8px;padding:10px 13px;font-size:12.5px;color:var(--ink2);line-height:1.55;margin-bottom:16px;}
    .calls-info-box strong{color:var(--navy);}
    .call-item{background:rgba(245,242,236,0.5);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:12px;}
    .call-item-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
    .call-item-num{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:1px;text-transform:uppercase;color:var(--ink3);font-weight:600;}
    .call-audio-row{background:var(--surface);border:1px dashed var(--border-md);border-radius:8px;padding:10px 12px;margin-bottom:12px;}
    .call-audio-label{display:flex;align-items:center;gap:5px;font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:0.8px;text-transform:uppercase;color:var(--amber);font-weight:600;margin-bottom:8px;}
    .call-audio-upload{display:flex;align-items:center;gap:8px;}
    .call-audio-filename{font-size:12.5px;color:var(--ink2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .call-audio-empty{font-style:italic;color:var(--ink3);}
    .btn-audio-pick{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 12px;border:1px solid rgba(184,114,8,0.4);border-radius:6px;background:var(--amber-l);color:var(--amber);font-size:11.5px;font-weight:600;font-family:'Public Sans',sans-serif;cursor:pointer;transition:background .15s;flex-shrink:0;}
    .btn-audio-pick:hover{background:rgba(184,114,8,0.15);}
    .call-audio-ready{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--green);}
    .call-audio-remove{width:20px;height:20px;border:none;background:transparent;cursor:pointer;font-size:14px;color:var(--ink3);display:flex;align-items:center;justify-content:center;margin-left:auto;}
    /* Audio apeluri button */
    .btn-action-audio{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:34px;padding:0 14px;border:1px solid rgba(74,122,86,0.35);border-radius:7px;background:transparent;color:var(--green);font-size:12.5px;font-weight:500;font-family:'Public Sans',sans-serif;cursor:pointer;transition:border-color .2s,background .2s;}
    .btn-action-audio:hover{border-color:rgba(74,122,86,0.6);background:rgba(74,122,86,0.07);}
    .details-content{max-width:1200px;margin:0 auto;padding:32px 24px 60px;position:relative;z-index:1;}
    .tab-content{animation:fadeUp .35s ease both;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    .eyebrow{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--amber);margin-bottom:4px;font-weight:600;}
    /* Overview */
    .ov-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:28px;margin-bottom:16px;position:relative;overflow:hidden;}
    .ov-card-top{position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(184,114,8,0.45),transparent);}
    .ov-solution .ov-card-top{background:linear-gradient(90deg,transparent,rgba(155,32,32,0.45),transparent);}
    .ov-solution{border-color:rgba(155,32,32,0.15);}
    .solution-badge-sm{position:absolute;top:14px;right:16px;font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:2px;text-transform:uppercase;font-weight:600;color:rgba(155,32,32,0.65);border:1px solid rgba(155,32,32,0.3);padding:2px 7px;border-radius:3px;}
    .ov-label{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--ink3);margin-bottom:6px;font-weight:600;}
    .ov-title{font-family:'Crimson Pro',serif;font-size:20px;font-weight:700;color:var(--ink);margin-bottom:14px;}
    .ov-body{font-size:14px;color:var(--ink2);line-height:1.75;font-family:'Public Sans',sans-serif;font-style:italic;white-space:pre-wrap;}
    /* Section header */
    .sec-head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:22px;}
    .sec-title{font-family:'Crimson Pro',serif;font-size:24px;font-weight:700;color:var(--ink);}
    /* Cards grid */
    .characters-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;}
    .character-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;position:relative;overflow:hidden;transition:box-shadow .2s,border-color .2s;}
    .character-card:hover{box-shadow:0 4px 20px rgba(0,0,0,0.07);border-color:rgba(184,114,8,0.3);}
    .character-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(184,114,8,0.4),transparent);}
    .character-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
    .character-header h3{font-family:'Crimson Pro',serif;font-size:16px;font-weight:700;color:var(--ink);}
    .character-role{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;background:rgba(184,114,8,0.12);color:var(--amber);border:1px solid rgba(184,114,8,0.3);padding:2px 8px;border-radius:4px;}
    .character-description{font-size:13.5px;color:var(--ink2);line-height:1.6;margin-bottom:12px;font-style:italic;}
    .character-details{margin-bottom:12px;}
    .detail{font-size:13px;color:var(--ink2);margin-bottom:5px;line-height:1.55;}
    .detail strong{color:var(--ink);font-weight:600;}
    .character-actions{display:flex;gap:6px;padding-top:12px;border-top:1px solid var(--border);}
    .btn-character-photo,.btn-character-pdf{height:28px;font-size:11.5px;padding:0 10px;}
    .character-photo-warning{margin-top:8px;font-size:11.5px;color:var(--amber);}
    .character-photo-ready{margin-top:8px;font-size:11.5px;color:var(--green);}
    .btn-icon{width:28px;height:28px;border:1px solid var(--border-md);border-radius:6px;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;transition:background .15s,border-color .15s;}
    .btn-icon:hover{background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.2);}
    /* Forms */
    .character-form{background:var(--surface);border:1px solid var(--border-md);border-radius:12px;padding:26px;margin-bottom:22px;position:relative;overflow:hidden;}
    .character-form::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(28,43,74,0.45),transparent);}
    .character-form h3{font-family:'Crimson Pro',serif;font-size:18px;font-weight:700;color:var(--ink);margin-bottom:18px;}
    .form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;}
    .form-group{display:flex;flex-direction:column;gap:5px;margin-bottom:14px;}
    .form-group label{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:1px;text-transform:uppercase;color:var(--amber);font-weight:600;}
    .form-group input,.form-group select,.form-group textarea{padding:10px 12px;border:1px solid var(--border-md);border-radius:8px;background:var(--bg);color:var(--ink);font-size:13.5px;font-family:'Public Sans',sans-serif;outline:none;transition:border-color .2s;width:100%;}
    .form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:rgba(184,114,8,0.5);box-shadow:0 0 0 3px rgba(212,63,51,0.07);}
    .form-group textarea{resize:vertical;line-height:1.6;}
    .form-actions{display:flex;gap:10px;justify-content:flex-end;padding-top:16px;border-top:1px solid var(--border);margin-top:4px;}
    /* App tabs */
    .app-tabs{display:flex;gap:4px;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid var(--border);}
    .app-tab-btn{height:30px;padding:0 13px;border:1px solid transparent;border-radius:20px;background:transparent;font-size:12px;font-weight:500;font-family:'Public Sans',sans-serif;color:var(--ink2);cursor:pointer;transition:background .15s,border-color .15s;}
    .app-tab-btn:hover{background:var(--amber-l);color:var(--amber);}
    .app-tab-btn.active{background:var(--surface);border-color:var(--border-md);color:var(--ink);font-weight:600;}
    .app-config-content h4{font-family:'Crimson Pro',serif;font-size:16px;font-weight:700;color:var(--ink);margin-bottom:16px;}
    .conversation-item,.email-item,.note-item,.photo-item{background:rgba(245,242,236,0.5);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px;}
    .conv-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
    .conv-header strong{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--ink3);font-weight:600;}
    .messages-list{margin-top:10px;}
    .message-item{margin-bottom:8px;}
    .msg-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
    .msg-row input{flex:1;min-width:80px;padding:7px 10px;border:1px solid var(--border-md);border-radius:6px;background:var(--surface);font-size:12.5px;font-family:'Public Sans',sans-serif;color:var(--ink);outline:none;}
    .msg-row input:focus{border-color:rgba(184,114,8,0.5);}
    .msg-row label{font-size:12px;color:var(--ink2);white-space:nowrap;display:flex;align-items:center;gap:5px;}
    /* Buttons */
    .btn-primary{display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 15px;border:none;border-radius:7px;background:var(--navy);color:#fff;font-size:12.5px;font-family:'Public Sans',sans-serif;font-weight:600;cursor:pointer;transition:opacity .2s;}
    .btn-primary:hover:not(:disabled){opacity:.88;}
    .btn-primary:disabled{opacity:.4;cursor:not-allowed;}
    .btn-secondary{display:inline-flex;align-items:center;height:32px;padding:0 14px;border:1px solid var(--border-md);border-radius:7px;background:transparent;color:var(--ink);font-size:12.5px;font-weight:500;font-family:'Public Sans',sans-serif;cursor:pointer;transition:border-color .2s;}
    .btn-secondary:hover{border-color:rgba(0,0,0,0.25);color:var(--ink);}
    .btn-sm{height:26px;padding:0 11px;font-size:11.5px;}
    /* Misc */
    .info-box{background:var(--amber-l);border:1px solid rgba(184,114,8,0.25);border-radius:8px;padding:12px 14px;font-size:13px;color:var(--ink2);margin-bottom:14px;line-height:1.5;}
    .info-box strong{color:var(--ink);font-weight:600;}
    .empty-state{text-align:center;padding:60px 20px;}
    .empty-state .empty-icon{font-size:40px;margin-bottom:12px;opacity:.5;}
    .empty-state h3{font-family:'Crimson Pro',serif;font-size:22px;font-weight:700;color:var(--ink);margin-bottom:8px;}
    .empty-state p{font-size:13.5px;color:var(--ink2);font-style:italic;}
    hr{border:none;border-top:1px solid var(--border);margin:14px 0;}
    @media(max-width:900px){.characters-grid{grid-template-columns:1fr;}.form-row{grid-template-columns:1fr;}}
  `]
})
export class GameDetailsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('bgCvs') canvasRef!: ElementRef<HTMLCanvasElement>;
  private cleanupCanvas?: () => void;
  gameId!: number;
  game?: Game;
  characters: Character[] = [];
  devices: DigitalDevice[] = [];
  suspectDevices: DigitalDevice[] = [];
  investigatorDevices: DigitalDevice[] = [];
  activeTab = 'overview';
  createDeviceSlug = createDeviceSlug; // Make function available in template
  showCharacterForm = false;
  showDeviceForm = false;
  editingCharacter: Character | null = null;
  editingDevice: DigitalDevice | null = null;
  characterForm: FormGroup;
  deviceForm: FormGroup;

  // App configuration
  configuringDevice: DigitalDevice | null = null;
  activeAppTab = 'messages';
  messagesData: any[] = [];
  photosData: any[] = [];
  emailsData: any[] = [];
  notesData: any[] = [];
  filesData: any[] = [];
  callsData: any[] = [];
  deviceUploadRequirements: { [deviceId: number]: string[] } = {};
  deviceUploadTargets: { [deviceId: number]: UploadTarget[] } = {};
  characterPhotos: { [characterId: number]: File } = {};
  isGeneratingCharacterPdf: { [characterId: number]: boolean } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameService: GameService,
    private characterService: CharacterService,
    private deviceService: DeviceService,
    private fb: FormBuilder
  ) {
    this.characterForm = this.fb.group({
      name: ['', Validators.required],
      role: ['Suspect', Validators.required],
      description: [''],
      backstory: [''],
      motive: [''],
      alibi: ['']
    });
    this.deviceForm = this.fb.group({
      deviceType: ['iPhone', Validators.required],
      ownerName: ['', Validators.required]
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) { this.gameId = parseInt(id); this.loadGame(); this.loadCharacters(); this.loadDevices(); this.loadInvestigatorDevices(); }
  }

  ngAfterViewInit() { this.cleanupCanvas = this.initCanvas(this.canvasRef.nativeElement); }
  ngOnDestroy() { this.cleanupCanvas?.(); }

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
        else { const a = 0.07 + 0.09 * Math.sin(t * 0.0003 + e.a); ctx.strokeStyle = `rgba(155, 32, 32, ${a.toFixed(3)})`; ctx.lineWidth = 0.9; ctx.setLineDash([]); }
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

  loadGame() {
    this.gameService.getGame(this.gameId).subscribe({
      next: (game) => this.game = game,
      error: (error) => console.error('Error loading game:', error)
    });
  }

  loadCharacters() {
    this.characterService.getCharacters(this.gameId).subscribe({
      next: (characters) => this.characters = characters,
      error: (error) => console.error('Error loading characters:', error)
    });
  }

  loadDevices() {
    this.deviceService.getDevices(this.gameId).subscribe({
      next: (devices) => {
        // Exclude investigator devices from the suspect tab
        this.devices = devices.filter(d => d.ownerName !== 'Anchetator');
        this.suspectDevices = this.devices;
        this.loadUploadRequirementsForDevices();
      },
      error: (error) => console.error('Error loading devices:', error)
    });
  }

  private loadUploadRequirementsForDevices() {
    this.deviceUploadRequirements = {};
    this.deviceUploadTargets = {};
    // load investigator devices upload requirements too
    [...this.suspectDevices, ...this.investigatorDevices].forEach(device => {
      this.deviceService.getDeviceApps(this.gameId, device.deviceId).subscribe({
        next: (apps: any[]) => {
          const requirements: string[] = [];
          const targets: UploadTarget[] = [];
          apps.forEach((app: any) => {
            if (app.appType === 'Photos') {
              const photos = app.appData?.photos ?? app.appData?.Photos ?? [];
              (photos || []).forEach((p: any) => {
                const url = p.url ?? p.Url ?? '';
                if (typeof url === 'string' && url.startsWith('upload-required://')) {
                  const raw = url.substring('upload-required://'.length);
                  const [name, query] = raw.split('?');
                  const params = new URLSearchParams(query || '');
                  const types = params.get('types') || 'jpg,jpeg,png';
                  requirements.push(`Foto: ${name} (${types}, ${params.get('size') || '1080x1920'})`);
                  targets.push({ appId: app.appId, appType: 'Photos', fileName: name, allowedTypes: types, sizeHint: params.get('size') || '1080x1920' });
                }
              });
            }
            if (app.appType === 'Files') {
              const files = app.appData?.items ?? app.appData?.Items ?? [];
              (files || []).forEach((f: any) => {
                const desc = String(f.description ?? f.Description ?? '');
                if (desc.includes('upload-required://')) {
                  const raw = desc.split('upload-required://')[1].split('|')[0].trim();
                  const [name, query] = raw.split('?');
                  const params = new URLSearchParams(query || '');
                  const types = params.get('types') || 'mp3,mp4';
                  requirements.push(`Media: ${name} (${types}, ${params.get('size') || 'standard'})`);
                  targets.push({ appId: app.appId, appType: 'Files', fileName: name, allowedTypes: types, sizeHint: params.get('size') || 'standard' });
                }
              });
            }
            if (app.appType === 'Calls' || app.appType === 'Phone') {
              const calls = app.appData?.calls ?? app.appData?.Calls ?? [];
              (calls || []).forEach((c: any) => {
                const audioUrl = c.audioUrl ?? c.AudioUrl ?? '';
                if (typeof audioUrl === 'string' && audioUrl.startsWith('upload-required://')) {
                  const raw = audioUrl.substring('upload-required://'.length);
                  const [name] = raw.split('?');
                  requirements.push(`Audio apel: ${name} (mp3)`);
                  targets.push({
                    appId: app.appId,
                    appType: app.appType === 'Phone' ? 'Phone' : 'Calls',
                    fileName: name,
                    allowedTypes: 'mp3,m4a,ogg,wav',
                    sizeHint: 'standard'
                  });
                }
              });
            }
          });
          if (requirements.length > 0) {
            this.deviceUploadRequirements[device.deviceId] = requirements;
            this.deviceUploadTargets[device.deviceId] = targets;
          }
        },
        error: () => {}
      });
    });
  }

  triggerDeviceUpload(deviceId: number) {
    const input = document.getElementById(`device-upload-${deviceId}`) as HTMLInputElement | null;
    input?.click();
  }

  getDeviceUploadAccept(deviceId: number): string {
    const targets = this.deviceUploadTargets[deviceId] ?? [];
    const extSet = new Set<string>();
    targets.forEach(t => {
      t.allowedTypes.split(',').map(x => x.trim().toLowerCase()).forEach(ext => extSet.add(ext));
    });
    if (extSet.size === 0) return '.jpg,.jpeg,.png,.mp3,.mp4';
    return Array.from(extSet).map(ext => ext.startsWith('.') ? ext : `.${ext}`).join(',');
  }

  onDeviceUploadSelected(deviceId: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const targets = this.deviceUploadTargets[deviceId] ?? [];
    const normalizedSelectedName = this.normalizeFileNameForCompare(file.name);
    const target = targets.find(t =>
      this.normalizeFileNameForCompare(t.fileName) === normalizedSelectedName
    );
    if (!target) {
      alert(`Fisierul nu este cerut pentru acest dispozitiv. Nume asteptate: ${(targets.map(t => t.fileName)).join(', ')}`);
      input.value = '';
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowed = target.allowedTypes.split(',').map(x => x.trim().toLowerCase());
    if (!allowed.includes(ext)) {
      alert(`Format invalid pentru ${target.fileName}. Permis: ${target.allowedTypes}`);
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) return;

      this.deviceService.getDeviceApps(this.gameId, deviceId).subscribe({
        next: (apps: any[]) => {
          const app = apps.find(a => a.appId === target.appId);
          if (!app) {
            alert('Nu am gasit aplicatia pentru upload.');
            return;
          }

          if (target.appType === 'Photos') {
            const photos = [...(app.appData?.photos ?? app.appData?.Photos ?? [])];
            const idx = photos.findIndex((p: any) => {
              const url = String(p.url ?? p.Url ?? '');
              return url.startsWith('upload-required://') && url.includes(target.fileName);
            });
            if (idx < 0) { alert(`Placeholder-ul pentru ${target.fileName} nu mai exista.`); return; }
            photos[idx] = { ...photos[idx], url: dataUrl };
            this.deviceService.updateDeviceApp(this.gameId, deviceId, target.appId, { appData: { photos } }).subscribe({
              next: () => { alert(`Upload reusit pentru ${target.fileName}.`); this.loadUploadRequirementsForDevices(); input.value = ''; },
              error: () => alert('Nu am putut salva poza.')
            });
            return;
          }

          if (target.appType === 'Calls' || target.appType === 'Phone') {
            const calls = [...(app.appData?.calls ?? app.appData?.Calls ?? [])];
            const idx = calls.findIndex((c: any) => {
              const au = String(c.audioUrl ?? c.AudioUrl ?? '');
              return au.startsWith('upload-required://') && au.includes(target.fileName);
            });
            if (idx < 0) { alert(`Placeholder-ul audio pentru ${target.fileName} nu mai exista.`); return; }
            calls[idx] = { ...calls[idx], audioUrl: dataUrl, audioFileName: target.fileName };
            this.deviceService.updateDeviceApp(this.gameId, deviceId, target.appId, { appData: { calls } }).subscribe({
              next: () => { alert(`Audio incarcat: ${target.fileName}.`); this.loadUploadRequirementsForDevices(); input.value = ''; },
              error: () => alert('Nu am putut salva fisierul audio.')
            });
            return;
          }

          const items = [...(app.appData?.items ?? app.appData?.Items ?? [])];
          const idx = items.findIndex((f: any) => String(f.name ?? f.Name ?? '').toLowerCase() === target.fileName.toLowerCase());
          if (idx < 0) { alert(`Fisierul ${target.fileName} nu exista in lista de fisiere.`); return; }
          items[idx] = { ...items[idx], description: `uploaded://${target.fileName}` };
          this.deviceService.updateDeviceApp(this.gameId, deviceId, target.appId, { appData: { items } }).subscribe({
            next: () => { alert(`Upload reusit pentru ${target.fileName}.`); this.loadUploadRequirementsForDevices(); input.value = ''; },
            error: () => alert('Nu am putut salva fisierul media.')
          });
        },
        error: () => alert('Nu am putut incarca datele aplicatiilor dispozitivului.')
      });
    };
    reader.readAsDataURL(file);
  }

  private normalizeFileNameForCompare(name: string): string {
    const normalized = (name || '')
      .trim()
      .replace(/[“”"']/g, '')
      // Accept both "foto_0089.jpg" and accidental "foto_0089,jpg"
      .replace(/,(?=[a-z0-9]{2,5}$)/i, '.')
      .replace(/\s+/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return normalized;
  }

  loadInvestigatorDevices() {
    this.deviceService.getInvestigatorDevices(this.gameId).subscribe({
      next: (devices) => {
        this.investigatorDevices = devices;
        // Reload upload requirements now that investigator devices are known
        this.loadUploadRequirementsForDevices();
      },
      error: (error) => console.error('Error loading investigator devices:', error)
    });
  }

  saveCharacter() {
    if (this.characterForm.invalid) return;

    const characterData = this.characterForm.value;

    if (this.editingCharacter) {
      this.characterService.updateCharacter(this.gameId, this.editingCharacter.characterId, characterData).subscribe({
        next: () => {
          this.loadCharacters();
          this.cancelCharacterForm();
        },
        error: (error) => console.error('Error updating character:', error)
      });
    } else {
      this.characterService.createCharacter(this.gameId, characterData).subscribe({
        next: () => {
          this.loadCharacters();
          this.cancelCharacterForm();
        },
        error: (error) => console.error('Error creating character:', error)
      });
    }
  }

  editCharacter(character: Character) {
    this.editingCharacter = character;
    this.characterForm.patchValue(character);
    this.showCharacterForm = true;
  }

  deleteCharacter(characterId: number) {
    if (confirm('Are you sure you want to delete this character?')) {
      this.characterService.deleteCharacter(this.gameId, characterId).subscribe({
        next: () => this.loadCharacters(),
        error: (error) => console.error('Error deleting character:', error)
      });
    }
  }

  triggerCharacterPhotoUpload(characterId: number) {
    const input = document.getElementById(`character-photo-${characterId}`) as HTMLInputElement | null;
    input?.click();
  }

  onCharacterPhotoSelected(characterId: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Format poza invalid. Permis: JPG, PNG, WEBP.');
      input.value = '';
      return;
    }

    this.characterPhotos[characterId] = file;
  }

  generateCharacterProfilePdf(character: Character) {
    const photo = this.characterPhotos[character.characterId];
    if (!photo) {
      alert('Incarca mai intai poza personajului, apoi poti genera profilul PDF.');
      return;
    }

    this.isGeneratingCharacterPdf[character.characterId] = true;
    this.characterService.downloadCharacterProfilePdf(this.gameId, character.characterId, photo).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Profil-${character.name.replace(/\s+/g, '-')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error generating character profile PDF:', error);
        alert('Nu am putut genera profilul PDF. Verifica poza si incearca din nou.');
      },
      complete: () => {
        this.isGeneratingCharacterPdf[character.characterId] = false;
      }
    });
  }

  cancelCharacterForm() {
    this.showCharacterForm = false;
    this.editingCharacter = null;
    this.characterForm.reset({ role: 'Suspect' });
  }

  // Device Methods
  saveDevice() {
    if (this.deviceForm.invalid) return;

    const deviceData = {
      ...this.deviceForm.value,

    };

    if (this.editingDevice) {
      this.deviceService.updateDevice(this.gameId, this.editingDevice.deviceId, deviceData).subscribe({
        next: () => {
          this.loadDevices();
          this.cancelDeviceForm();
        },
        error: (error) => console.error('Error updating device:', error)
      });
    } else {
      this.deviceService.createDevice(this.gameId, deviceData).subscribe({
        next: () => {
          this.loadDevices();
          this.cancelDeviceForm();
        },
        error: (error) => console.error('Error creating device:', error)
      });
    }
  }

  editDevice(device: DigitalDevice) {
    this.editingDevice = device;
    this.deviceForm.patchValue({
      deviceType: device.deviceType,
      ownerName: device.ownerName
    });
    this.showDeviceForm = true;
  }

  deleteDevice(deviceId: number) {
    if (confirm('Are you sure you want to delete this device?')) {
      this.deviceService.deleteDevice(this.gameId, deviceId).subscribe({
        next: () => this.loadDevices(),
        error: (error) => console.error('Error deleting device:', error)
      });
    }
  }

  downloadQRCodePDF(device: DigitalDevice) {
    this.deviceService.downloadQRCodePDF(this.gameId, device.deviceId).subscribe({
      next: (blob) => {
        // Check if blob is actually a PDF or an error response
        if (blob.type === 'application/json' || blob.size < 100) {
          // Likely an error response, read it as text
          blob.text().then(text => {
            console.error('Error response:', text);
            try {
              const error = JSON.parse(text);
              alert(`Error: ${error.message || 'Unknown error'} `);
            } catch {
              alert('Error downloading QR code PDF. Please check console for details.');
            }
          });
          return;
        }

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `QR - ${device.deviceType} -${device.ownerName.replace(/\s+/g, '-')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading QR code PDF:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });

        let errorMessage = 'Error downloading QR code PDF. Please try again.';
        if (error.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (error.status === 403) {
          errorMessage = 'You do not have permission to access this device.';
        } else if (error.status === 404) {
          errorMessage = 'Device not found.';
        } else if (error.status === 500) {
          errorMessage = 'Server error. Please check console for details.';
        }

        alert(errorMessage);
      }
    });
  }

  cancelDeviceForm() {
    this.showDeviceForm = false;
    this.editingDevice = null;
    this.deviceForm.reset({ deviceType: 'iPhone' });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  getDeviceIcon(deviceType: string): string {
    const icons: any = {
      'iPhone': '📱',
      'Android': '📱',
      'Laptop': '💻'
    };
    return icons[deviceType] || '📱';
  }

  configureDeviceApps(device: DigitalDevice) {
    this.configuringDevice = device;
    this.activeAppTab = 'messages';
    this.loadDeviceApps(device.deviceId);
  }

  configureDeviceAppsOnTab(device: DigitalDevice, tab: string) {
    this.configuringDevice = device;
    this.activeAppTab = tab;
    this.loadDeviceApps(device.deviceId);
  }

  loadDeviceApps(deviceId: number) {
    this.messagesData = [];
    this.photosData = [];
    this.emailsData = [];
    this.notesData = [];
    this.filesData = [];
    this.callsData = [];

    this.deviceService.getDeviceApps(this.gameId, deviceId).subscribe({
      next: (apps) => {
        apps.forEach((app: any) => {
          if (app.appType === 'Messages') {
            const convs = app.appData?.conversations ?? app.appData?.Conversations ?? [];
            this.messagesData = convs.map((c: any) => ({
              contact: c.contact ?? c.Contact ?? '',
              avatar: c.avatar ?? c.Avatar ?? '👤',
              lastMessage: c.lastMessage ?? c.LastMessage ?? '',
              time: c.time ?? c.Time ?? '',
              messages: (c.messages ?? c.Messages ?? []).map((m: any) => ({
                sender: m.sender ?? m.Sender ?? '',
                content: m.content ?? m.Content ?? '',
                timestamp: m.timestamp ?? m.Timestamp ?? '',
                isOutgoing: m.isOutgoing ?? m.IsOutgoing ?? false
              }))
            }));
          } else if (app.appType === 'Photos') {
            const list = app.appData?.photos ?? app.appData?.Photos ?? [];
            this.photosData = list.map((p: any) => ({ url: p.url ?? p.Url ?? '', caption: p.caption ?? p.Caption ?? '' }));
          } else if (app.appType === 'Email') {
            const list = [
              ...(app.appData?.emails ?? app.appData?.Emails ?? []),
              ...(app.appData?.inbox ?? app.appData?.Inbox ?? []),
              ...(app.appData?.sent ?? app.appData?.Sent ?? []),
              ...(app.appData?.drafts ?? app.appData?.Drafts ?? [])
            ];
            this.emailsData = list.map((e: any) => ({ from: e.from ?? e.From ?? '', subject: e.subject ?? e.Subject ?? '', preview: e.preview ?? e.Preview ?? '', time: e.time ?? e.Time ?? '' }));
          } else if (app.appType === 'Notes') {
            const list = app.appData?.notes ?? app.appData?.Notes ?? [];
            this.notesData = list.map((n: any) => ({ title: n.title ?? n.Title ?? '', content: n.content ?? n.Content ?? '', time: n.time ?? n.Time ?? '' }));
          } else if (app.appType === 'Files') {
            const list = app.appData?.items ?? app.appData?.Items ?? [];
            this.filesData = list.map((f: any) => {
              const rows = f.rows ?? f.Rows ?? [];
              return {
                name: f.name ?? f.Name ?? '',
                type: f.type ?? f.Type ?? 'Document',
                description: f.description ?? f.Description ?? '',
                fileFormat: f.fileFormat ?? f.FileFormat ?? '',
                modifiedAt: f.modifiedAt ?? f.ModifiedAt ?? '',
                size: f.size ?? f.Size ?? '',
                content: f.content ?? f.Content ?? '',
                rowsJson: rows && rows.length ? JSON.stringify(rows, null, 2) : ''
              };
            });
          } else if (app.appType === 'Calls' || app.appType === 'Phone') {
            const list = app.appData?.calls ?? app.appData?.Calls ?? [];
            this.callsData = list.map((c: any) => ({
              type: c.type ?? c.Type ?? 'Primit',
              contact: c.contact ?? c.Contact ?? '',
              date: c.date ?? c.Date ?? '',
              time: c.time ?? c.Time ?? '',
              duration: c.duration ?? c.Duration ?? '',
              audioUrl: c.audioUrl ?? c.AudioUrl ?? '',
              audioFileName: c.audioFileName ?? c.AudioFileName ?? ''
            }));
          }
        });
      },
      error: () => {
        this.messagesData = [];
        this.photosData = [];
        this.emailsData = [];
        this.notesData = [];
        this.filesData = [];
        this.callsData = [];
      }
    });
  }

  // Messages methods
  addConversation() {
    this.messagesData.push({
      contact: '',
      avatar: '👤',
      lastMessage: '',
      time: '',
      messages: []
    });
  }

  removeConversation(index: number) {
    this.messagesData.splice(index, 1);
  }

  addMessage(convIndex: number) {
    this.messagesData[convIndex].messages.push({
      sender: '',
      content: '',
      timestamp: '',
      isOutgoing: false
    });
  }

  removeMessage(convIndex: number, msgIndex: number) {
    this.messagesData[convIndex].messages.splice(msgIndex, 1);
  }

  // Photos methods
  addPhoto() {
    this.photosData.push({ url: '', caption: '' });
  }

  removePhoto(index: number) {
    this.photosData.splice(index, 1);
  }

  // Email methods
  addEmail() {
    this.emailsData.push({ from: '', subject: '', preview: '', time: '' });
  }

  removeEmail(index: number) {
    this.emailsData.splice(index, 1);
  }

  // Notes methods
  addNote() {
    this.notesData.push({ title: '', content: '', time: '' });
  }

  removeNote(index: number) {
    this.notesData.splice(index, 1);
  }

  // Files methods
  addFile() {
    this.filesData.push({
      name: '',
      type: 'Document',
      description: '',
      fileFormat: '',
      modifiedAt: '',
      size: '',
      content: '',
      rowsJson: ''
    });
  }

  removeFile(index: number) {
    this.filesData.splice(index, 1);
  }

  // Calls methods
  addCall() {
    this.callsData.push({ type: 'Primit', contact: '', date: '', time: '', duration: '', audioUrl: '', audioFileName: '' });
  }

  removeCall(index: number) {
    this.callsData.splice(index, 1);
  }

  onCallAudioSelected(callIndex: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.callsData[callIndex].audioUrl = String(reader.result || '');
      this.callsData[callIndex].audioFileName = file.name;
    };
    reader.readAsDataURL(file);
  }

  /** Smart upload from card — auto-matches the mp3 to the correct call by filename */
  onCardCallAudioUpload(device: any, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) return;

      // Load all calls for this device, find the matching call and update it
      this.deviceService.getDeviceApps(this.gameId, device.deviceId).subscribe({
        next: (apps: any[]) => {
          const callsApp = apps.find(a => a.appType === 'Calls' || a.appType === 'Phone');
          if (!callsApp) {
            alert('Niciun apel configurat pe acest dispozitiv. Adauga mai intai apeluri prin „Administreaza apeluri & audio".');
            return;
          }

          const calls = [...(callsApp.appData?.calls ?? callsApp.appData?.Calls ?? [])];

          // Priority 1: exact audioFileName match
          let matchIdx = calls.findIndex((c: any) => {
            const af = String(c.audioFileName ?? c.AudioFileName ?? '').toLowerCase().replace(/\.[^/.]+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            return af === nameWithoutExt;
          });

          // Priority 2: contact name match (e.g. file "Sorina.MP3" → contact "Sorina Cioaca")
          if (matchIdx < 0) {
            matchIdx = calls.findIndex((c: any) => {
              const contact = String(c.contact ?? c.Contact ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
              return contact.startsWith(nameWithoutExt) || nameWithoutExt.startsWith(contact.split(' ')[0]);
            });
          }

          if (matchIdx < 0) {
            const contacts = calls.map((c: any, i: number) => `${i + 1}. ${c.contact ?? c.Contact ?? 'Unknown'}`).join('\n');
            alert(`Nu am putut potrivi automat fisierul "${file.name}" cu niciun apel.\n\nApeluri disponibile:\n${contacts}\n\nDeschide „Administreaza apeluri & audio" si ataseaza manual.`);
            return;
          }

          calls[matchIdx] = { ...calls[matchIdx], audioUrl: dataUrl, audioFileName: file.name };

          this.deviceService.updateDeviceApp(this.gameId, device.deviceId, callsApp.appId, { appData: { calls } }).subscribe({
            next: () => {
              const contact = calls[matchIdx].contact ?? calls[matchIdx].Contact ?? '';
              alert(`✅ Audio "${file.name}" atasat cu succes apelului cu ${contact}!`);
              input.value = '';
            },
            error: () => alert('Nu am putut salva fisierul audio.')
          });
        },
        error: () => alert('Nu am putut incarca datele aplicatiilor.')
      });
    };
    reader.readAsDataURL(file);
  }


  cancelAppConfig() {
    this.configuringDevice = null;
    this.messagesData = [];
    this.photosData = [];
    this.emailsData = [];
    this.notesData = [];
    this.filesData = [];
    this.callsData = [];
  }

  saveAppConfig() {
    if (!this.configuringDevice) return;
    const deviceId = this.configuringDevice.deviceId;

    if (this.messagesData.length > 0) {
      this.messagesData.forEach(conv => {
        if (conv.messages.length > 0) {
          const lastMsg = conv.messages[conv.messages.length - 1];
          conv.lastMessage = lastMsg.content;
          conv.time = lastMsg.timestamp;
        }
      });
      this.deviceService.createDeviceApp(this.gameId, deviceId, { appType: 'Messages', appData: { conversations: this.messagesData } }).subscribe({ next: () => console.log('Messages saved'), error: (e) => console.error(e) });
    }
    if (this.photosData.length > 0) {
      this.deviceService.createDeviceApp(this.gameId, deviceId, { appType: 'Photos', appData: { photos: this.photosData } }).subscribe({ next: () => console.log('Photos saved'), error: (e) => console.error(e) });
    }
    if (this.emailsData.length > 0) {
      this.deviceService.createDeviceApp(this.gameId, deviceId, { appType: 'Email', appData: { emails: this.emailsData } }).subscribe({ next: () => console.log('Email saved'), error: (e) => console.error(e) });
    }
    if (this.notesData.length > 0) {
      this.deviceService.createDeviceApp(this.gameId, deviceId, { appType: 'Notes', appData: { notes: this.notesData } }).subscribe({ next: () => console.log('Notes saved'), error: (e) => console.error(e) });
    }
    if (this.filesData.length > 0) {
      const items = this.filesData.map(f => {
        let rows: any[] = [];
        if (f.rowsJson && String(f.rowsJson).trim()) {
          try {
            const parsed = JSON.parse(f.rowsJson);
            rows = Array.isArray(parsed) ? parsed : [];
          } catch {
            rows = [];
          }
        }
        return {
          name: f.name,
          type: f.type,
          description: f.description,
          fileFormat: f.fileFormat,
          modifiedAt: f.modifiedAt,
          size: f.size,
          content: f.content,
          rows
        };
      });
      this.deviceService.createDeviceApp(this.gameId, deviceId, { appType: 'Files', appData: { items } }).subscribe({ next: () => console.log('Files saved'), error: (e) => console.error(e) });
    }
    if (this.callsData.length > 0) {
      this.deviceService.createDeviceApp(this.gameId, deviceId, { appType: 'Calls', appData: { calls: this.callsData } }).subscribe({ next: () => console.log('Calls saved'), error: (e) => console.error(e) });
    }

    alert('Configurarea a fost salvata! Deschide dispozitivul pentru a vedea modificarile.');
    this.cancelAppConfig();
  }
}
