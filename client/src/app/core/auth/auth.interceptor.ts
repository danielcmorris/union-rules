import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Attach credentials to requests going to our servers or relative API calls
  const isMainServer = req.url.startsWith(environment.server);
  const isChatServer = environment.chatServer && req.url.startsWith(environment.chatServer);
  const isRelativeApi = req.url.startsWith('/api/');

  if (!isMainServer && !isChatServer && !isRelativeApi) {
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
