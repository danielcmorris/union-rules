import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Only attach credentials to requests going to our server
  if (!req.url.startsWith(environment.server)) {
    return next(req);
  }

  const auth  = inject(AuthService);
  const token = auth.getIdToken();
  const sid   = auth.sid();

  let modifiedReq = req;

  if (token) {
    modifiedReq = modifiedReq.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  if (sid) {
    modifiedReq = modifiedReq.clone({
      params: modifiedReq.params.set('sid', sid)
    });
  }

  return next(modifiedReq);
};
