import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BaseDeviceComponent } from '../base-device.component';
import { DeviceService } from '../../../services/device.service';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-android-device',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './android-device.component.html',
    styleUrls: ['./android-device.component.scss']
})
export class AndroidDeviceComponent extends BaseDeviceComponent {
    constructor(
        protected override route: ActivatedRoute,
        protected override deviceService: DeviceService,
        protected override location: Location,
        protected override authService: AuthService
    ) {
        super(route, deviceService, location, authService);
    }
}
