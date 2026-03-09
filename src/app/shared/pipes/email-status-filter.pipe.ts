import { Pipe, PipeTransform } from '@angular/core';
import { EmailWithStatus } from '../../core/models/account.model';

@Pipe({
  name: 'filter',
  standalone: true
})
export class EmailStatusFilterPipe implements PipeTransform {
  transform(emails: EmailWithStatus[] | undefined, status: 'APPROVED' | 'REJECTED' | 'PENDING'): EmailWithStatus[] {
    if (!emails) {
      return [];
    }
    return emails.filter(email => email.status === status);
  }
}
