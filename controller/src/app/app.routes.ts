import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { JoinComponent } from './features/join/join.component';
import { RoomComponent } from './features/room/room.component';

export const routes: Routes = [
  { path: '', component: JoinComponent },
  { path: 'join/:roomId', component: JoinComponent },
  { path: 'room/:roomId', component: RoomComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'dashboard/:roomId', component: DashboardComponent },
  { path: '**', redirectTo: '' }
];
