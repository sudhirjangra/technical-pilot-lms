import { Public } from '@/common/decorators';
import { Controller, Get, Inject } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorResult,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

/**
 * Controller for health checks of various system components.
 *
 * Provides endpoints to check the health of the database, external HTTP service, disk storage, and memory usage.
 */
@Controller('health')
export class HealthController {
  /**
   * Creates an instance of HealthController.
   *
   * @param health - Service to perform health checks.
   * @param memory - Memory usage health indicator.
   * @param supabaseHealth - Supabase connectivity status.
   */
  constructor(
    private health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    @Inject('SUPABASE_HEALTH_CHECK')
    private readonly supabaseHealth: Promise<{
      healthy: boolean;
      error?: string;
    }>,
  ) {}

  /**
   * Checks the overall health of core services (Supabase & Memory).
   *
   * @returns The result of the health check.
   */
  @Public()
  @Get()
  @HealthCheck()
  async check() {
    const result = await this.supabaseHealth;
    return this.health.check([
      () => {
        const indicator: HealthIndicatorResult = {
          supabase: result.healthy
            ? { status: 'up' }
            : { status: 'down', error: result.error },
        };
        if (!result.healthy) {
          throw new Error(result.error ?? 'Supabase connection failed');
        }
        return indicator;
      },
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
    ]);
  }

  /**
   * Checks the heap memory usage.
   *
   * @returns The result of the memory heap health check.
   */
  @Public()
  @Get('memory')
  @HealthCheck()
  checkMemory() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
    ]);
  }

  /**
   * Checks the Supabase connectivity.
   *
   * @returns The result of the Supabase health check.
   */
  @Public()
  @Get('supabase')
  @HealthCheck()
  async checkSupabase() {
    const result = await this.supabaseHealth;
    return this.health.check([
      () => {
        const indicator: HealthIndicatorResult = {
          supabase: result.healthy
            ? { status: 'up' }
            : { status: 'down', error: result.error },
        };
        if (!result.healthy) {
          throw new Error(result.error ?? 'Supabase connection failed');
        }
        return indicator;
      },
    ]);
  }
}
