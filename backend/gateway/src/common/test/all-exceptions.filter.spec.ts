import { BadRequestException, type ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from '../filters/all-exceptions.filter';

function run(exception: unknown) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return { status: status.mock.calls[0][0] as number, body: json.mock.calls[0][0] };
}

describe('AllExceptionsFilter', () => {
  it('passes HttpExceptions through with their message', () => {
    const { status, body } = run(new BadRequestException(['email must be an email']));
    expect(status).toBe(400);
    expect(body.message).toEqual(['email must be an email']);
  });

  it('maps a Postgres unique violation to 409, including when wrapped by Drizzle', () => {
    expect(run({ code: '23505' }).status).toBe(409);
    expect(run(Object.assign(new Error('query failed'), { cause: { code: '23505' } })).status).toBe(409);
  });

  it('maps an insufficient-privilege error to 403', () => {
    expect(run({ code: '42501' }).status).toBe(403);
  });

  it('hides internal error details behind a generic 500', () => {
    const { status, body } = run(new Error('relation "users" does not exist'));
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('relation');
  });
});
