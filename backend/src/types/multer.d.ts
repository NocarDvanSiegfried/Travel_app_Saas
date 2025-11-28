import { Request } from 'express';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    export namespace Multer {
      export interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }

    export interface Request {
      file?: Express.Multer.File;
      files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
    }
  }
}

declare module 'multer' {
  import { RequestHandler } from 'express';

  export interface Options {
    dest?: string;
    storage?: any;
    fileFilter?: (req: Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => void;
    limits?: {
      fieldNameSize?: number;
      fieldSize?: number;
      fields?: number;
      fileSize?: number;
      files?: number;
      parts?: number;
      headerPairs?: number;
    };
    preservePath?: boolean;
  }

  export function diskStorage(options: {
    destination: string | ((req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => void);
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => void;
  }): any;

  export function memoryStorage(): any;

  export interface Multer extends RequestHandler {
    single(fieldName: string): RequestHandler;
    array(fieldName: string, maxCount?: number): RequestHandler;
    fields(fields: Array<{ name: string; maxCount?: number }>): RequestHandler;
    none(): RequestHandler;
    any(): RequestHandler;
  }

  function multer(options?: Options): Multer;
  export = multer;
}