import { Point, WriteApi } from '@influxdata/influxdb-client'
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'
import { METRICS_MEASUREMENT_NAMES } from '../../constants/analytics'
import { monitorEventLoopDelay } from 'node:perf_hooks'
import { readdirSync, readFileSync } from 'node:fs'

function reportEventloopLag(startTime: [number, number], point: Point, writeApi: WriteApi) {
  const delta = process.hrtime(startTime)
  const nanosec = delta[0] * 1e9 + delta[1]

  point.floatField('value', nanosec)
  writeApi.writePoint(point)
}

// Logs Process logs, including Bot's info etc
export class MetricLogging extends ScheduledTask {
  public constructor(context: ScheduledTask.Context, options: ScheduledTask.Options) {
    super(context, {
      ...options,
      name: 'metricLogging',
      interval: 1000 * 30 // Every 30 seconds
    })
  }

  public async run() {
    try {
      this.container.logger.debug('[CRON] Logging process info to Influx')

      // Calculating event loop lag
      // Adapted from https://github.com/siimon/prom-client/blob/98b7ad819978436b19a994bb5c9f7bcf7576578a/lib/metrics/eventLoopLag.js
      const h = monitorEventLoopDelay({ resolution: 20 })
      h.enable()

      const eventLoopLagPoint = new Point(METRICS_MEASUREMENT_NAMES.PROCESS_EVENT_LOOP_LAG)

      const start = process.hrtime()
      setImmediate(reportEventloopLag, start, eventLoopLagPoint, this.container.analytics.metrics)
      h.reset()

      const processLimits = readFileSync('/proc/self/limits', 'utf-8')
      const processLimitsLines = processLimits.split('\n')

      // File Descriptors
      const currentOpenFd = readdirSync('/proc/self/fd').length - 1
      const maxFdString = processLimitsLines.filter((l) => l.startsWith('Max open files'))[0]
      const maxFd = Number(maxFdString.split(/ +/).reverse()[2])

      // Memory
      const mem = process.memoryUsage()

      this.container.analytics.metrics.writePoints([
        new Point(METRICS_MEASUREMENT_NAMES.MEMORY)
          .intField('total', mem.heapTotal)
          .intField('used', mem.heapUsed)
          .intField('rss', mem.rss)
          .intField('external', mem.external),
        new Point(METRICS_MEASUREMENT_NAMES.PROCESS_FILE_DESCRIPTORS)
          .intField('current', currentOpenFd)
          .intField('max', maxFd),
        new Point(METRICS_MEASUREMENT_NAMES.LATENCY)
          .floatField('current', this.container.client.ws.ping)
          .stringField('gateway', this.container.client.ws.gateway)
      ])
    } catch (e) {
      this.container.logger.error(e)
    }
  }
}

declare module '@sapphire/plugin-scheduled-tasks' {
  interface ScheduledTasks {
    VoiceChatExpReset: never
  }
}
