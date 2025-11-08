import { apiError } from '@/lib/apiResponse';
import { z, ZodSchema } from 'zod';
import { getUserFromAuthHeader } from './serverVerifyAuth';

export type HandlerContext<TBody = unknown, TQuery = unknown, TParams = unknown> = {
  body?: TBody;
  query?: TQuery;
  params?: TParams;
  user?: any;
};

export type WithHandlerOptions<TBody, TQuery, TParams> = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  bodySchema?: ZodSchema<TBody>;
  querySchema?: ZodSchema<TQuery>;
  paramsSchema?: ZodSchema<TParams>;
  authRequired?: boolean;
  // Customize error message/status for validation failures
  validationErrorStatus?: number;
  validationMessage?: string;
};

export function withHandler<TBody = unknown, TQuery = unknown, TParams = unknown>(opts: WithHandlerOptions<TBody, TQuery, TParams>) {
  return function <T extends HandlerContext<TBody, TQuery, TParams>>(
    fn: (req: Request, ctx?: T) => Promise<Response>
  ) {
    return async function handler(req: Request, context?: any): Promise<Response> {
      if (opts.method && req.method !== opts.method) {
        return apiError('Method Not Allowed', 405, undefined, { headers: { 'Allow': opts.method } });
      }

      try {
        let parsedBody: TBody | undefined = undefined;
        let parsedQuery: TQuery | undefined = undefined;
        let parsedParams: TParams | undefined = undefined;
        let user: any = undefined;

        if (opts.authRequired) {
          user = await getUserFromAuthHeader(req);
          if (!user) {
            return apiError('Unauthorized', 401);
          }
        }

        if (opts.bodySchema) {
          let json: unknown = null;
          try { json = await req.json(); } catch { json = null; }
          const result = opts.bodySchema.safeParse(json);
          if (!result.success) {
            return apiError(
              opts.validationMessage || 'Invalid input',
              opts.validationErrorStatus || 400,
              { issues: result.error.issues }
            );
          }
          parsedBody = result.data;
        }

        if (opts.querySchema) {
          const searchObj = Object.fromEntries(new URL(req.url).searchParams.entries());
          const result = opts.querySchema.safeParse(searchObj);
          if (!result.success) {
            return apiError(
              opts.validationMessage || 'Invalid query',
              opts.validationErrorStatus || 400,
              { issues: result.error.issues }
            );
          }
          parsedQuery = result.data as any;
        }

        if (opts.paramsSchema) {
          const params = context?.params && typeof context.params.then === 'function' ? await context.params : context?.params;
          const result = opts.paramsSchema.safeParse(params);
          if (!result.success) {
            return apiError(
              opts.validationMessage || 'Invalid params',
              opts.validationErrorStatus || 400,
              { issues: result.error.issues }
            );
          }
          parsedParams = result.data;
        }

        const ctx: HandlerContext<TBody, TQuery, TParams> = { ...(context || {}), body: parsedBody, query: parsedQuery, params: parsedParams, user };
        return await fn(req, ctx as any);
      } catch (e: any) {
        return apiError(e?.message || String(e), 500);
      }
    };
  };
}
