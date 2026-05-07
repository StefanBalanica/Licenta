import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BaseDeviceComponent } from '../base-device.component';
import { DeviceService } from '../../../services/device.service';
import { FileItem } from '../../../models/device.models';

@Component({
    selector: 'app-laptop-device',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './laptop-device.component.html',
    styleUrls: ['./laptop-device.component.scss']
})
export class LaptopDeviceComponent extends BaseDeviceComponent implements OnInit, OnDestroy {
    constructor(
        protected override route: ActivatedRoute,
        protected override deviceService: DeviceService,
        protected override location: Location
    ) {
        super(route, deviceService, location);
    }

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

    get selectedFileExtension(): string {
        const explicit = (this.selectedFile?.fileFormat ?? '').trim().toLowerCase();
        if (explicit) return explicit;
        const fileName = this.selectedFile?.name ?? '';
        const dotIndex = fileName.lastIndexOf('.');
        return dotIndex > -1 ? fileName.substring(dotIndex + 1).toLowerCase() : '';
    }

    get selectedSpreadsheetColumns(): string[] {
        const firstRow = this.selectedFile?.rows?.[0];
        return firstRow ? Object.keys(firstRow) : [];
    }

    get filePreviewTitle(): string {
        const fileName = this.selectedFile?.name ?? 'Preview';
        const ext = this.selectedFileExtension;
        if (!ext) return fileName;
        return `${fileName} (${ext.toUpperCase()})`;
    }

    isFileType(file: FileItem, extensions: string[]): boolean {
        const ext = (file.fileFormat ?? '').trim().toLowerCase() || this.extractExtension(file.name);
        return extensions.includes(ext);
    }

    getFileIcon(file: FileItem): string {
        if (this.isFileType(file, ['doc', 'docx', 'txt'])) return '📘';
        if (this.isFileType(file, ['pdf'])) return '📕';
        if (this.isFileType(file, ['xls', 'xlsx', 'csv'])) return '📗';
        if (file.type === 'Folder') return '📁';
        if (file.type === 'Image' || file.type === 'Screenshot') return '🖼';
        if (file.type === 'Encrypted') return '🔒';
        return '📄';
    }

    private extractExtension(fileName: string): string {
        const dotIndex = fileName.lastIndexOf('.');
        return dotIndex > -1 ? fileName.substring(dotIndex + 1).toLowerCase() : '';
    }
}
