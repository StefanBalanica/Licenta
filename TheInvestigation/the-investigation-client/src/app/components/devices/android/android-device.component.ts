import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseDeviceComponent } from '../base-device.component';

@Component({
    selector: 'app-android-device',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './android-device.component.html',
    styleUrls: ['./android-device.component.scss']
})
export class AndroidDeviceComponent extends BaseDeviceComponent {
    // Android-specific logic can be added here if needed
}
