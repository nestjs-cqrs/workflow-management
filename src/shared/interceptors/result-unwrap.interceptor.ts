import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Result } from '@turkelk/nestjs-cqrs-kernel';

@Injectable()
export class ResultUnwrapInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (data instanceof Result && data.isSuccess) {
          return data.value;
        }
        return data;
      }),
    );
  }
}
