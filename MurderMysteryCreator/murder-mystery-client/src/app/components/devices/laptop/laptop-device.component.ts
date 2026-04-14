import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseDeviceComponent } from '../base-device.component';

@Component({
    selector: 'app-laptop-device',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './laptop-device.component.html',
    styleUrls: ['./laptop-device.component.scss']
})
export class LaptopDeviceComponent extends BaseDeviceComponent implements OnInit, OnDestroy {

    // ── Live clock ──────────────────────────────────────────────────────────
    currentTime = '';
    currentDate = '';
    private _clockInterval?: ReturnType<typeof setInterval>;

    override ngOnInit() {
        super.ngOnInit();
        this._updateClock();
        this._clockInterval = setInterval(() => this._updateClock(), 10_000);
    }

    override ngOnDestroy() {
        clearInterval(this._clockInterval);
        super.ngOnDestroy();
    }

    private _updateClock() {
        const now = new Date();
        this.currentTime = now.toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', hour12: true
        });
        this.currentDate = now.toLocaleDateString('en-US', {
            month: 'numeric', day: 'numeric', year: 'numeric'
        });
    }

    // ── Keyboard layout ─────────────────────────────────────────────────────
    readonly fnKeys = ['Esc', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'Del'];
    readonly numRow = ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
    readonly qwertyRow = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'];
    readonly asdfRow = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'"];
    readonly zxcvRow = ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/'];
}
