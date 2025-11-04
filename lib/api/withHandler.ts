import { apiError } from '@/lib/apiResponse';
import { z, ZodSchema } from 'zod';

export type HandlerContext<TBody = unknown, TQuery = unknown> = {
  body?: TBody;
  query?: TQuery;
  params?: any;
};

export type WithHandlerOptions<TBody, TQuery> = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  bodySchema?: ZodSchema<TBody>;
  querySchema?: ZodSchema<TQuery>;
  // Customize error message/status for validation failures
  validationErrorStatus?: number;
  validationMessage?: string;
};

export function withHandler<TBody = unknown, TQuery = unknown>(opts: WithHandlerOptions<TBody, TQuery>) {
  return function <T extends HandlerContext<TBody, TQuery>>(
    fn: (req: Request, ctx?: T) => Promise<Response>
  ) {
    return async function handler(req: Request, context?: any): Promise<Response> {
      if (opts.method && req.method !== opts.method) {
        return apiError('Method Not Allowed', 405, undefined, { headers: { 'Allow': opts.method } });
      }

      try {
        let parsedBody: TBody | undefined = undefined;
        let parsedQuery: TQuery | undefined = undefined;

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

        const ctx: HandlerContext<TBody, TQuery> = { ...(context || {}), body: parsedBody, query: parsedQuery };
        return await fn(req, ctx as any);
      } catch (e: any) {
        return apiError(e?.message || String(e), 500);
      }
    };
  };
}
