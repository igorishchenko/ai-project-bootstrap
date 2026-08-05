### Overview

NestJS is a structured TypeScript server framework: modules, dependency
injection, decorators. It trades some ceremony for consistency, which pays off
once several people are working on the same API.

Two things it does *not* do by default, both of which surprise people:

- **Request bodies are not validated** unless you enable the validation pipe.
  Without it, a DTO class is documentation, not enforcement.
- **Nothing is authenticated** unless a guard says so.

Neither failure is loud. The endpoint just accepts whatever it is sent.

### Install

```bash
npm install @nestjs/core @nestjs/common @nestjs/platform-express reflect-metadata rxjs
npm install class-validator class-transformer
npm install -D @nestjs/cli @nestjs/testing
```

### Enable validation globally

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,           // strip properties not on the DTO
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

`whitelist` matters more than it looks: without it, extra properties in the body
pass straight through to your service. That is how a request adds `role: "admin"`
to a profile update.

### DTOs carry the rules

```ts
export class CreateUserDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(2) displayName!: string;
}
```

An interface cannot validate — it does not exist at runtime. DTOs must be
classes with decorators.

### Modules and injection

```ts
@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

Controllers stay thin: parse, delegate, return. Business logic lives in
providers, which is what makes it testable without HTTP.

### Guards for auth

```ts
@UseGuards(JwtAuthGuard)
@Get('me')
me(@CurrentUser() user: User) { … }
```

Apply globally and opt out deliberately with a `@Public()` decorator, rather
than remembering to add a guard to each new route. The default should be closed.

### Configuration

```ts
ConfigModule.forRoot({ validationSchema, isGlobal: true });
```

Validate the schema at boot so a missing variable stops startup instead of
failing on the first request that needs it.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Invalid bodies accepted | `ValidationPipe` not registered globally |
| Extra fields reach the service | `whitelist: true` missing |
| "Nest can't resolve dependencies" | Provider not exported, or the module not imported |
| Decorators error at build | `emitDecoratorMetadata` and `experimentalDecorators` off |
| Endpoint open in production | No guard, or a global guard bypassed by a stray `@Public()` |

### Common mistakes

- **Interfaces as DTOs.** They vanish at runtime; nothing is validated.
- **No `whitelist`.** Unknown properties flow through to your logic.
- **Business logic in controllers.** Untestable without spinning up HTTP.
- **Auth per-route instead of global.** The one you forget is the breach.
- **Circular imports between modules.** Use `forwardRef` sparingly, or redesign.

### Production checklist

- [ ] `ValidationPipe` global, with `whitelist` and `forbidNonWhitelisted`.
- [ ] Auth guard applied globally; public routes opted out explicitly.
- [ ] Config validated at startup.
- [ ] Helmet and CORS configured for known origins.
- [ ] Rate limiting on authentication and mutation endpoints.
- [ ] Errors mapped to safe responses — no stack traces to clients.
- [ ] Structured logging with no secrets or personal data.

### Documentation

- [NestJS](https://docs.nestjs.com/)
- [Validation](https://docs.nestjs.com/techniques/validation)
- [Guards](https://docs.nestjs.com/guards)
- [Configuration](https://docs.nestjs.com/techniques/configuration)
