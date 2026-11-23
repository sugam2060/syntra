export interface RedisConfig {
  host: string;
  port: number;
  /** Redis logical database; lets a second instance use its own queues on the same server. */
  db: number;
}
