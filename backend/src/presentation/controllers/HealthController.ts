import { Request, Response } from 'express';

export class HealthController {
  static check(req: Request, res: Response): void {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }
}

